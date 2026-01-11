
import { Item } from '@fjell/types';
import { Primary } from '@fjell/lib';
import * as Library from '@fjell/lib';
import { createOperations } from '../Operations';
import { ModelStatic } from 'sequelize';
import { createOptions, Options } from '../Options';
import { Registry } from '../Registry';
import { Coordinate, createCoordinate } from '../Coordinate';
import {
  hasHooksDefined,
  SequelizeWrapperConfig,
  wrapSequelizeModels
} from '../util/SequelizeInstanceWrapper';

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

  // Check if hooks are defined and if we should wrap models
  const hasHooks = hasHooksDefined(options);
  const directSaveBehavior = options.directSaveBehavior || 'warn-and-throw';
  
  // Wrap models if hooks are defined to prevent direct save()/update() calls
  let wrappedModels = models;
  if (hasHooks) {
    const wrapperConfig: SequelizeWrapperConfig = {
      directSaveBehavior,
      itemType: keyType,
      hasHooks: true
    };
    wrappedModels = wrapSequelizeModels(models, wrapperConfig);
    logger.debug("Wrapped Sequelize models to prevent direct save()/update() calls", {
      itemType: keyType,
      directSaveBehavior,
      modelCount: models.length
    });
  }

  // Create operations with the new signature (use original models for internal operations)
  const operations = createOperations<V, S>(models, coordinate as any, registry, options as any);

  // Wrap operations for primary pattern
  const wrappedOperations = Primary.wrapOperations(operations as any, options as any, coordinate as any, registry);

  return {
    coordinate,
    registry,
    operations: wrappedOperations,
    options,
    models: wrappedModels, // Expose wrapped models
  } as unknown as SequelizeLibrary<V, S>;
}
