import { ReferenceDefinition } from "./Options";
import { PriKey } from "@fjell/core";
import * as Library from "@fjell/lib";
import { OperationContext } from "./OperationContext";
import LibLogger from "./logger";

const logger = LibLogger.get('sequelize', 'ReferenceBuilder');

export const buildReference = async (
  item: any,
  referenceDefinition: ReferenceDefinition,
  registry: Library.Registry,
  context?: OperationContext
) => {
  // For multikey references, we assume that the primary key of the first key type is unique
  // and can be used to retrieve the composite item with just a PriKey<S>
  const primaryKeyType = referenceDefinition.kta[0];

  if (referenceDefinition.kta.length > 1) {
    logger.default(
      'Using multikey reference with PriKey assumption',
      {
        kta: referenceDefinition.kta,
        primaryKeyType,
        property: referenceDefinition.property,
        column: referenceDefinition.column
      }
    );

    // TODO: Add validation to check if the target Sequelize model has a unique primary key
    // This would require access to the models array to inspect model.primaryKeyAttributes
    // For now, we assume that the primary key for the primary key type is unique
    logger.default(
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
      logger.default('Using cached reference', { priKey, property: referenceDefinition.property });
      referencedItem = context.getCached(priKey);
    }
    // Check if this item is currently being loaded (circular dependency)
    else if (context.isInProgress(priKey)) {
      logger.default('Circular dependency detected, creating reference placeholder', {
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
      } finally {
        // Always mark as complete, even if there was an error
        context.markComplete(priKey);
      }
    }
  } else {
    // Fallback to original behavior if no context provided
    referencedItem = await library!.operations.get(priKey);
  }

  // TODO: In a Fjell-compliant implementation, this value should be stored in the ref property
  // For now, we'll just populate the property directly
  // Store the result in the property on item
  item[referenceDefinition.property] = referencedItem;

  return item;
}
