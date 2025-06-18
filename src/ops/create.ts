/* eslint-disable indent */
import { ComKey, Item, LocKeyArray, PriKey, TypesProperties } from "@fjell/core";

import LibLogger from '@/logger';
import { ModelStatic } from "sequelize";
import { Definition } from "@/Definition";
import * as Library from "@fjell/lib";

const logger = LibLogger.get('sequelize', 'ops', 'create');

export const getCreateOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  models: ModelStatic<any>[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registry: Library.Registry
) => {

  const create = async (
    item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
    options?: {
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      locations?: never;
    } | {
      key?: never;
      locations: LocKeyArray<L1, L2, L3, L4, L5>,
    },
  ): Promise<V> => {
    logger.default('Create', { item, options });

    throw new Error('Not implemented');
  }

  return create;
}