
import { Item } from '@fjell/types';
import { Primary } from '@fjell/lib';
import * as Library from '@fjell/lib';
import { createOperations } from '../Operations';
import { ModelStatic } from 'sequelize';
import { createOptions, Options } from '../Options';
import { Registry } from '../Registry';
import { Coordinate, createCoordinate } from '../Coordinate';

import LibLogger from '../logger';

const logger = LibLogger.get('lib-sequelize', 'primary', 'library');

export interface SequelizeLibrary<
  V extends Item<S>,
  S extends string
> {
  coordinate: Coordinate<S>;
  registry: Registry;
  operations: Library.Operations<V, S>;
  options: Options<V, S>;
  models: ModelStatic<any>[];
}

export function createSequelizeLibrary<
  V extends Item<S>,
  S extends string
>(
  keyType: S,
  models: ModelStatic<any>[],
  libOptions: Partial<Options<V, S>> = {},
  scopes: string[] = [],
  registry: Registry
): SequelizeLibrary<V, S> {
  logger.debug('createSequelizeLibrary', { keyType, models, libOptions, scopes });

  // Create coordinate and options separately following new pattern
  const coordinate = createCoordinate([keyType], scopes);
  const options = createOptions(libOptions);

  // Create operations with the new signature
  const operations = createOperations<V, S>(models, coordinate as any, registry, options as any);

  // Wrap operations for primary pattern
  const wrappedOperations = Primary.wrapOperations(operations as any, options as any, coordinate as any, registry);

  return {
    coordinate,
    registry,
    operations: wrappedOperations,
    options,
    models,
  } as unknown as SequelizeLibrary<V, S>;
}
