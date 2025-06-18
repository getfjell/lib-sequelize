import * as Library from '@fjell/lib';
import { Item } from '@fjell/core';
import deepmerge from 'deepmerge';
import { clean } from './util/general';

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

const DEFAULT_OPTIONS: Options<any, any, any, any, any, any, any> = {
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
>(libOptions?: Partial<Options<V, S, L1, L2, L3, L4, L5>>): Options<V, S, L1, L2, L3, L4, L5> => {
  const options = Library.createOptions(libOptions);
  return deepmerge(DEFAULT_OPTIONS, clean(options)) as Options<V, S, L1, L2, L3, L4, L5>;
}