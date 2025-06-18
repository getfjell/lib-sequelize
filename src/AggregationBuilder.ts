import { ikToLKA, Item, LocKeyArray } from "@fjell/core";
import * as Library from "@fjell/lib";
import { AggregationDefinition } from "./Options";

export const buildAggregation = async (
  item: Item,
  aggregationDefinition: AggregationDefinition,
  registry: Library.Registry
) => {

  const location = ikToLKA(item.key) as unknown as LocKeyArray;

  // Get the library instance from the registry using the key type array
  const libraryInstance = registry.get(aggregationDefinition.kta);
  if (!libraryInstance) {
    throw new Error(`Library instance not found for key type array: ${aggregationDefinition.kta.join(', ')}`);
  }

  // Based on cardinality, use either one or all operation
  if (aggregationDefinition.cardinality === 'one') {
    // For one-to-one relationship, use the one operation
    return libraryInstance.operations.one({}, location)
      .then(result => {
        item[aggregationDefinition.property] = result;
        return item;
      });
  } else {
    // For one-to-many relationship, use the all operation
    return libraryInstance.operations.all({}, location)
      .then(results => {
        item[aggregationDefinition.property] = results;
        return item;
      });
  }
}