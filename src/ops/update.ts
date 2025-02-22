import { abbrevIK, isComKey, ItemProperties } from "@fjell/core";

import { isPriKey } from "@fjell/core";

import { ComKey, Item, PriKey, TypesProperties } from "@fjell/core";

import { Definition } from "@/Definition";
import { populateEvents, removeEvents } from "@/EventCoordinator";
import { populateKey, removeKey } from "@/KeyMaster";
import LibLogger from '@/logger';
import { ModelStatic } from "sequelize";
import { NotFoundError } from "@fjell/lib";

const logger = LibLogger.get('sequelize', 'ops', 'update');

export const getUpdateOperation = <
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

  const update = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    const { coordinate } = definition;
    const { kta } = coordinate;

    logger.debug('update: %s, %j', abbrevIK(key), item);
    // Find the object we're updating
    // @ts-ignore
    const model = models[0];

    let response;

    if( isPriKey(key) ) {
    // Find the model by using the PK
      const priKey = key as PriKey<S>;
      response = await model.findByPk(priKey.pk);
    } else if( isComKey(key) ) {
      const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
      // Find the model by using both of the identifiers.
      response = await model.findOne({ where: {
        [comKey?.loc[0]?.kt + 'Id']: comKey?.loc[0]?.lk,
        id: comKey?.pk
      } });
    }

    if( response ) {
    
      // Remove the key and events
      let updateProps = removeKey(item)
      updateProps = removeEvents(item);

      // Update the object
      response = { ...response, ...updateProps };
      await response?.save();
    
      // Populate the key and events
      let returnItem = response?.get({ plain: true }) as ItemProperties<S, L1, L2, L3, L4, L5>;
      returnItem = populateKey(returnItem, kta);
      returnItem = populateEvents(returnItem);
      return returnItem as V;
    } else {
      throw new NotFoundError<S, L1, L2, L3, L4, L5>('update', coordinate, key);
    }

  }

  return update;
}