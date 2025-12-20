/* eslint-disable indent */
import { Item, ItemQuery, LocKeyArray, OneMethod } from "@fjell/types";
import { createOneWrapper } from "@fjell/core";

import { Definition } from "../Definition";
import logger from '../logger';
import { ModelStatic } from "sequelize";
import { getAllOperation } from "./all";
import * as Library from "@fjell/lib";

export const getOneOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  models: ModelStatic<any>[],
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  registry: Library.Registry
): OneMethod<V, S, L1, L2, L3, L4, L5> => {
  return createOneWrapper(
    definition.coordinate,
    async (
      itemQuery?: ItemQuery,
      locations?: LocKeyArray<L1, L2, L3, L4, L5> | []
    ): Promise<V | null> => {
      const locs = locations ?? [];
      logger.debug(`ONE operation called on ${models[0].name} with ${locs.length} location filters: ${locs.map(loc => `${loc.kt}=${loc.lk}`).join(', ') || 'none'}`);
      logger.default(`One configured for ${models[0].name} delegating to all operation`);

      const result = await getAllOperation(models, definition, registry)(itemQuery ?? {}, locs as any, { limit: 1 });
      if (result.items.length > 0) {
        const item = result.items[0] as unknown as V;
        logger.debug(`[ONE] Found ${models[0].name} record with key: ${(item as any).key ? JSON.stringify((item as any).key) : 'unknown'}`);
        return item;
      } else {
        logger.debug(`[ONE] No ${models[0].name} record found`);
        return null;
      }
    }
  );
}