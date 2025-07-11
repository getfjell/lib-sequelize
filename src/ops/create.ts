/* eslint-disable indent */
import { ComKey, isComKey, isPriKey, Item, LocKeyArray, PriKey, validateKeys } from "@fjell/core";

import { Definition } from "@/Definition";
import LibLogger from '@/logger';
import { processRow } from "@/RowProcessor";
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { extractEvents, removeEvents } from "@/EventCoordinator";
import { buildRelationshipChain, buildRelationshipPath } from "@/util/relationshipUtils";

const logger = LibLogger.get('sequelize', 'ops', 'create');

// Helper function to validate hierarchical chain exists
async function validateHierarchicalChain(
  models: ModelStatic<any>[],
  locKey: { kt: string; lk: any },
  kta: string[]
): Promise<void> {
  // Find the direct parent model that contains this locator
  const locatorIndex = kta.indexOf(locKey.kt);
  if (locatorIndex === -1) {
    throw new Error(`Locator type '${locKey.kt}' not found in kta array`);
  }

  // Get the model for this locator
  const locatorModel = models[locatorIndex] || models[0]; // Fallback to primary model

  // Build a query to validate the chain exists
  const chainResult = buildRelationshipChain(locatorModel, kta, locatorIndex, kta.length - 1);

  if (!chainResult.success) {
    // If we can't build a chain, just validate the record exists
    const record = await locatorModel.findByPk(locKey.lk);
    if (!record) {
      throw new Error(`Referenced ${locKey.kt} with id ${locKey.lk} does not exist`);
    }
    return;
  }

  // Validate that the chain exists
  const queryOptions: any = {
    where: { id: locKey.lk }
  };

  if (chainResult.includes && chainResult.includes.length > 0) {
    queryOptions.include = chainResult.includes;
  }

  const record = await locatorModel.findOne(queryOptions);
  if (!record) {
    throw new Error(`Referenced ${locKey.kt} with id ${locKey.lk} does not exist or chain is invalid`);
  }
}

export const getCreateOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  models: ModelStatic<any>[],
  definition: Definition<V, S, L1, L2, L3, L4, L5>,

  registry: Library.Registry
) => {

  const create = async (
    item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    options?: {
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      locations?: never;
    } | {
      key?: never;
      locations: LocKeyArray<L1, L2, L3, L4, L5>,
    },
  ): Promise<V> => {
    logger.default('Create', { item, options });

    const { coordinate, options: { references, aggregations } } = definition;
    const { kta } = coordinate;

    // Get the primary model (first model in array)
    const model = models[0];
    const modelAttributes = model.getAttributes();

    // Validate that all item attributes exist on the model
    let itemData = { ...item } as any;

    // TODO: We need the opposite of processRow, something to step down from fjell to database.
    itemData = extractEvents(itemData);
    itemData = removeEvents(itemData);

    for (const key of Object.keys(itemData)) {
      if (!modelAttributes[key]) {
        throw new Error(`Attribute '${key}' does not exist on model ${model.name}`);
      }
    }

    // Handle key options
    // If a key is supplied, assume its contents are to be assigned to the appropriate ids.
    // For most cases this will be null as key generation is often through autoIncrement.
    // If this is a CItem then the locations will be present.
    if (options?.key) {
      const key = options.key;
      if (isPriKey(key)) {
        // Set the primary key
        itemData.id = key.pk;
      } else if (isComKey(key)) {
        // Set primary key
        itemData.id = key.pk;

        // Process location keys - only set direct foreign keys, validate hierarchical chains
        const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
        const directLocations: Array<{ kt: string; lk: any }> = [];
        const hierarchicalLocations: Array<{ kt: string; lk: any }> = [];

        // Categorize location keys as direct or hierarchical
        for (const locKey of comKey.loc) {
          const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta, true);

          if (!relationshipInfo.found) {
            const errorMessage = `Composite key locator '${locKey.kt}' cannot be resolved on model '${model.name}' or through its relationships.`;
            logger.error(errorMessage, { key: comKey, kta });
            throw new Error(errorMessage);
          }

          if (relationshipInfo.isDirect) {
            directLocations.push(locKey);
          } else {
            hierarchicalLocations.push(locKey);
          }
        }

        // Set direct foreign keys
        for (const locKey of directLocations) {
          const foreignKeyField = locKey.kt + 'Id';
          itemData[foreignKeyField] = locKey.lk;
        }

        // Validate hierarchical chains exist
        for (const locKey of hierarchicalLocations) {
          await validateHierarchicalChain(models, locKey, kta);
        }
      }
    }

    // Handle locations options
    // This is the most frequent way relationship ids will be set
    if (options?.locations) {
      const directLocations: Array<{ kt: string; lk: any }> = [];
      const hierarchicalLocations: Array<{ kt: string; lk: any }> = [];

      // Categorize location keys as direct or hierarchical
      for (const locKey of options.locations) {
        const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta, true);

        if (!relationshipInfo.found) {
          const errorMessage = `Location key '${locKey.kt}' cannot be resolved on model '${model.name}' or through its relationships.`;
          logger.error(errorMessage, { locations: options.locations, kta });
          throw new Error(errorMessage);
        }

        if (relationshipInfo.isDirect) {
          directLocations.push(locKey);
        } else {
          hierarchicalLocations.push(locKey);
        }
      }

      // Set direct foreign keys
      for (const locKey of directLocations) {
        const foreignKeyField = locKey.kt + 'Id';
        itemData[foreignKeyField] = locKey.lk;
      }

      // Validate hierarchical chains exist
      for (const locKey of hierarchicalLocations) {
        await validateHierarchicalChain(models, locKey, kta);
      }
    }

    // Create the record
    const createdRecord = await model.create(itemData);

    // Add key and events
    const processedRecord = await processRow(createdRecord, kta, references, aggregations, registry);
    return validateKeys(processedRecord, kta) as V;
  }

  return create;
}
