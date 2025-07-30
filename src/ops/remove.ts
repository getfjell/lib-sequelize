/* eslint-disable */
import { ComKey, isValidItemKey, PriKey } from "@fjell/core";

import { abbrevIK, isComKey, isPriKey, Item } from "@fjell/core";

import { Definition } from "../Definition";
import { populateEvents } from "../EventCoordinator";
import { addKey } from "../KeyMaster";
import LibLogger from '../logger';
import { ModelStatic } from "sequelize";
import { buildRelationshipPath } from "../util/relationshipUtils";
import { stringifyJSON } from "../util/general";

const logger = LibLogger.get('sequelize', 'ops', 'remove');

// Helper function to process composite key and build query options
const processCompositeKey = (
  comKey: ComKey<any, any, any, any, any, any>,
  model: ModelStatic<any>,
  kta: string[]
): { where: { [key: string]: any }; include?: any[] } => {
  const where: { [key: string]: any } = { id: comKey.pk };
  const includes: any[] = [];

  for (const locator of comKey.loc) {
    const relationshipInfo = buildRelationshipPath(model, locator.kt, kta);

    if (!relationshipInfo.found) {
      const errorMessage = `Composite key locator '${locator.kt}' cannot be resolved on model '${model.name}' or through its relationships.`;
      logger.error(errorMessage, { key: comKey, kta });
      throw new Error(errorMessage);
    }

    if (relationshipInfo.path) {
      // This requires a relationship traversal
      where[relationshipInfo.path] = locator.lk;
      if (relationshipInfo.includes) {
        includes.push(...relationshipInfo.includes);
      }
    } else {
      // This is a direct field
      const fieldName = `${locator.kt}Id`;
      where[fieldName] = locator.lk;
    }
  }

  const result: { where: { [key: string]: any }; include?: any[] } = { where };
  if (includes.length > 0) {
    result.include = includes;
  }

  return result;
};

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
  registry: import('@fjell/lib').Registry
) => {
  const { coordinate, options } = definition;
  const { kta } = coordinate;

  const remove = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    if (!isValidItemKey(key)) {
      logger.error('Key for Remove is not a valid ItemKey: %j', key);
      throw new Error('Key for Remove is not a valid ItemKey');
    }

    const keyDescription = isPriKey(key)
      ? `primary key: pk=${key.pk}`
      : `composite key: pk=${key.pk}, loc=[${(key as ComKey<S, L1, L2, L3, L4, L5>).loc.map((l: any) => `${l.kt}=${l.lk}`).join(', ')}]`;
    logger.debug(`REMOVE operation called on ${models[0].name} with ${keyDescription}`);
    logger.default(`Remove configured for ${models[0].name} with ${isPriKey(key) ? 'primary' : 'composite'} key`);

    // @ts-ignore
    const model = models[0];

    let item;
    let returnItem;

    logger.debug('remove: %s', abbrevIK(key));
    if (isPriKey(key)) {
      logger.debug(`[REMOVE] Executing ${model.name}.findByPk() with pk: ${(key as PriKey<S>).pk}`);
      item = await model.findByPk((key as PriKey<S>).pk);
    } else if (isComKey(key)) {
      // This is a composite key, so we need to build a where clause based on the composite key's locators
      const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
      const queryOptions = processCompositeKey(comKey, model, kta);

      logger.default(`Remove composite key query for ${model.name} with where fields: ${queryOptions.where ? Object.keys(queryOptions.where).join(', ') : 'none'}`);
      logger.debug(`[REMOVE] Executing ${model.name}.findOne() with options: ${stringifyJSON(queryOptions)}`);
      item = await model.findOne(queryOptions);
    }

    if (!item) {
      throw new Error(`Item not found for removal with key: ${abbrevIK(key)}`);
    }

    const isDeletedAttribute = model.getAttributes().isDeleted;
    const deletedAtAttribute = model.getAttributes().deletedAt;

    if (isDeletedAttribute || deletedAtAttribute) {
      if (model.getAttributes().isDeleted) {
        item.isDeleted = true;
      }

      if (model.getAttributes().deletedAt) {
        item.deletedAt = new Date();
      }

      // Save the object
      logger.debug(`[REMOVE] Executing ${model.name}.save() for soft delete`);
      await item?.save();
      returnItem = item?.get({ plain: true }) as Partial<Item<S, L1, L2, L3, L4, L5>>;
      returnItem = addKey(item, returnItem as any, kta);
      returnItem = populateEvents(returnItem);
    } else if (options.deleteOnRemove) {
      logger.debug(`[REMOVE] Executing ${model.name}.destroy() for hard delete`);
      await item?.destroy();
      returnItem = item?.get({ plain: true }) as Partial<Item<S, L1, L2, L3, L4, L5>>;
      returnItem = addKey(item, returnItem as any, kta);
      returnItem = populateEvents(returnItem);
    } else {
      throw new Error('No deletedAt or isDeleted attribute found in model, and deleteOnRemove is not set');
    }

    logger.debug(`[REMOVE] Removed ${model.name} with key: ${(returnItem as any).key ? JSON.stringify((returnItem as any).key) : `id=${item.id}`}`);
    return returnItem as V;
  }

  return remove;
}
