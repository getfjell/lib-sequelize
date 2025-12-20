/* eslint-disable indent */
import { ComKey, Item, LocKeyArray, PriKey, UpdateOptions, UpsertMethod } from "@fjell/types";
import { createUpsertWrapper, isValidItemKey, NotFoundError } from "@fjell/core";

import { Definition } from "../Definition";
import logger from '../logger';
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { getGetOperation } from "./get";
import { getUpdateOperation } from "./update";
import { getCreateOperation } from "./create";
import { stringifyJSON } from "../util/general";

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
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      locations?: LocKeyArray<L1, L2, L3, L4, L5>,
      options?: UpdateOptions
    ): Promise<V> => {
      if (!isValidItemKey(key)) {
        logger.error('Invalid key for upsert operation', {
          operation: 'upsert',
          model: models[0]?.name,
          key: stringifyJSON(key),
          keyType: typeof key,
          reason: 'Key validation failed',
          suggestion: 'Ensure key has valid PriKey or ComKey structure',
          coordinate: JSON.stringify(definition.coordinate)
        });
        throw new Error(`Invalid key for upsert operation: ${stringifyJSON(key)}. Expected valid PriKey or ComKey structure.`);
      }

      logger.debug(`[UPSERT] Attempting upsert with key: ${stringifyJSON(key)}`, { options });

    let resultItem: V | null = null;

    try {
      // Try to get the existing item first
      logger.debug(`[UPSERT] Retrieving item by key: ${stringifyJSON(key)}`);
      resultItem = await get(key);
    } catch (error: any) {
      // Check if this is a NotFoundError (preserved by core wrapper)
      // Check both instanceof and error code to handle cases where
      // module duplication might break instanceof checks
      const isNotFound = error instanceof NotFoundError ||
        error?.name === 'NotFoundError' ||
        error?.errorInfo?.code === 'NOT_FOUND';

      if (isNotFound) {
        // Item doesn't exist, create it
        logger.debug(`[UPSERT] Item not found, creating new item with key: ${stringifyJSON(key)}, errorType: ${error?.name}, errorCode: ${error?.errorInfo?.code}`);
        const createOptions = locations ? { locations } : { key };
        resultItem = await create(item, createOptions);
      } else {
        // Re-throw other errors (connection issues, permissions, etc.)
        logger.error(`[UPSERT] Unexpected error during get operation`, {
          operation: 'upsert',
          phase: 'get-existing',
          model: models[0]?.name,
          key: stringifyJSON(key),
          errorType: error?.constructor?.name || typeof error,
          errorMessage: error?.message,
          errorName: error?.name,
          errorCode: error?.errorInfo?.code,
          suggestion: 'Check database connectivity, permissions, and key validity',
          coordinate: JSON.stringify(definition.coordinate)
        });
        throw error;
      }
    }

    if (!resultItem) {
      throw new Error(`Failed to retrieve or create item for key: ${stringifyJSON(key)}`);
    }

    // Always update the item with the new properties (this is what makes it an "upsert")
    // Pass through UpdateOptions to control merge vs replace behavior
    logger.debug(`[UPSERT] Updating item with properties, key: ${stringifyJSON(key)}`, { options });
    resultItem = await update(resultItem.key, item, options);
    logger.debug(`[UPSERT] Item upserted successfully: ${stringifyJSON(resultItem)}`);

    return resultItem;
    }
  );
}
