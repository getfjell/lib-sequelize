/* eslint-disable max-params */
import { Instance as AbstractSequelizeInstance } from '@/Instance';
import { Item } from '@fjell/core';
import { Primary } from '@fjell/lib';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';
import { ModelStatic } from 'sequelize';
import { Options } from '@/Options';
import * as Library from "@fjell/lib";

import LibLogger from '@/logger';

const logger = LibLogger.get('lib-sequelize', 'primary', 'instance');

export interface Instance<
  V extends Item<S>,
  S extends string
> extends AbstractSequelizeInstance<V, S> {
  models: ModelStatic<any>[];
}

export function createInstance<
  V extends Item<S>,
  S extends string
>(
  keyType: S,
  models: ModelStatic<any>[],
  libOptions: Partial<Options<V, S>> = {},
  scopes: string[] = [],
  registry: Library.Registry
): Instance<V, S> {
  logger.debug('createInstance', { keyType, models, libOptions, scopes });
  const definition = createDefinition([keyType], scopes, libOptions);

  const operations = createOperations(models, definition, registry);

  return {
    definition,
    operations: Primary.wrapOperations(operations, definition, registry),
    models,
    registry
  } as Instance<V, S>;

}