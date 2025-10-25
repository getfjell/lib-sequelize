/* eslint-disable indent */
import { ComKey, createUpsertWrapper, isValidItemKey, Item, NotFoundError, PriKey, UpsertMethod } from "@fjell/core";

import { Definition } from "../Definition";
import LibLogger from '../logger';
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { getGetOperation } from "./get";
import { getUpdateOperation } from "./update";
import { getCreateOperation } from "./create";
import { stringifyJSON } from "../util/general";

const logger = LibLogger.get('sequelize', 'ops', 'upsert');

export const getUpsertOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  models: Array<ModelStatic<any>>,
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  registry: Library.Registry
): UpsertMethod<V, S, L1, L2, L3, L4, L5> => {

  // Get the individual operations we'll use
  const get = getGetOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  const update = getUpdateOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);
  const create = getCreateOperation<V, S, L1, L2, L3, L4, L5>(models, definition, registry);

  return createUpsertWrapper(
    definition.coordinate,
    async (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>
    ): Promise<V> => {
      if (!isValidItemKey(key)) {
        logger.error('Key for Upsert is not a valid ItemKey: %j', key);
        throw new Error(`Key for Upsert is not a valid ItemKey: ${stringifyJSON(key)}`);
      }

      logger.debug(`[UPSERT] Attempting upsert with key: ${stringifyJSON(key)}`);

    let resultItem: V | null = null;

    try {
      // Try to get the existing item first
      logger.debug(`[UPSERT] Retrieving item by key: ${stringifyJSON(key)}`);
      resultItem = await get(key);
    } catch (error: any) {
      // Check if this is a NotFoundError (preserved by core wrapper)
      if (error instanceof NotFoundError) {
        // Item doesn't exist, create it
        logger.debug(`[UPSERT] Item not found, creating new item with key: ${stringifyJSON(key)}`);
        resultItem = await create(item, { key });
      } else {
        // Re-throw other errors (connection issues, permissions, etc.)
        throw error;
      }
    }

    if (!resultItem) {
      throw new Error(`Failed to retrieve or create item for key: ${stringifyJSON(key)}`);
    }

    // Always update the item with the new properties (this is what makes it an "upsert")
    logger.debug(`[UPSERT] Updating item with properties, key: ${stringifyJSON(key)}`);
    resultItem = await update(resultItem.key, item);
    logger.debug(`[UPSERT] Item upserted successfully: ${stringifyJSON(resultItem)}`);

    return resultItem;
    }
  );
}
