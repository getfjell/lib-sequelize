/* eslint-disable indent */
import { abbrevIK, isComKey, validateKeys } from "@fjell/core";

import { isPriKey } from "@fjell/core";

import { ComKey, Item, PriKey, TypesProperties } from "@fjell/core";

import { Definition } from "@/Definition";
import { extractEvents, removeEvents } from "@/EventCoordinator";
import { removeKey } from "@/KeyMaster";
import LibLogger from '@/logger';
import { processRow } from "@/RowProcessor";
import { stringifyJSON } from "@/util/general";
import * as Library from "@fjell/lib";
import { NotFoundError } from "@fjell/lib";
import { ModelStatic, Op } from "sequelize";
import { buildRelationshipPath } from "@/util/relationshipUtils";

const logger = LibLogger.get('sequelize', 'ops', 'update');

// Helper function to merge includes avoiding duplicates
const mergeIncludes = (existingIncludes: any[], newIncludes: any[]): any[] => {
  const mergedIncludes = [...existingIncludes];

  for (const newInclude of newIncludes) {
    const existingIndex = mergedIncludes.findIndex(
      (existing: any) => existing.as === newInclude.as && existing.model === newInclude.model
    );
    if (existingIndex === -1) {
      mergedIncludes.push(newInclude);
    } else if (newInclude.include && mergedIncludes[existingIndex].include) {
      mergedIncludes[existingIndex].include = [
        ...mergedIncludes[existingIndex].include,
        ...newInclude.include
      ];
    } else if (newInclude.include) {
      mergedIncludes[existingIndex].include = newInclude.include;
    }
  }

  return mergedIncludes;
};

export const getUpdateOperation = <
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

  const { options: { references, aggregations } } = definition;

  const update = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    const { coordinate } = definition;
    const { kta } = coordinate;

    logger.debug('update: %s, %j', abbrevIK(key), item);
    // Find the object we're updating
    // @ts-ignore
    const model = models[0];

    let response;

    if (isPriKey(key)) {
      // Find the model by using the PK
      const priKey = key as PriKey<S>;
      response = await model.findByPk(priKey.pk);
    } else if (isComKey(key)) {
      const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;

      // Build query options for composite key with multiple location keys
      const where: { [key: string]: any } = { id: comKey.pk };
      const additionalIncludes: any[] = [];

      // Process all location keys in the composite key
      for (const locator of comKey.loc) {
        const relationshipInfo = buildRelationshipPath(model, locator.kt, kta, true);

        if (!relationshipInfo.found) {
          const errorMessage = `Composite key locator '${locator.kt}' cannot be resolved on model '${model.name}' or through its relationships.`;
          logger.error(errorMessage, { key: comKey, kta });
          throw new Error(errorMessage);
        }

        if (relationshipInfo.isDirect) {
          // Direct foreign key field
          const fieldName = `${locator.kt}Id`;
          where[fieldName] = locator.lk;
        } else if (relationshipInfo.path) {
          // Hierarchical relationship requiring traversal
          where[relationshipInfo.path] = {
            [Op.eq]: locator.lk
          };

          // Add necessary includes for relationship traversal
          if (relationshipInfo.includes) {
            additionalIncludes.push(...relationshipInfo.includes);
          }
        }
      }

      // Build final query options
      const queryOptions: any = { where };
      if (additionalIncludes.length > 0) {
        queryOptions.include = mergeIncludes([], additionalIncludes);
      }

      logger.default('Composite key query for update', { queryOptions });
      response = await model.findOne(queryOptions);
    }

    if (response) {

      // Remove the key and events
      let updateProps = removeKey(item)
      // TODO: We need the opposite of processRow, something to step down from fjell to database.
      updateProps = extractEvents(updateProps);
      updateProps = removeEvents(updateProps);

      logger.default('Response: %s', stringifyJSON(response));
      logger.default('Update Properties: %s', stringifyJSON(updateProps));

      // Update the object
      response = await response.update(updateProps);

      // Populate the key and events
      const processedItem = await processRow(response, kta, references, aggregations, registry);
      const returnItem = validateKeys(processedItem, kta);
      return returnItem as V;
    } else {
      throw new NotFoundError<S, L1, L2, L3, L4, L5>('update', coordinate, key);
    }

  }

  return update;
}
