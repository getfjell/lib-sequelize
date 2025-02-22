import { validateKeys } from "@fjell/core";

import { buildQuery } from "@/QueryBuilder";

import { Definition } from "@/Definition";
import LibLogger from '@/logger';
import { processRow } from "@/RowProcessor";
import { Item, ItemQuery, LocKeyArray } from "@fjell/core";
import { Association, ModelStatic, Op } from "sequelize";

const logger = LibLogger.get('sequelize', 'ops', 'all');

export const getAllOperation = <
V extends Item<S, L1, L2, L3, L4, L5>,
S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never
>(models: ModelStatic<any>[], definition: Definition<V, S, L1, L2, L3, L4, L5>) => {

  const { coordinate } = definition;

  //#region Query
  const all = async (
    itemQuery: ItemQuery,
    locations?: LocKeyArray<L1, L2, L3, L4, L5> | [] | undefined,
    // eslint-disable-next-line max-params
  ): Promise<V[]> => {
    logger.default('All', { itemQuery, locations });
    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations || [];

    // SQ Libs don't support locations
    if( loc.length > 1 ) {
      throw new Error('Not implemented for more than one location key');
    }

    // We have the model here?
    // @ts-ignore
    const model = models[0];
    
    // We have the model here?
    const options = buildQuery(itemQuery, model);

    // If this has a location array, we need to add a where clause
    if( loc.length === 1 ) {
      const locKeyType = loc[0].kt;
      if( model.associations[locKeyType] ) {
        const association: Association<any, any> = model.associations[locKeyType];
        options.where = {
          ...options.where,
          [association.foreignKey]: {
            [Op.eq]: loc[0].lk
          }
        };
      } else {
        logger.error('Location key type not found in sequelize model association for: %s', locKeyType);
        throw new Error('Location key type not found in model');
      }
    }

    logger.default('Configured this Item Query', { itemQuery, options });

    const matchingItems = await model.findAll(options);

    // this.logger.default('Matching Items', { matchingItems });

    // TODO: Move this Up!
    return matchingItems.map((row: any) => validateKeys(processRow(row, coordinate.kta), coordinate.kta)) as V[];
  }

  return all;

}

