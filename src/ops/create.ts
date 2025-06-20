/* eslint-disable indent */
import { ComKey, isComKey, isPriKey, Item, LocKeyArray, PriKey, TypesProperties, validateKeys } from "@fjell/core";

import { Definition } from "@/Definition";
import LibLogger from '@/logger';
import { processRow } from "@/RowProcessor";
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";

const logger = LibLogger.get('sequelize', 'ops', 'create');

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
    item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
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
    const itemData = { ...item } as any;
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
        // Set primary key and location keys
        itemData.id = key.pk;

        // Add location foreign keys
        const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
        for (const locKey of comKey.loc) {
          const foreignKeyField = locKey.kt + 'Id';
          if (!modelAttributes[foreignKeyField]) {
            throw new Error(`Foreign key field '${foreignKeyField}' does not exist on model ${model.name}`);
          }
          itemData[foreignKeyField] = locKey.lk;
        }
      }
    }

    // Handle locations options
    // Handle locations options
    // This is the most frequent way relationship ids will be set
    if (options?.locations) {
      for (const locKey of options.locations) {
        const foreignKeyField = locKey.kt + 'Id';
        if (!modelAttributes[foreignKeyField]) {
          throw new Error(`Foreign key field '${foreignKeyField}' does not exist on model ${model.name}`);
        }
        itemData[foreignKeyField] = locKey.lk;
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