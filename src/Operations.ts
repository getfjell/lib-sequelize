/* eslint-disable indent */
import { Item, Coordinate } from "@fjell/core";

import * as Library from "@fjell/lib";
import { Registry } from "./Registry";
import { getAllOperation } from "./ops/all";
import { getCreateOperation } from "./ops/create";
import { getFindOperation } from "./ops/find";
import { getGetOperation } from "./ops/get";
import { getOneOperation } from "./ops/one";
import { getRemoveOperation } from "./ops/remove";
import { getUpdateOperation } from "./ops/update";
import { getUpsertOperation } from "./ops/upsert";
import { ModelStatic } from "sequelize";

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
  coordinate: Coordinate<S, L1, L2, L3, L4, L5>,
  registry: Registry,
  options: import('./Options').Options<V, S, L1, L2, L3, L4, L5>
): Library.Operations<V, S, L1, L2, L3, L4, L5> => {

  // Create a definition-like object for backward compatibility with existing operation functions
  const definition = { coordinate, options };

  // Create implementation operations (core CRUD and query operations only)
  // These are the operations that lib-sequelize actually implements
  const implOps: Library.ImplementationOperations<V, S, L1, L2, L3, L4, L5> = {
    all: getAllOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    one: getOneOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    create: getCreateOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    update: getUpdateOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    get: getGetOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    remove: getRemoveOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    find: getFindOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
    // findOne depends on find, so set it after
    findOne: null as any,
    upsert: getUpsertOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry),
  };

  // Set findOne operation that depends on find
  implOps.findOne = async (finder: string, params?: Library.OperationParams, locations?: any): Promise<V | null> => {
    const results = await implOps.find(finder, params || {}, locations);
    return results.length > 0 ? results[0] : null;
  };

  // Wrap with default stub implementations for extended operations (facets, actions)
  // and add metadata dictionaries (finders, actions, facets, allActions, allFacets)
  return Library.wrapImplementationOperations(implOps, options);
}
