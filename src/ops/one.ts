/* eslint-disable indent */
import { Item, ItemQuery, LocKeyArray, OneMethod } from "@fjell/core";
import { validateLocations } from "@fjell/core/validation";

import { Definition } from "../Definition";
import LibLogger from '../logger';
import { ModelStatic } from "sequelize";
import { getAllOperation } from "./all";
import * as Library from "@fjell/lib";

const logger = LibLogger.get('sequelize', 'ops', 'one');

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
  const one = async (
    itemQuery: ItemQuery,
    locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = [],
  ): Promise<V | null> => {
    logger.debug(`ONE operation called on ${models[0].name} with ${locations.length} location filters: ${locations.map(loc => `${loc.kt}=${loc.lk}`).join(', ') || 'none'}`);
    logger.default(`One configured for ${models[0].name} delegating to all operation`);

    // Validate location key order
    validateLocations(locations, definition.coordinate, 'one');

    const items = await getAllOperation(models, definition, registry)(itemQuery, locations);
    if (items.length > 0) {
      const result = items[0] as V;
      logger.debug(`[ONE] Found ${models[0].name} record with key: ${(result as any).key ? JSON.stringify((result as any).key) : 'unknown'}`);
      return result;
    } else {
      logger.debug(`[ONE] No ${models[0].name} record found`);
      return null;
    }
  }

  return one;
}