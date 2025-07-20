import * as Library from '@fjell/lib';
import { Item } from '@fjell/core';

export interface AggregationDefinition {
  kta: string[];
  property: string;
  cardinality: 'one' | 'many';
}

export interface ReferenceDefinition {
  column: string;
  kta: string[];
  property: string;
}

export interface Options<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Options<V, S, L1, L2, L3, L4, L5> {
  deleteOnRemove: boolean;
  references: ReferenceDefinition[];
  aggregations: AggregationDefinition[];
}

const DEFAULT_SEQUELIZE_OPTIONS = {
  deleteOnRemove: false,
  references: [],
  aggregations: [],
};

export const createOptions = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(sequelizeOptions?: Partial<Options<V, S, L1, L2, L3, L4, L5>>): Options<V, S, L1, L2, L3, L4, L5> => {
  // Create the base lib options
  const baseOptions = Library.createOptions(sequelizeOptions);

  // Add Sequelize-specific defaults
  const result = {
    ...baseOptions,
    deleteOnRemove: sequelizeOptions?.deleteOnRemove ?? DEFAULT_SEQUELIZE_OPTIONS.deleteOnRemove,
    references: sequelizeOptions?.references ?? DEFAULT_SEQUELIZE_OPTIONS.references,
    aggregations: sequelizeOptions?.aggregations ?? DEFAULT_SEQUELIZE_OPTIONS.aggregations,
  };

  return result as Options<V, S, L1, L2, L3, L4, L5>;
}
