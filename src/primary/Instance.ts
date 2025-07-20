
import { Instance as AbstractSequelizeInstance } from '@/Instance';
import { Item } from '@fjell/core';
import { Primary } from '@fjell/lib';
import { createOperations } from '@/Operations';
import { ModelStatic } from 'sequelize';
import { createOptions, Options } from '@/Options';
import { Registry } from '@/Registry';
import { createCoordinate } from '@/Coordinate';

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
  registry: Registry
): Instance<V, S> {
  logger.debug('createInstance', { keyType, models, libOptions, scopes });

  // Create coordinate and options separately following new pattern
  const coordinate = createCoordinate([keyType], scopes);
  const options = createOptions(libOptions);

  // Create operations with the new signature
  const operations = createOperations<V, S>(models, coordinate, registry, options);

  // Wrap operations for primary pattern
  const wrappedOperations = Primary.wrapOperations(operations, options as any, coordinate, registry);

  return {
    coordinate,
    registry,
    operations: wrappedOperations,
    options,
    models,
  } as Instance<V, S>;
}
