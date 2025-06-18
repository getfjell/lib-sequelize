/* eslint-disable indent */
import { Item, LocKeyArray, validateKeys } from "@fjell/core";

import { Definition } from "@/Definition";
import LibLogger from '@/logger';
import { ModelStatic } from "sequelize";
import { processRow } from "@/RowProcessor";
import * as Library from "@fjell/lib";

const logger = LibLogger.get('sequelize', 'ops', 'find');

export const getFindOperation = <
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
) => {

  const { options: { finders, references, aggregations } } = definition;

  const find = async (
    finder: string,
    finderParams: Record<string, string | number | boolean | Date | Array<string | number | boolean | Date>>,
    locations?: LocKeyArray<L1, L2, L3, L4, L5> | [],

  ): Promise<V[]> => {
    logger.default('Find', { finder, finderParams, locations });

    // Note that we execute the createFinders function here because we want to make sure we're always getting the
    // most up to date methods.
    if (finders && finders[finder]) {
      const finderMethod = finders[finder];
      if (finderMethod) {
        const results = await finderMethod(finderParams, locations);
        if (results && results.length > 0) {
          return (await Promise.all(results.map(async (row: any) => {
            const processedRow = await processRow(row, definition.coordinate.kta, references, aggregations, registry);
            return validateKeys(processedRow, definition.coordinate.kta);
          })) as V[]);
        } else {
          return [];
        }
      } else {
        logger.error(`Finder %s not found`, finder);
        throw new Error(`Finder ${finder} not found`);
      }
    } else {
      logger.error(`No finders have been defined for this lib`);
      throw new Error(`No finders found`);
    }
  }

  return find;
}