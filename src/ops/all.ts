/* eslint-disable no-undefined */
/* eslint-disable indent */
import { validateKeys } from "@fjell/core";

import { buildQuery } from "../QueryBuilder";

import { Definition } from "../Definition";
import LibLogger from '../logger';
import * as Library from "@fjell/lib";
import { processRow } from "../RowProcessor";
import { Item, ItemQuery, LocKeyArray } from "@fjell/core";
import { ModelStatic, Op } from "sequelize";
import { buildRelationshipPath } from "../util/relationshipUtils";
import { contextManager } from "../RowProcessor";

import { stringifyJSON } from "../util/general";

const logger = LibLogger.get('sequelize', 'ops', 'all');

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

export const getAllOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  models: Array<ModelStatic<any>>,
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  registry: Library.Registry
) => {

  const { coordinate, options: { references, aggregations } } = definition;

  //#region Query
  const all = async (
    itemQuery: ItemQuery,
    locations?: LocKeyArray<L1, L2, L3, L4, L5> | [] | undefined
  ): Promise<V[]> => {
    logger.debug(`ALL operation called on ${models[0].name} with ${locations?.length || 0} location filters: ${locations?.map(loc => `${loc.kt}=${loc.lk}`).join(', ') || 'none'}`);
    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations || [];

    // @ts-ignore
    const model = models[0];

    // Build base query from itemQuery
    const options = buildQuery(itemQuery, model);

    // Handle location keys if present
    if (loc.length > 0) {
      const { kta } = coordinate;
      const directLocations: Array<{ kt: string; lk: any }> = [];
      const hierarchicalLocations: Array<{ kt: string; lk: any }> = [];
      const additionalIncludes: any[] = [];

      // Categorize location keys as direct or hierarchical
      for (const locKey of loc) {
        const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta, true);

        if (!relationshipInfo.found) {
          const errorMessage = `Location key '${locKey.kt}' cannot be resolved on model '${model.name}' or through its relationships.`;
          logger.error(errorMessage, { locations: loc, kta });
          throw new Error(errorMessage);
        }

        if (relationshipInfo.isDirect) {
          directLocations.push(locKey);
        } else {
          hierarchicalLocations.push(locKey);
        }
      }

      // Handle direct location keys (simple foreign key constraints)
      for (const locKey of directLocations) {
        if (locKey.lk === undefined || locKey.lk == null || locKey.lk === '' || (typeof locKey.lk === 'object' && Object.keys(locKey.lk).length === 0)) {
          logger.error(`Location key '${locKey.kt}' has invalid lk value: ${stringifyJSON(locKey.lk)}`, { locKey, locations: loc });
          throw new Error(`Location key '${locKey.kt}' has invalid lk value: ${stringifyJSON(locKey.lk)}`);
        }
        const foreignKeyField = locKey.kt + 'Id';

        // Check if this field already has a condition from the itemQuery
        if (options.where[foreignKeyField]) {
          logger.debug(`[ALL] Field ${foreignKeyField} already constrained by itemQuery, skipping location constraint to avoid conflicts`);
          continue; // Skip this location constraint to avoid conflicts
        }

        logger.trace(`[ALL] Setting direct location where clause: ${foreignKeyField} = ${stringifyJSON(locKey.lk)} (type: ${typeof locKey.lk})`);
        options.where[foreignKeyField] = {
          [Op.eq]: locKey.lk
        };
      }

      // Handle hierarchical location keys (requires relationship traversal)
      for (const locKey of hierarchicalLocations) {
        if (locKey.lk === undefined || locKey.lk == null || locKey.lk === '' || (typeof locKey.lk === 'object' && Object.keys(locKey.lk).length === 0)) {
          logger.error(`Hierarchical location key '${locKey.kt}' has invalid lk value: ${stringifyJSON(locKey.lk)}`, { locKey, locations: loc });
          throw new Error(`Hierarchical location key '${locKey.kt}' has invalid lk value: ${stringifyJSON(locKey.lk)}`);
        }
        const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta);

        if (relationshipInfo.found && relationshipInfo.path) {
          // Check if this field already has a condition from the itemQuery
          if (options.where[relationshipInfo.path]) {
            logger.debug(`[ALL] Field ${relationshipInfo.path} already constrained by itemQuery, skipping hierarchical location constraint to avoid conflicts`);
            continue; // Skip this location constraint to avoid conflicts
          }

          // Add the relationship constraint using the path
          logger.trace(`[ALL] Setting hierarchical location where clause: ${relationshipInfo.path} = ${stringifyJSON(locKey.lk)} (type: ${typeof locKey.lk})`);
          options.where[relationshipInfo.path] = {
            [Op.eq]: locKey.lk
          };

          // Add necessary includes for the relationship traversal
          if (relationshipInfo.includes) {
            additionalIncludes.push(...relationshipInfo.includes);
          }
        }
      }

      // Merge additional includes with existing includes
      if (additionalIncludes.length > 0) {
        const existingIncludes = options.include || [];
        options.include = mergeIncludes(existingIncludes, additionalIncludes);
      }
    }

    logger.default(`All query configured for ${model.name} with where fields: ${options.where ? Object.keys(options.where).join(', ') : 'none'}, includes: ${options.include?.length || 0}`);

    try {
      logger.trace(`[ALL] Executing ${model.name}.findAll() with options: ${JSON.stringify(options, null, 2)}`);
    } catch {
      // Fallback for cases where JSON.stringify fails on Sequelize operators
      logger.trace(`[ALL] Executing ${model.name}.findAll() with options containing non-serializable operators (${Object.keys(options.where || {}).length} where conditions)`);
    }
    const matchingItems = await model.findAll(options);

    // this.logger.default('Matching Items', { matchingItems });

    // Pass null as context to let processRow create a new context for each top-level operation
    // This prevents circular dependency false positives between concurrent operations
    // while still detecting legitimate circular references within the same operation

    // TODO: Move this Up!
    const currentContext = contextManager.getCurrentContext();
    const results = (await Promise.all(matchingItems.map(async (row: any) => {
      // Each row in an all() operation should get its own context to prevent interference
      const processedRow = await processRow(row, coordinate.kta, references, aggregations, registry, currentContext);
      return validateKeys(processedRow, coordinate.kta);
    }))) as V[];

    logger.debug(`[ALL] Returning ${results.length} ${model.name} records`);
    return results;
  }

  return all;

}
