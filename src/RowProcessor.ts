/* eslint-disable indent */
 
import { AllItemTypeArrays, Item } from "@fjell/core";
import { Model } from "sequelize";

import LibLogger from "@/logger";
import { addKey } from "./KeyMaster";
import { AggregationDefinition, ReferenceDefinition } from "./Options";
import { buildReference } from "./ReferenceBuilder";
import * as Library from "@fjell/lib";
import { buildAggregation } from "./AggregationBuilder";
import { stringifyJSON } from "./util/general";
import { populateEvents } from "./EventCoordinator";
import { contextManager, createOperationContext, OperationContext } from "./OperationContext";

const logger = LibLogger.get('sequelize', 'RowProcessor');

export const processRow = async <S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never>(
    row: Model<any, any>,
    keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>,
    referenceDefinitions: ReferenceDefinition[],
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
        for (const referenceDefinition of referenceDefinitions) {
          logger.default('Processing Reference for %s to %s', item.key.kt, stringifyJSON(referenceDefinition.kta));
          item = await buildReference(item, referenceDefinition, registry, operationContext);
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

    logger.default('Processed Row: %j', stringifyJSON(item));
    return item as Item<S, L1, L2, L3, L4, L5>;
  });
};
