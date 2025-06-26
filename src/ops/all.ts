/* eslint-disable indent */
import { validateKeys } from "@fjell/core";

import { buildQuery } from "@/QueryBuilder";

import { Definition } from "@/Definition";
import LibLogger from '@/logger';
import * as Library from "@fjell/lib";
import { processRow } from "@/RowProcessor";
import { Item, ItemQuery, LocKeyArray } from "@fjell/core";
import { ModelStatic, Op } from "sequelize";
import { buildRelationshipPath } from "@/util/relationshipUtils";
import { contextManager } from "@/OperationContext";

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
    logger.default('All', { itemQuery, locations });
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
        const foreignKeyField = locKey.kt + 'Id';
        options.where = {
          ...options.where,
          [foreignKeyField]: {
            [Op.eq]: locKey.lk
          }
        };
      }

      // Handle hierarchical location keys (requires relationship traversal)
      for (const locKey of hierarchicalLocations) {
        const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta);

        if (relationshipInfo.found && relationshipInfo.path) {
          // Add the relationship constraint using the path
          options.where = {
            ...options.where,
            [relationshipInfo.path]: {
              [Op.eq]: locKey.lk
            }
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

    logger.default('Configured this Item Query', { itemQuery, options });

    const matchingItems = await model.findAll(options);

    // this.logger.default('Matching Items', { matchingItems });

    // Get the current context from context manager
    const context = contextManager.getCurrentContext();

    // TODO: Move this Up!
    return (await Promise.all(matchingItems.map(async (row: any) => {
      const processedRow = await processRow(row, coordinate.kta, references, aggregations, registry, context);
      return validateKeys(processedRow, coordinate.kta);
    }))) as V[];
  }

  return all;

}

