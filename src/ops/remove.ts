import { ComKey, isValidItemKey, PriKey } from "@fjell/core";

import { abbrevIK, isComKey, isPriKey, Item, ItemProperties } from "@fjell/core";

import { Definition } from "@/Definition";
import { populateEvents } from "@/EventCoordinator";
import { populateKey } from "@/KeyMaster";
import LibLogger from '@/logger';
import { ModelStatic } from "sequelize";

const logger = LibLogger.get('sequelize', 'ops', 'remove');

export const getRemoveOperation = <
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
  const { coordinate, options } = definition;
  const { kta } = coordinate;

  const remove = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    logger.default('Remove', { key });

    if (!isValidItemKey(key)) {
      logger.error('Key for Remove is not a valid ItemKey: %j', key);
      throw new Error('Key for Remove is not a valid ItemKey');
    }

    // @ts-ignore
    const model = models[0];

    let item;
    let returnItem;

    logger.debug('remove: %s', abbrevIK(key));
    if( isPriKey(key) ) {
      item = await model.findByPk((key as PriKey<S>).pk);
    } else if( isComKey(key) ) {
      const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
      item = await model.findOne({ where: { id: comKey.pk, [comKey?.loc[0]?.kt + 'Id']: comKey?.loc[0]?.lk } });
    }

    const isDeletedAttribute = model.getAttributes().isDeleted;
    const deletedAtAttribute = model.getAttributes().deletedAt;

    if( isDeletedAttribute || deletedAtAttribute ) {
      if( model.getAttributes().isDeleted ) {
        item.isDeleted = true;
      }
    
      if( model.getAttributes().deletedAt ) {
        item.deletedAt = new Date();
      }

      // Save the object
      await item?.save();
      returnItem = item?.get({ plain: true }) as ItemProperties<S, L1, L2, L3, L4, L5>;
      returnItem = populateKey(returnItem, kta);
      returnItem = populateEvents(returnItem);
    } else if( options.deleteOnRemove ) {
      await item?.destroy();
      returnItem = item?.get({ plain: true }) as ItemProperties<S, L1, L2, L3, L4, L5>;
      returnItem = populateKey(returnItem, kta);
      returnItem = populateEvents(returnItem);
    } else {
      throw new Error('No deletedAt or isDeleted attribute found in model, and deleteOnRemove is not set');
    }
    return returnItem as V;
  }

  return remove;
}