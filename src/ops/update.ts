/* eslint-disable indent */
/* eslint-disable max-depth */
import {
  abbrevIK,
  ComKey,
  createUpdateWrapper,
  isComKey,
  isPriKey,
  Item,
  PriKey,
  UpdateMethod,
  UpdateOptions
} from "@fjell/core";
import { validateKeys } from "@fjell/core/validation";

import { Definition } from "../Definition";
import { extractEvents, removeEvents } from "../EventCoordinator";
import { removeKey } from "../KeyMaster";
import LibLogger from '../logger';
import { processRow } from "../RowProcessor";

import * as Library from "@fjell/lib";
import { NotFoundError } from "@fjell/core";
import { ModelStatic, Op } from "sequelize";
import { buildRelationshipPath } from "../util/relationshipUtils";
import { stringifyJSON } from "../util/general";
import { transformSequelizeError } from "../errors/sequelizeErrorHandler";
import { removeRefsFromSequelizeItem } from "../processing/RefsAdapter";
import { removeAggsFromItem } from "../processing/AggsAdapter";

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
): UpdateMethod<V, S, L1, L2, L3, L4, L5> => {

  const { options: { references, aggregations } } = definition;

  return createUpdateWrapper(
    definition.coordinate,
    async (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?: UpdateOptions
    ): Promise<V> => {
      try {
        // Check for unsupported replace option
        if (options?.replace) {
          throw new Error(
            'UpdateOptions.replace is not supported for SQL databases. ' +
            'SQL UPDATE operations are always partial (they only update specified fields). ' +
            'To replace an entire record, use remove() followed by create(), ' +
            'or explicitly set all fields you want to change/clear.'
          );
        }
        
        const keyDescription = isPriKey(key)
          ? `primary key: pk=${key.pk}`
          : `composite key: pk=${key.pk}, loc=[${(key as ComKey<S, L1, L2, L3, L4, L5>).loc.map((l: any) => `${l.kt}=${l.lk}`).join(', ')}]`;
        logger.debug(`UPDATE operation called on ${models[0].name} with ${keyDescription}`, { options });
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
          logger.trace(`[UPDATE] Executing ${model.name}.findByPk() with pk: ${priKey.pk}`);
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

          logger.default(`Update composite key query for ${model.name} with where fields: ${queryOptions.where ? Object.keys(queryOptions.where).join(', ') : 'none'}`);
          logger.trace(`[UPDATE] Executing ${model.name}.findOne() with options: ${stringifyJSON(queryOptions)}`);
          response = await model.findOne(queryOptions);
        }

        if (!response) {
          throw new NotFoundError(
            `Cannot update: ${kta[0]} not found`,
            kta[0],
            key
          );
        }

        // Remove the key and events
        let updateProps = removeKey(item)
        // TODO: We need the opposite of processRow, something to step down from fjell to database.
        updateProps = extractEvents(updateProps);
        updateProps = removeEvents(updateProps);
        
        // Remove refs structure if present (convert back to foreign key columns)
        if (references && references.length > 0) {
          updateProps = removeRefsFromSequelizeItem(updateProps, references);
        }
        
        // Remove aggs structure if present (convert back to direct properties)
        if (aggregations && aggregations.length > 0) {
          updateProps = removeAggsFromItem(updateProps, aggregations);
        }

        logger.default(`Update found ${model.name} record to modify`);
        logger.default(`Update properties configured: ${Object.keys(updateProps).join(', ')}`);

        // Update the object
        logger.trace(`[UPDATE] Executing ${model.name}.update() with properties: ${stringifyJSON(updateProps)}`);
        response = await response.update(updateProps);

        // Populate the key and events
        // Update operations get their own context since they're top-level operations
        // For update, we don't pre-load aggregations via INCLUDE, so pass void 0
        const processedItem = await processRow(response, kta, references || [], aggregations || [], registry, void 0, void 0);
        const returnItem = validateKeys(processedItem, kta);

        logger.debug(`[UPDATE] Updated ${model.name} with key: ${(returnItem as any).key ? JSON.stringify((returnItem as any).key) : `id=${response.id}`}`);
        return returnItem as V;
      } catch (error: any) {
        // Transform database errors but pass through NotFoundError
        if (error instanceof NotFoundError) throw error;
        throw transformSequelizeError(error, definition.coordinate.kta[0], key);
      }
    }
  );
}
