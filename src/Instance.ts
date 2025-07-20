
import * as Library from '@fjell/lib';
import { Item } from '@fjell/core';
import { Coordinate } from '@fjell/registry';
import { Registry } from './Registry';
import { createOperations } from './Operations';
import { ModelStatic } from 'sequelize';
import { Options } from './Options';
import SequelizeLogger from './logger';

const logger = SequelizeLogger.get("Instance");

/**
 * The Sequelize Instance interface extends the fjell-lib Instance
 * and adds Sequelize-specific functionality:
 * - models: Array of Sequelize model classes for this instance
 *
 * @template V - The type of the data model item, extending Item
 * @template S - The string literal type representing the model's key type
 * @template L1-L5 - Optional string literal types for location hierarchy levels
 */
export interface Instance<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Instance<V, S, L1, L2, L3, L4, L5> {
  /** Array of Sequelize model classes associated with this instance */
  models: ModelStatic<any>[];
}

/**
 * Creates a new Sequelize instance that extends the fjell-lib instance
 * with Sequelize-specific functionality
 */
export const createInstance = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
    registry: Registry,
    coordinate: Coordinate<S, L1, L2, L3, L4, L5>,
    models: ModelStatic<any>[],
    options: Options<V, S, L1, L2, L3, L4, L5>
  ): Instance<V, S, L1, L2, L3, L4, L5> => {
  logger.debug("createInstance", { coordinate, models, registry, options });

  // Create Sequelize-specific operations
  const operations = createOperations<V, S, L1, L2, L3, L4, L5>(models, coordinate, registry, options);

  // Create the base fjell-lib instance
  const libInstance = Library.createInstance(registry, coordinate, operations, options);

  return {
    ...libInstance,
    models,
  };
}

/**
 * Type guard to check if an object is a Sequelize Instance
 */
export const isInstance = (instance: any): instance is Instance<any, any, any, any, any, any, any> => {
  return instance != null &&
    instance.coordinate != null &&
    instance.operations != null &&
    instance.options != null &&
    instance.registry != null &&
    instance.models != null &&
    Array.isArray(instance.models);
}
