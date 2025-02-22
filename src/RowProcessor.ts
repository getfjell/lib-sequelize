import { AllItemTypeArrays, Item } from "@fjell/core";
import { Model } from "sequelize";

import LibLogger from "@/logger";
import { addKey } from "./KeyMaster";

const logger = LibLogger.get('sequelize', 'RowProcessor');

export const processRow = <S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never>(
    row: Model<any, any>,
    keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>
  ): Item<S, L1, L2, L3, L4, L5> => {
  logger.default('Processing Row', { row });
  const item = row.get({ plain: true }) as any;
  addKey(item, keyTypes);
  logger.default('Processed Row: ' + JSON.stringify(item));
  return item as Item<S, L1, L2, L3, L4, L5>;
};
