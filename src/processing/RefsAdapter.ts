/**
 * RefsAdapter: Transparent wrapper for Sequelize items
 *
 * This module provides transparent conversion between Sequelize's foreign key column pattern
 * and Firestore's refs structure pattern. The wrapper is completely confined to the Sequelize
 * library - items are automatically wrapped when leaving the library and unwrapped when entering.
 *
 * Key Principles:
 * - Transparency: Users never need to think about wrapping/unwrapping
 * - Boundary Confinement: All complexity stays within @fjell/lib-sequelize
 * - Automatic: Wrapping happens on output, unwrapping happens on input
 * - Unified API: External code always sees refs structure, regardless of backend
 */

import { ComKey, isComKey, isPriKey, Item, PriKey } from "@fjell/core";
import { SequelizeReferenceDefinition } from "./ReferenceBuilder";
import logger from "../logger";

const libLogger = logger.get('sequelize', 'processing', 'RefsAdapter');

/**
 * Type for a reference structure matching Firestore's refs pattern
 */
export type ItemReference = {
  key: PriKey<any> | ComKey<any, any, any, any, any, any>;
  item?: Item<any, any, any, any, any, any>;
};

/**
 * Builds a key structure (PriKey or ComKey) from a foreign key value and reference definition.
 * This converts Sequelize's foreign key column pattern to Fjell's key structure.
 */
export function buildKeyFromForeignKey(
  refDef: SequelizeReferenceDefinition,
  foreignKeyValue: any,
  item: any
): PriKey<any> | ComKey<any, any, any, any, any, any> {
  const primaryKeyType = refDef.kta[0];
  const isCompositeItem = refDef.kta.length > 1;

  if (!isCompositeItem) {
    // Primary item reference: use PriKey
    return {
      kt: primaryKeyType,
      pk: foreignKeyValue
    };
  }

  // Composite item reference: build ComKey
  const loc: Array<{kt: string, lk: any}> = [];

  if (refDef.locationColumns && refDef.locationColumns.length > 0) {
    // Build full ComKey with location context
    for (let i = 0; i < refDef.locationColumns.length; i++) {
      const columnName = refDef.locationColumns[i];
      const locValue = item[columnName];

      if (locValue != null) {
        const locationType = refDef.kta[i + 1]; // Skip primary key type
        loc.push({
          kt: locationType,
          lk: locValue
        });
      } else {
        libLogger.debug(
          `Location column '${columnName}' is null/undefined for reference '${refDef.property}'. ` +
          `Using empty loc array.`
        );
        // If any location column is missing, use empty loc array
        break;
      }
    }
  }

  return {
    kt: primaryKeyType,
    pk: foreignKeyValue,
    loc: loc.length > 0 ? loc as any : []
  };
}

/**
 * Converts a Sequelize item to include a Firestore-style refs structure.
 * Foreign key columns are moved to refs[name].key, and populated references
 * are moved to refs[name].item.
 *
 * This is called automatically when items leave the Sequelize library (e.g., returned
 * from operations). The refs structure is added transparently - external code always
 * sees items with refs structure, regardless of the underlying storage pattern.
 *
 * @param item - The Sequelize item (plain object)
 * @param referenceDefinitions - Array of SequelizeReferenceDefinition configs
 * @returns The item with a refs structure added
 */
export function addRefsToSequelizeItem<T extends Item<any, any, any, any, any, any>>(
  item: T,
  referenceDefinitions: SequelizeReferenceDefinition[]
): T & { refs: Record<string, ItemReference> } {
  const refs: Record<string, ItemReference> = {};

  for (const refDef of referenceDefinitions) {
    const foreignKeyValue = item[refDef.column as keyof T];
    const refName = refDef.property;

    if (foreignKeyValue != null) {
      // Build key structure from foreign key
      const key = buildKeyFromForeignKey(refDef, foreignKeyValue, item);

      // Get populated reference if available
      const populatedItem = item[refDef.property as keyof T] as Item<any, any, any, any, any, any> | undefined;

      refs[refName] = {
        key,
        item: populatedItem
      };
    } else {
      // Foreign key is null/undefined - still create ref entry but with null key
      refs[refName] = {
        key: {
          kt: refDef.kta[0],
          pk: null as any // Will be handled as null reference
        }
      };
    }
  }

  return {
    ...item,
    refs
  } as T & { refs: Record<string, ItemReference> };
}

