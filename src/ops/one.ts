import { Item, ItemQuery, LocKeyArray } from "@fjell/core";

import { Definition } from "@/Definition";
import LibLogger from '@/logger';
import { ModelStatic } from "sequelize";
import { getAllOperation } from "./all";

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
  ) => {
  const one = async (
    itemQuery: ItemQuery,
    locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = [],
  ): Promise<V | null> => {
    logger.default('One', { itemQuery, locations });

    const items = await getAllOperation(models, definition)(itemQuery, locations);
    if (items.length > 0) {
      return items[0] as V;
    } else {
      return null;
    }
  }

  return one;
}