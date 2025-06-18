/* eslint-disable indent */
import { Item } from "@fjell/core";

import * as Library from "@fjell/lib";
import { getAllOperation } from "./ops/all";
import { getCreateOperation } from "./ops/create";
import { getFindOperation } from "./ops/find";
import { getGetOperation } from "./ops/get";
import { getOneOperation } from "./ops/one";
import { getRemoveOperation } from "./ops/remove";
import { getUpdateOperation } from "./ops/update";
import { ModelStatic } from "sequelize";
import { Definition } from "./Definition";

export const createOperations = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never,
>(
  models: Array<ModelStatic<any>>,
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  registry: Library.Registry
): Library.Operations<V, S, L1, L2, L3, L4, L5> => {

  const operations = {} as Library.Operations<V, S, L1, L2, L3, L4, L5>;

  operations.all = getAllOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.one = getOneOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.create = getCreateOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.update = getUpdateOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.get = getGetOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.remove = getRemoveOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.find = getFindOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  operations.upsert = () => {
    throw new Error('Not implemented');
  };

  return operations;
}