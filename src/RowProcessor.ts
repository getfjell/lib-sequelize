/* eslint-disable indent */

import { AllItemTypeArrays, Item } from "@fjell/core";
import { Model } from "sequelize";

import LibLogger from "./logger";
import { addKey } from "./KeyMaster";
import { AggregationDefinition, SequelizeReferenceDefinition } from "./Options";
import * as Library from "@fjell/lib";
import {
  buildAggregation,
  contextManager,
  createOperationContext,
  OperationContext
} from "@fjell/lib";
import { stringifyJSON } from "./util/general";
import { populateEvents } from "./EventCoordinator";
import { buildSequelizeReference } from "./processing/ReferenceBuilder";
import { addRefsToSequelizeItem } from "./processing/RefsAdapter";
import { addAggsToItem } from "./processing/AggsAdapter";

const logger = LibLogger.get('sequelize', 'RowProcessor');

// Re-export types and functions from @fjell/lib for backwards compatibility
export type { OperationContext };
export { createOperationContext, contextManager };

export const processRow = async <S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never>(
    row: Model<any, any>,
    keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>,
    referenceDefinitions: SequelizeReferenceDefinition[],
    aggregationDefinitions: AggregationDefinition[],
    registry: Library.Registry,
    context?: OperationContext
  ): Promise<Item<S, L1, L2, L3, L4, L5>> => {
  logger.default('Processing Row', { row });

  // Use provided context or create new one
  const operationContext = context || createOperationContext();

  // Process the row within the context to ensure all operations share the same context
  return contextManager.withContext(operationContext, async () => {
    let item = row.get({ plain: true }) as any;
    logger.default('Adding Key to Item with Key Types: %s', stringifyJSON(keyTypes));
    item = addKey(row, item, keyTypes);
    item = populateEvents(item);
    logger.default('Key Added to Item: %s', stringifyJSON(item.key));

    // Mark this item as in progress to detect circular references
    operationContext.markInProgress(item.key);

    try {
      if (referenceDefinitions && referenceDefinitions.length > 0) {
        // Process all references in parallel for better performance
        // Each reference reads from a different column and writes to a different property,
        // so they can safely run in parallel without race conditions
        const referenceStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const referencePromises = referenceDefinitions.map((referenceDefinition) => {
          logger.default('Processing Reference for %s to %s', item.key.kt, stringifyJSON(referenceDefinition.kta));
          // buildSequelizeReference modifies item in place, but each modifies a different property
          // so parallel execution is safe
          return buildSequelizeReference(item, referenceDefinition, registry, operationContext);
        });

        // Wait for all references to load in parallel
        await Promise.all(referencePromises);

        const referenceDuration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - referenceStartTime;
        if (referenceDuration > 100) {
          logger.debug(`⏱️ REFERENCE_BUILDER_PERF: Loaded ${referenceDefinitions.length} references in parallel for ${item.key.kt} - ${referenceDuration.toFixed(2)}ms`);
        }
      }
      if (aggregationDefinitions && aggregationDefinitions.length > 0) {
        for (const aggregationDefinition of aggregationDefinitions) {
          logger.default('Processing Aggregation for %s from %s', item.key.kt, stringifyJSON(aggregationDefinition.kta));
          item = await buildAggregation(item, aggregationDefinition, registry, operationContext);
        }
      }

      // Cache the fully processed item
      operationContext.setCached(item.key, item);
    } finally {
      // Mark this item as complete
      operationContext.markComplete(item.key);
    }

    // Automatically add refs structure before returning (transparent wrapper)
    // This ensures items leaving the Sequelize library always have Firestore-style refs structure
    if (referenceDefinitions && referenceDefinitions.length > 0) {
      item = addRefsToSequelizeItem(item, referenceDefinitions);
      logger.debug('Added refs structure to item (transparent wrapper)', { key: item.key });
    }

    // Automatically add aggs structure before returning (transparent wrapper)
    // This ensures items leaving the Sequelize library always have unified aggs structure
    if (aggregationDefinitions && aggregationDefinitions.length > 0) {
      item = addAggsToItem(item, aggregationDefinitions);
      logger.debug('Added aggs structure to item (transparent wrapper)', { key: item.key });
    }

    logger.default('Processed Row: %j', stringifyJSON(item));
    return item as Item<S, L1, L2, L3, L4, L5>;
  });
};
