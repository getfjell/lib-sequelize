import { ComKey, Item, PriKey } from "@fjell/core";
import type { Registry } from "@fjell/lib";
import { OperationContext } from "@fjell/lib";
import logger from "../logger";

/**
 * Sequelize-specific definition for a reference relationship.
 * References in Sequelize are stored as foreign key columns (e.g., "authorId")
 * and populated into properties on the item.
 */
export interface SequelizeReferenceDefinition {
  /** Column name containing the foreign key value (e.g., "authorId") */
  column: string;
  /** Key type array of the referenced item */
  kta: string[];
  /** Property name to populate with the referenced item (e.g., "author") */
  property: string;
  /**
   * Optional: Column names for location keys when referencing composite items.
   * If provided, will construct a full ComKey with location context.
   * If omitted for composite items, uses empty loc array to search across all locations.
   *
   * Example: ['phaseId'] for a step reference where you have both stepId and phaseId columns
   */
  locationColumns?: string[];
}

/**
 * Build a reference by looking up a related item by its key from a column value.
 * The referenced item will be populated directly into a property on the item.
 *
 * @param item - The item to populate with reference data
 * @param referenceDefinition - Sequelize-specific definition of what to reference
 * @param registry - Registry to look up library instances
 * @param context - Optional operation context for caching and cycle detection
 * @returns The item with the reference property populated
 */
export const buildSequelizeReference = async (
  item: any,
  referenceDefinition: SequelizeReferenceDefinition,
  registry: Registry,
  context?: OperationContext
) => {
  const libLogger = logger.get('processing', 'ReferenceBuilder');
  
  // Check if this is a composite item reference (has location hierarchy)
  const isCompositeItem = referenceDefinition.kta.length > 1;
  const primaryKeyType = referenceDefinition.kta[0];

  if (isCompositeItem) {
    libLogger.debug(
      'Detected composite item reference - will use ComKey with empty loc array',
      {
        kta: referenceDefinition.kta,
        primaryKeyType,
        property: referenceDefinition.property,
        column: referenceDefinition.column
      }
    );
  }

  // Check if dependencies exist
  if (!registry) {
    throw new Error(
      `This model definition has a reference definition, but the registry is not present. ` +
      `Reference property: '${referenceDefinition.property}', ` +
      `key types: [${referenceDefinition.kta.join(', ')}], column: '${referenceDefinition.column}'`
    );
  }

  // Find the Library.Instance for the key type
  const library: any = registry.get(referenceDefinition.kta as any);
  if (!library) {
    throw new Error(
      `This model definition has a reference definition, but the dependency is not present in registry. ` +
      `Reference property: '${referenceDefinition.property}', ` +
      `missing key type: '${primaryKeyType}', column: '${referenceDefinition.column}'`
    );
  }

  // Check if the column value is null - if so, skip the reference
  const columnValue = item[referenceDefinition.column];
  if (columnValue == null) {
    item[referenceDefinition.property] = null;
    return item;
  }

  // Create the appropriate key type based on whether this is a composite item
  let itemKey: PriKey<string> | ComKey<string>;
  
  if (!isCompositeItem) {
    // Primary item: use PriKey
    itemKey = {
      kt: primaryKeyType,
      pk: columnValue
    };
  } else if (referenceDefinition.locationColumns && referenceDefinition.locationColumns.length > 0) {
    // Composite item with location columns provided: build full ComKey
    const locationTypes = referenceDefinition.kta.slice(1); // Skip primary key type
    const loc: Array<{kt: string, lk: any}> = [];
    let hasNullLocation = false;
    
    for (let i = 0; i < referenceDefinition.locationColumns.length; i++) {
      const columnName = referenceDefinition.locationColumns[i];
      const locValue = item[columnName];
      
      if (locValue == null) {
        libLogger.warning(
          `Location column '${columnName}' is null/undefined for reference '${referenceDefinition.property}'. ` +
          `Falling back to empty loc array search.`
        );
        // Fall back to empty loc array if any location column is missing
        hasNullLocation = true;
        break;
      }
      
      loc.push({
        kt: locationTypes[i],
        lk: locValue
      });
    }
    
    if (hasNullLocation) {
      // Fallback to empty loc array if any location column is missing
      itemKey = {
        kt: primaryKeyType,
        pk: columnValue,
        loc: []
      };
    } else {
      // Build full ComKey with location context
      itemKey = {
        kt: primaryKeyType,
        pk: columnValue,
        loc: loc as any
      };
      
      libLogger.debug('Built full ComKey with location context', {
        itemKey,
        locationColumns: referenceDefinition.locationColumns,
        property: referenceDefinition.property
      });
    }
  } else {
    // Composite item without location columns: use empty loc array
    // This signals "find this item by primary key across all location contexts"
    itemKey = {
      kt: primaryKeyType,
      pk: columnValue,
      loc: []
    };
    
    libLogger.debug('Using empty loc array for composite item reference', {
      kta: referenceDefinition.kta,
      property: referenceDefinition.property
    });
  }

  libLogger.debug('Created reference key', {
    itemKey,
    isCompositeItem,
    hasLocationColumns: !!referenceDefinition.locationColumns,
    property: referenceDefinition.property
  });

  let referencedItem;

  if (context) {
    // Check if we already have this item cached
    if (context.isCached(itemKey)) {
      libLogger.debug('Using cached reference', { itemKey, property: referenceDefinition.property });
      referencedItem = context.getCached(itemKey);
    }
    // Check if this item is currently being loaded (circular dependency)
    else if (context.isInProgress(itemKey)) {
      libLogger.debug('Circular dependency detected, creating reference placeholder', {
        itemKey,
        property: referenceDefinition.property
      });

      // Create a minimal reference object with just the key to break the cycle
      referencedItem = {
        key: itemKey,
        // Add any other minimal properties that might be needed
        // This prevents infinite loops while still providing the key for identification
      };
    }
    else {
      // Mark this key as in progress before loading
      context.markInProgress(itemKey);
      try {
        // Get the referenced item using the Library.Operations get method (context now managed internally)
        referencedItem = await library!.operations.get(itemKey);

        // Cache the result
        context.setCached(itemKey, referencedItem);
      } catch (error: any) {
        throw error; // Re-throw to maintain original behavior
      } finally {
        // Always mark as complete, even if there was an error
        context.markComplete(itemKey);
      }
    }
  } else {
    // Fallback to original behavior if no context provided
    referencedItem = await library!.operations.get(itemKey);
  }

  // Store the result in the property on item (Sequelize style - direct property)
  item[referenceDefinition.property] = referencedItem;

  return item;
};

/**
 * Strip populated reference properties from item before writing to database.
 * This ensures we only store the foreign key columns, not the full populated items.
 *
 * @param item - The item to strip references from
 * @param referenceDefinitions - Array of reference definitions to strip
 * @returns The item with only foreign key values (no populated items)
 */
export const stripSequelizeReferenceItems = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
    item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    referenceDefinitions: SequelizeReferenceDefinition[]
  ): Partial<Item<S, L1, L2, L3, L4, L5>> => {
  const result = { ...item };

  // Remove populated reference properties but keep the foreign key columns
  for (const refDef of referenceDefinitions) {
    // Delete the populated property (e.g., delete item.author)
    // Keep the foreign key column (e.g., keep item.authorId)
    delete result[refDef.property as keyof typeof result];
  }

  return result;
};

