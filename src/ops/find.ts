/* eslint-disable indent */
import { FindMethod, FindOperationResult, FindOptions, Item, LocKeyArray } from "@fjell/types";
import { createFindWrapper } from "@fjell/core";
import { validateKeys } from "@fjell/validation";

import { Definition } from "../Definition";
import { processRow } from "../RowProcessor";
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { stringifyJSON } from "../util/general";
import { transformSequelizeError } from "../errors/sequelizeErrorHandler";
import LibLogger from '../logger';

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

  return createFindWrapper(
    definition.coordinate,
    async (
      finder: string,
      finderParams?: Record<string, string | number | boolean | Date | Array<string | number | boolean | Date>>,
      locations?: LocKeyArray<L1, L2, L3, L4, L5> | [],
      findOptions?: FindOptions
    ): Promise<FindOperationResult<V>> => {
      try {
        const locs = locations ?? [];
        const params = finderParams ?? {};
        const locationFilters = locs.map(loc => `${loc.kt}=${loc.lk}`).join(', ') || 'none';
        logger.debug(
          `FIND operation called on ${models[0].name} with finder '${finder}' ` +
          `and ${locs.length} location filters: ${locationFilters}`
        );
        logger.default(`Find configured for ${models[0].name} using finder '${finder}' with ${Object.keys(params).length} params`);

        // Note that we execute the createFinders function here because we want to make sure we're always getting the
        // most up to date methods.
        if (!finders || !finders[finder]) {
          const availableFinders = finders ? Object.keys(finders) : [];
          logger.error(`No finders defined for library`, {
            operation: 'find',
            model: models[0]?.name,
            requestedFinder: finder,
            availableFinders,
            suggestion: availableFinders.length > 0
              ? `Use one of the available finders: ${availableFinders.join(', ')}`
              : 'Define finders in your library configuration',
            coordinate: JSON.stringify(definition.coordinate)
          });
          throw new Error(`No finders found. ${availableFinders.length > 0 ? `Available finders: ${availableFinders.join(', ')}` : 'No finders defined.'}`);
        }

        const finderMethod = finders[finder];
        if (!finderMethod) {
          const availableFinders = Object.keys(finders);
          logger.error(`Finder not found`, {
            operation: 'find',
            model: models[0]?.name,
            requestedFinder: finder,
            availableFinders,
            suggestion: `Use one of: ${availableFinders.join(', ')}`,
            coordinate: JSON.stringify(definition.coordinate)
          });
          throw new Error(`Finder '${finder}' not found. Available finders: ${availableFinders.join(', ')}`);
        }

        logger.trace(`[FIND] Executing finder '${finder}' on ${models[0].name} with params: ${stringifyJSON(params)}, locations: ${stringifyJSON(locs)}, options: ${stringifyJSON(findOptions)}`);
            // Pass findOptions to finder - finder can opt-in by returning FindOperationResult, or return V[] for legacy behavior
            const finderResult = await finderMethod(params, locs, findOptions);

            // Helper function to process items
            const processItems = async (items: any[]): Promise<V[]> => {
              return (await Promise.all(items.map(async (row: any) => {
                // For finders, we don't control the query, so we pass void 0 for includedAggregations
                // The custom finder might have already loaded associations via INCLUDE
                const processedRow = await processRow(row, definition.coordinate.kta, references || [], aggregations || [], registry, void 0, void 0);
                return validateKeys(processedRow, definition.coordinate.kta);
              })) as V[]);
            };

            // Check if finder opted-in (returned FindOperationResult) or legacy (returned V[])
            const isOptInResult = finderResult && typeof finderResult === 'object' && 'items' in finderResult && 'metadata' in finderResult;

            if (isOptInResult) {
              // Finder opted-in: process items and return FindOperationResult
              const optInResult = finderResult as FindOperationResult<any>;
          const processedResults = optInResult.items && optInResult.items.length > 0
            ? await processItems(optInResult.items)
            : [];

          logger.debug(`[FIND] Finder opted-in, found ${processedResults.length} ${models[0].name} records using finder '${finder}' (total: ${optInResult.metadata.total})`);
          return {
            items: processedResults,
            metadata: optInResult.metadata
          };
        }

        // Legacy finder: process results as array
        const results = finderResult as V[];
        const processedResults = results && results.length > 0
          ? await processItems(results)
          : [];

                logger.debug(`[FIND] Legacy finder, found ${processedResults.length} ${models[0].name} records using finder '${finder}'`);
                // Return as FindOperationResult - createFindWrapper will apply post-processing pagination
        return {
          items: processedResults,
          metadata: {
            total: processedResults.length,
            returned: processedResults.length,
            offset: 0,
            hasMore: false
          }
        };
      } catch (error: any) {
        // Enhanced error logging before transforming
        logger.error('Error in find operation', {
          finder,
          finderParams: finderParams,
          locations: locations,
          findOptions,
          errorMessage: error?.message,
          errorName: error?.name,
          errorStack: error?.stack,
          errorCause: error?.cause,
          errorString: String(error),
          errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        console.error('ERROR in SequelizeLibrary find:', {
          finder,
          error: error?.message || String(error),
          stack: error?.stack
        });
        // Transform database errors
        throw transformSequelizeError(error, definition.coordinate.kta[0]);
      }
    }
  );
}
