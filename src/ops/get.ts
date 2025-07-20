/* eslint-disable indent */
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
import * as Library from "@fjell/lib";
import { buildRelationshipPath } from "@/util/relationshipUtils";
import { contextManager } from "@/OperationContext";
import { stringifyJSON } from "@/util/general";

const logger = LibLogger.get('sequelize', 'ops', 'get');

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
  registry: Library.Registry
) => {

  const { coordinate, options: { references, aggregations } } = definition;
  const { kta } = coordinate;

  const get = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>
  ): Promise<V> => {
    if (!isValidItemKey(key)) {
      logger.error('Key for Get is not a valid ItemKey: %j', key);
      throw new Error('Key for Get is not a valid ItemKey');
    }

    logger.debug(`GET operation called on ${models[0].name} with ${isPriKey(key) ? `primary key: pk=${key.pk}` : `composite key: pk=${key.pk}, loc=[${(key as ComKey<S, L1, L2, L3, L4, L5>).loc.map((l: any) => `${l.kt}=${l.lk}`).join(', ')}]`}`);
    logger.default(`Get configured for ${models[0].name} with ${isPriKey(key) ? 'primary' : 'composite'} key`);

    const itemKey = key;

    // @ts-ignore
    const model = models[0];

    let item;

    if (isPriKey(itemKey)) {
      // This is the easy case because we can just find the item by its primary key
      logger.trace(`[GET] Executing ${model.name}.findByPk() with pk: ${(itemKey as PriKey<S>).pk}`);
      item = await model.findByPk((itemKey as PriKey<S>).pk);
    } else if (isComKey(itemKey)) {
      // This is a composite key, so we need to build a where clause based on the composite key's locators
      const comKey = itemKey as ComKey<S, L1, L2, L3, L4, L5>;
      const queryOptions = processCompositeKey(comKey, model, kta);

      logger.default('Composite key query', { queryOptions });
      logger.trace(`[GET] Executing ${model.name}.findOne() with options: ${stringifyJSON(queryOptions)}`);
      item = await model.findOne(queryOptions);
    }

    if (!item) {
      throw new NotFoundError<S, L1, L2, L3, L4, L5>('get', coordinate, key);
    } else {
      // Get the current context from context manager
      const context = contextManager.getCurrentContext();
      const result = validateKeys(await processRow(item, kta, references, aggregations, registry, context), kta) as V;

      logger.debug(`[GET] Retrieved ${model.name} with key: ${(result as any).key ? JSON.stringify((result as any).key) : `id=${item.id}`}`);
      return result;
    }
  }

  return get;
}
