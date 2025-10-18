/* eslint-disable indent */
import { FindMethod, Item, LocKeyArray, validateKeys } from "@fjell/core";

import { Definition } from "../Definition";
import { validateLocations } from "../validation/LocationKeyValidator";
import LibLogger from '../logger';
import { ModelStatic } from "sequelize";
import { processRow } from "../RowProcessor";
import * as Library from "@fjell/lib";
import { stringifyJSON } from "../util/general";

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
): FindMethod<V, S, L1, L2, L3, L4, L5> => {

  const { options: { finders, references, aggregations } } = definition;

  const find = async (
    finder: string,
    finderParams: Record<string, string | number | boolean | Date | Array<string | number | boolean | Date>>,
    locations?: LocKeyArray<L1, L2, L3, L4, L5> | [],

  ): Promise<V[]> => {
    const locationFilters = locations?.map(loc => `${loc.kt}=${loc.lk}`).join(', ') || 'none';
    logger.debug(
      `FIND operation called on ${models[0].name} with finder '${finder}' ` +
      `and ${locations?.length || 0} location filters: ${locationFilters}`
    );
    logger.default(`Find configured for ${models[0].name} using finder '${finder}' with ${Object.keys(finderParams).length} params`);

    // Validate location key order
    validateLocations(locations, definition.coordinate, 'find');

    // Note that we execute the createFinders function here because we want to make sure we're always getting the
    // most up to date methods.
    if (finders && finders[finder]) {
      const finderMethod = finders[finder];
      if (finderMethod) {
        logger.trace(`[FIND] Executing finder '${finder}' on ${models[0].name} with params: ${stringifyJSON(finderParams)}, locations: ${stringifyJSON(locations)}`);
        const results = await finderMethod(finderParams, locations);
        if (results && results.length > 0) {
          const processedResults = (await Promise.all(results.map(async (row: any) => {
            // Each found row gets its own context to prevent interference between concurrent processing
            const processedRow = await processRow(row, definition.coordinate.kta, references || [], aggregations || [], registry);
            return validateKeys(processedRow, definition.coordinate.kta);
          })) as V[]);

          logger.debug(`[FIND] Found ${processedResults.length} ${models[0].name} records using finder '${finder}'`);
          return processedResults;
        } else {
          logger.debug(`[FIND] Found 0 ${models[0].name} records using finder '${finder}'`);
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
