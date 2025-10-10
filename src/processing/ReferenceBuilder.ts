import { Item, PriKey } from "@fjell/core";
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
  
  // For multikey references, we assume that the primary key of the first key type is unique
  // and can be used to retrieve the composite item with just a PriKey<S>
  const primaryKeyType = referenceDefinition.kta[0];

  if (referenceDefinition.kta.length > 1) {
    libLogger.debug(
      'Using multikey reference with PriKey assumption',
      {
        kta: referenceDefinition.kta,
        primaryKeyType,
        property: referenceDefinition.property,
        column: referenceDefinition.column
      }
    );

    // TODO: Add validation to check if the target model has a unique primary key
    libLogger.debug(
      'ASSUMPTION: The primary key for key type "%s" is unique and can be used to retrieve composite items',
      primaryKeyType
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

  // Create a PriKey using the column value from item
  // For multikey references, we use the primary key type (first in the kta array)
  const priKey: PriKey<string> = {
    kt: primaryKeyType,
    pk: columnValue
  };

  let referencedItem;

  if (context) {
    // Check if we already have this item cached
    if (context.isCached(priKey)) {
      libLogger.debug('Using cached reference', { priKey, property: referenceDefinition.property });
      referencedItem = context.getCached(priKey);
    }
    // Check if this item is currently being loaded (circular dependency)
    else if (context.isInProgress(priKey)) {
      libLogger.debug('Circular dependency detected, creating reference placeholder', {
        priKey,
        property: referenceDefinition.property
      });

      // Create a minimal reference object with just the key to break the cycle
      referencedItem = {
        key: priKey,
        // Add any other minimal properties that might be needed
        // This prevents infinite loops while still providing the key for identification
      };
    }
    else {
      // Mark this key as in progress before loading
      context.markInProgress(priKey);
      try {
        // Get the referenced item using the Library.Operations get method (context now managed internally)
        referencedItem = await library!.operations.get(priKey);

        // Cache the result
        context.setCached(priKey, referencedItem);
      } catch (error: any) {
        throw error; // Re-throw to maintain original behavior
      } finally {
        // Always mark as complete, even if there was an error
        context.markComplete(priKey);
      }
    }
  } else {
    // Fallback to original behavior if no context provided
    referencedItem = await library!.operations.get(priKey);
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

