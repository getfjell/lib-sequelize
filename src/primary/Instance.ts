import { Instance as AbstractSequelizeInstance } from '@/Instance';
import { Item } from '@fjell/core';
import { Primary } from '@fjell/lib';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';
import { ModelStatic } from 'sequelize';
import { Options } from '@/Options';

import LibLogger from '@/logger';

const logger = LibLogger.get('lib-sequelize', 'primary', 'instance');

export interface Instance<
  V extends Item<S>,
  S extends string
> extends AbstractSequelizeInstance<V, S> {
  models: ModelStatic<any>[];
}

// eslint-disable-next-line max-params
export function createInstance<
  V extends Item<S>,
  S extends string
>(
  keyType: S,
  models: ModelStatic<any>[],
  libOptions: Options<V, S> = {},
  scopes: string[] = [],
): Instance<V, S> {
  logger.debug('createInstance', { keyType, models, libOptions, scopes });
  const definition = createDefinition([keyType], scopes, libOptions);

  const operations = createOperations(models, definition);

  return {
    definition,
    operations: Primary.wrapOperations(operations, definition),
    models
  } as Instance<V, S>;

}