/**
 * Updates foreign key columns in a Sequelize item based on refs structure.
 * This is used when writing items that have been modified via the refs structure.
 *
 * @param item - The Sequelize item to update
 * @param refs - The refs structure containing updated reference keys
 * @param referenceDefinitions - Array of SequelizeReferenceDefinition configs
 */
export function updateForeignKeysFromRefs(
  item: any,
  refs: Record<string, ItemReference>,
  referenceDefinitions: SequelizeReferenceDefinition[]
): void {
  for (const refDef of referenceDefinitions) {
    const refName = refDef.property;
    const ref = refs[refName];

    if (ref && ref.key) {
      // Update foreign key column from refs[key].key
      if (isPriKey(ref.key)) {
        item[refDef.column] = ref.key.pk;
      } else if (isComKey(ref.key)) {
        item[refDef.column] = ref.key.pk;
        
        // Update location columns if provided
        if (refDef.locationColumns && ref.key.loc) {
          ref.key.loc.forEach((locItem: any, index: number) => {
            if (refDef.locationColumns && refDef.locationColumns[index]) {
              item[refDef.locationColumns[index]] = locItem.lk;
            }
          });
        }
      }

      // Update populated reference property if available
      if (ref.item) {
        item[refDef.property] = ref.item;
      }
    } else if (ref == null) {
      // Reference was explicitly set to null/undefined in refs - set foreign key to null
      // Only update if the ref was explicitly set (not if it's missing from refs object)
      if (refName in refs) {
        item[refDef.column] = null;
        // Clear populated reference property
        delete item[refDef.property];
      }
      // If ref is not in refs object at all, preserve original foreign key value
    }
  }
}

/**
 * Removes the refs structure from a Sequelize item, converting it back to
 * the standard Sequelize format with foreign key columns.
 *
 * This is called automatically when items enter the Sequelize library (e.g., passed
 * to create/update operations). The refs structure is removed transparently and
 * foreign key columns are updated from the refs structure if present.
 *
 * @param item - The item with refs structure
 * @param referenceDefinitions - Array of SequelizeReferenceDefinition configs
 * @returns The item without refs structure, with foreign keys updated from refs if present
 */
export function removeRefsFromSequelizeItem<T extends Item<any, any, any, any, any, any>>(
  item: T & { refs?: Record<string, ItemReference> },
  referenceDefinitions: SequelizeReferenceDefinition[]
): T {
  const result = { ...item } as any;

  // If item has refs structure, update foreign keys from it
  if (result.refs) {
    updateForeignKeysFromRefs(result, result.refs, referenceDefinitions);
    // Remove refs property
    delete result.refs;
  }
  // If no refs structure, preserve original foreign key values (no change needed)

  return result as T;
}

/**
 * Creates a Proxy wrapper around a Sequelize item that provides dynamic refs access.
 * This allows reading and writing refs structure while maintaining compatibility
 * with the underlying Sequelize item.
 *
 * @param item - The Sequelize item to wrap
 * @param referenceDefinitions - Array of SequelizeReferenceDefinition configs
 * @returns A proxied item with dynamic refs property
 */
export function createRefsProxy<T extends Item<any, any, any, any, any, any>>(
  item: T,
  referenceDefinitions: SequelizeReferenceDefinition[]
): T & { refs: Record<string, ItemReference> } {
  return new Proxy(item, {
    get(target, prop) {
      if (prop === 'refs') {
        // Rebuild refs structure dynamically to reflect current state
        return addRefsToSequelizeItem(target as T, referenceDefinitions).refs;
      }
      return (target as any)[prop];
    },
    set(target, prop, value) {
      if (prop === 'refs' && typeof value === 'object') {
        // Update foreign keys from refs structure
        updateForeignKeysFromRefs(target, value, referenceDefinitions);
        return true;
      }
      
      // Handle nested refs updates (e.g., item.refs.author.key = {...})
      // This is tricky with Proxy, so we'll rely on the getter rebuilding refs
      (target as any)[prop] = value;
      return true;
    },
    has(target, prop) {
      if (prop === 'refs') {
        return true;
      }
      return prop in target;
    },
    ownKeys(target) {
      return ['refs', ...Object.keys(target)];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === 'refs') {
        return {
          enumerable: true,
          configurable: true,
          value: addRefsToSequelizeItem(target as T, referenceDefinitions).refs
        };
      }
      return Object.getOwnPropertyDescriptor(target, prop);
    }
  }) as T & { refs: Record<string, ItemReference> };
}

