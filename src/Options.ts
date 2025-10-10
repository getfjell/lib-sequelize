import * as Library from '@fjell/lib';
import { Item } from '@fjell/core';

// Re-export types from @fjell/lib for backwards compatibility
export type {
  AggregationDefinition,
  ReferenceDefinition
} from '@fjell/lib';

export interface Options<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Options<V, S, L1, L2, L3, L4, L5> {
  deleteOnRemove?: boolean;
}

export const createOptions = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(sequelizeOptions?: Partial<Options<V, S, L1, L2, L3, L4, L5>>): Options<V, S, L1, L2, L3, L4, L5> => {
  // Create the base lib options (which handles references and aggregations)
  const baseOptions = Library.createOptions(sequelizeOptions);

  // Add Sequelize-specific defaults and ensure arrays for backward compatibility
  const result = {
    ...baseOptions,
    references: baseOptions.references ?? [],
    aggregations: baseOptions.aggregations ?? [],
    deleteOnRemove: sequelizeOptions?.deleteOnRemove ?? false,
  };

  return result as Options<V, S, L1, L2, L3, L4, L5>;
}
