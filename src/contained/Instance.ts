/* eslint-disable max-params */
import { Instance as AbstractSequelizeInstance } from '@/Instance';
import { Item, ItemTypeArray } from '@fjell/core';
import { Contained } from '@fjell/lib';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';
import { ModelStatic } from 'sequelize';
import * as Library from "@fjell/lib";

export interface Instance<
  V extends Item<S>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends AbstractSequelizeInstance<V, S, L1, L2, L3, L4, L5> {
  models: ModelStatic<any>[];
}

export function createInstance<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  keyTypes: ItemTypeArray<S, L1, L2, L3, L4, L5>,
  models: ModelStatic<any>[],
  libOptions: Contained.Options<V, S, L1, L2, L3, L4, L5> = {},
  scopes: string[] = [],
  registry: Library.Registry
): Instance<V, S, L1, L2, L3, L4, L5> {

  const definition = createDefinition(keyTypes, scopes, libOptions);
  const operations = createOperations(models, definition, registry);

  return {
    definition,
    operations: Contained.wrapOperations(operations, definition, registry),
    models,
    registry
  } as Instance<V, S, L1, L2, L3, L4, L5>;

}