import { ikToLKA, Item, LocKeyArray } from "@fjell/core";
import * as Library from "@fjell/lib";
import { AggregationDefinition } from "./Options";
import { contextManager, OperationContext, serializeKey } from "./OperationContext";
import LibLogger from "@/logger";

const logger = LibLogger.get('sequelize', 'AggregationBuilder');

export const buildAggregation = async (
  item: Item,
  aggregationDefinition: AggregationDefinition,
  registry: Library.Registry,
  context?: OperationContext
) => {

  const location = ikToLKA(item.key) as unknown as LocKeyArray;

  // Get the library instance from the registry using the key type array
  const libraryInstance = registry.get(aggregationDefinition.kta);
  if (!libraryInstance) {
    throw new Error(`Library instance not found for key type array: ${aggregationDefinition.kta.join(', ')}`);
  }

  // Create a cache key for this aggregation query
  // This helps avoid running the same aggregation multiple times
  const aggregationCacheKey = `${aggregationDefinition.kta.join('.')}_${aggregationDefinition.cardinality}_${serializeKey(item.key)}`;

  if (context) {
    // Check if this aggregation is already cached
    if (context.cache.has(aggregationCacheKey)) {
      const cachedResult = context.cache.get(aggregationCacheKey);
      logger.default('Using cached aggregation result', {
        aggregationCacheKey,
        property: aggregationDefinition.property
      });
      item[aggregationDefinition.property] = cachedResult;
      return item;
    }

    // Note: We don't check for circular dependencies here because:
    // 1. Aggregations are location-based queries, not key-based references
    // 2. They should be allowed to run during normal item processing
    // 3. The main circular dependency concern is with references, not aggregations
  }

  // Execute aggregation within the current context to ensure context sharing
  return contextManager.withContext(context || contextManager.getCurrentContext() || { inProgress: new Set(), cache: new Map() } as any, async () => {
    // Based on cardinality, use either one or all operation
    if (aggregationDefinition.cardinality === 'one') {
      // For one-to-one relationship, use the one operation
      return (libraryInstance as any).operations.one({}, location)
        .then((result: any) => {
          if (context) {
            context.cache.set(aggregationCacheKey, result);
          }
          item[aggregationDefinition.property] = result;
          return item;
        });
    } else {
      // For one-to-many relationship, use the all operation
      return (libraryInstance as any).operations.all({}, location)
        .then((results: any) => {
          if (context) {
            context.cache.set(aggregationCacheKey, results);
          }
          item[aggregationDefinition.property] = results;
          return item;
        });
    }
  });
}
