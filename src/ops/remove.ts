/* eslint-disable indent */
import { ComKey, isValidItemKey, PriKey } from "@fjell/core";

import { abbrevIK, isComKey, isPriKey, Item } from "@fjell/core";

import { Definition } from "@/Definition";
import { populateEvents } from "@/EventCoordinator";
import { addKey } from "@/KeyMaster";
import LibLogger from '@/logger';
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { buildRelationshipPath } from "@/util/relationshipUtils";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registry: Library.Registry
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
    if (isPriKey(key)) {
      item = await model.findByPk((key as PriKey<S>).pk);
    } else if (isComKey(key)) {
      // This is a composite key, so we need to build a where clause based on the composite key's locators
      const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
      const queryOptions = processCompositeKey(comKey, model, kta);

      logger.default('Composite key query', { queryOptions });
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
      await item?.save();
      returnItem = item?.get({ plain: true }) as Partial<Item<S, L1, L2, L3, L4, L5>>;
      returnItem = addKey(item, returnItem as any, kta);
      returnItem = populateEvents(returnItem);
    } else if (options.deleteOnRemove) {
      await item?.destroy();
      returnItem = item?.get({ plain: true }) as Partial<Item<S, L1, L2, L3, L4, L5>>;
      returnItem = addKey(item, returnItem as any, kta);
      returnItem = populateEvents(returnItem);
    } else {
      throw new Error('No deletedAt or isDeleted attribute found in model, and deleteOnRemove is not set');
    }
    return returnItem as V;
  }

  return remove;
}
