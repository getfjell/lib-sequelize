import * as Library from '@fjell/lib';
import { Item } from '@fjell/core';
import deepmerge from 'deepmerge';

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

export const defaultOptions: Options<any, any, any, any, any, any, any> = {
  deleteOnRemove: false,
};

export const createOptions = <
V extends Item<S, L1, L2, L3, L4, L5>,
S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never
>(libOptions?: Options<V, S, L1, L2, L3, L4, L5>): Options<V, S, L1, L2, L3, L4, L5> => {
  const defaultOptions = {
    deleteOnRemove: false,
  } as Options<V, S, L1, L2, L3, L4, L5>;

  const options = Library.createOptions(libOptions);

  const mergedOptions = deepmerge(defaultOptions, options);

  return {
    ...mergedOptions,
  } as Options<V, S, L1, L2, L3, L4, L5>;
}