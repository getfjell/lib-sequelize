import {
  ComKey,
  isComKey,
  isPriKey,
  isValidItemKey,
  Item,
  PriKey,
  validateKeys
} from '@fjell/core';

import LibLogger from '@/logger';
import { ModelStatic } from 'sequelize';
import { processRow } from '@/RowProcessor';
import { Definition } from '@/Definition';
import { NotFoundError } from '@fjell/lib';

const logger = LibLogger.get('sequelize', 'ops', 'get');

export const getGetOperation = <
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
  ) => {

  const { coordinate } = definition;
  const { kta } = coordinate;

  const get = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    logger.default('Get', { key });
    if (!isValidItemKey(key)) {
      logger.error('Key for Get is not a valid ItemKey: %j', key);
      throw new Error('Key for Get is not a valid ItemKey');
    }

    const itemKey = key;

    // @ts-ignore
    const model = models[0];

    let item;

    if( isPriKey(itemKey) ) {
      item = await model.findByPk((itemKey as PriKey<S>).pk);
    } else if( isComKey(itemKey) ) {
      const comKey = itemKey as ComKey<S, L1, L2, L3, L4, L5>;
      // TODO: This should probably interrogate the model?
      item = await model.findOne({ where: { id: comKey.pk, [comKey?.loc[0]?.kt + 'Id']: comKey?.loc[0]?.lk } });
    }

    if (!item) {
      throw new NotFoundError<S, L1, L2, L3, L4, L5>('get', coordinate, key);
    } else {
      return validateKeys(processRow(item, kta), kta) as V;
    }
  }

  return get;
}