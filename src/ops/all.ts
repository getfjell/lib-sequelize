/* eslint-disable no-undefined */
/* eslint-disable indent */
/* eslint-disable max-depth */
import { AllMethod, AllOperationResult, AllOptions, Item, ItemQuery, LocKeyArray } from "@fjell/types";
import { createAllWrapper } from "@fjell/core";
import { validateKeys } from "@fjell/validation";

import { addAggregationIncludes, addReferenceIncludes, buildQuery } from "../QueryBuilder";

import { Definition } from "../Definition";
import * as Library from "@fjell/lib";
import { processRow } from "../RowProcessor";
import { ModelStatic, Op } from "sequelize";
import { buildRelationshipPath } from "../util/relationshipUtils";
import { contextManager } from "../RowProcessor";
import { transformSequelizeError } from "../errors/sequelizeErrorHandler";

import { stringifyJSON } from "../util/general";
import { queryMetrics } from "../metrics/QueryMetrics";
import LibLogger from '../logger';

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
): AllMethod<V, S, L1, L2, L3, L4, L5> => {

  const { coordinate, options: { references, aggregations } } = definition;

  return createAllWrapper(
    coordinate,
    async (
      itemQuery?: ItemQuery,
      locations?: LocKeyArray<L1, L2, L3, L4, L5> | [],
      allOptions?: AllOptions
    ): Promise<AllOperationResult<V>> => {
      try {
        const locs = locations ?? [];
        logger.debug(`ALL operation called on ${models[0].name} with ${locs.length} location filters: ${locs.map(loc => `${loc.kt}=${loc.lk}`).join(', ') || 'none'}`);

        const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locs;

        // @ts-ignore
        const model = models[0];

    // Build base query from itemQuery (includes limit/offset from query)
    let options = buildQuery(itemQuery ?? {}, model, references, registry);

    // Auto-detect and add reference INCLUDES to prevent N+1 queries
    const { options: optionsWithRefs, includedReferences } = addReferenceIncludes(
      options,
      model,
      references || []
    );
    options = optionsWithRefs;

    // Auto-detect and add aggregation INCLUDES to prevent N+1 queries
    const { options: optionsWithAggs, includedAggregations } = addAggregationIncludes(
      options,
      model,
      aggregations || []
    );
    options = optionsWithAggs;

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

    // Determine effective limit/offset (options takes precedence over query)
    const effectiveLimit = allOptions?.limit ?? itemQuery?.limit;
    const effectiveOffset = allOptions?.offset ?? itemQuery?.offset ?? 0;

    const whereFields = options.where ? Object.keys(options.where).join(', ') : 'none';
    const includeCount = options.include?.length || 0;
    logger.default(
      `All query configured for ${model.name} with where fields: ${whereFields}, ` +
      `includes: ${includeCount}, limit: ${effectiveLimit}, offset: ${effectiveOffset}`
    );

    // Execute COUNT query to get total matching records (before pagination)
    // Use only where and include from options, not limit/offset
    const countOptions: any = {
      where: options.where,
      distinct: true
    };
    if (options.include) {
      countOptions.include = options.include;
    }

    queryMetrics.recordQuery(model.name);
    const countResult = await model.count(countOptions);
    // Sequelize count() with distinct:true and include can return GroupedCountResultItem[]
    // Extract the count value properly
    const total = Array.isArray(countResult) ? countResult.length : (countResult as number);
    logger.debug(`[ALL] Total count for ${model.name}: ${total}`);

    // Apply effective limit/offset for the data query
    // Remove any limit/offset that came from buildQuery (via itemQuery)
    delete options.limit;
    delete options.offset;

    if (effectiveLimit !== undefined) {
      options.limit = effectiveLimit;
    }
    if (effectiveOffset > 0) {
      options.offset = effectiveOffset;
    }

    try {
      logger.trace(`[ALL] Executing ${model.name}.findAll() with options: ${JSON.stringify(options, null, 2)}`);
    } catch {
      // Fallback for cases where JSON.stringify fails on Sequelize operators
      logger.trace(`[ALL] Executing ${model.name}.findAll() with options containing non-serializable operators (${Object.keys(options.where || {}).length} where conditions)`);
    }
    queryMetrics.recordQuery(model.name);
    const matchingItems = await model.findAll(options);

    // this.logger.default('Matching Items', { matchingItems });

    // Pass null as context to let processRow create a new context for each top-level operation
    // This prevents circular dependency false positives between concurrent operations
    // while still detecting legitimate circular references within the same operation

    // TODO: Move this Up!
    const currentContext = contextManager.getCurrentContext();
    const items = (await Promise.all(matchingItems.map(async (row: any) => {
      // Each row in an all() operation should get its own context to prevent interference
      const processedRow = await processRow(
        row,
        coordinate.kta,
        references || [],
        aggregations || [],
        registry,
        currentContext,
        includedAggregations,
        includedReferences
      );
      return validateKeys(processedRow, coordinate.kta);
    }))) as V[];

        logger.debug(`[ALL] Returning ${items.length} of ${total} ${model.name} records`);

        // Build and return AllOperationResult
        return {
          items,
          metadata: {
            total,
            returned: items.length,
            limit: effectiveLimit,
            offset: effectiveOffset,
            hasMore: effectiveOffset + items.length < total
          }
        };
      } catch (error: any) {
        // Transform database errors
        throw transformSequelizeError(error, coordinate.kta[0]);
      }
    }
  );

}
