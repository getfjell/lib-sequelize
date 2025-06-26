import { ReferenceDefinition } from "./Options";
import { PriKey } from "@fjell/core";
import * as Library from "@fjell/lib";
import { OperationContext } from "./OperationContext";
import LibLogger from "@/logger";

const logger = LibLogger.get('sequelize', 'ReferenceBuilder');

export const buildReference = async (
  item: any,
  referenceDefinition: ReferenceDefinition,
  registry: Library.Registry,
  context?: OperationContext
) => {
  // Check if there is more than one key type
  if (referenceDefinition.kta.length > 1) {
    throw new Error("The ReferenceBuilder doesn't work with more than one key type yet");
  }

  // Check if dependencies exist
  if (!registry) {
    throw new Error("This model definition has a reference definition, but the registry is not present");
  }

  // Find the Library.Instance for the key type
  const library: Library.Instance<any, any, any, any, any, any, any> | null = registry.get(referenceDefinition.kta);
  if (!library) {
    throw new Error("This model definition has a reference definition, but the dependency is not present");
  }

  // Check if the column value is null - if so, skip the reference
  const columnValue = item[referenceDefinition.column];
  if (columnValue == null) {
    item[referenceDefinition.property] = null;
    return item;
  }

  // Create a PriKey using the column value from item
  const priKey: PriKey<string> = {
    kt: referenceDefinition.kta[0],
    pk: columnValue
  };

  let referencedItem;

  if (context) {
    // Check if we already have this item cached
    if (context.isCached(priKey)) {
      logger.debug('Using cached reference', { priKey, property: referenceDefinition.property });
      referencedItem = context.getCached(priKey);
    }
    // Check if this item is currently being loaded (circular dependency)
    else if (context.isInProgress(priKey)) {
      logger.warning('Circular dependency detected, creating reference placeholder', {
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
