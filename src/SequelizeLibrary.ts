
import * as Library from '@fjell/lib';
import { Coordinate, Item } from '@fjell/core';
import { Registry } from './Registry';
import { createOperations } from './Operations';
import { ModelStatic } from 'sequelize';
import { Options } from './Options';
import SequelizeLogger from './logger';

const logger = SequelizeLogger.get("SequelizeLibrary");

/**
 * The SequelizeLibrary interface extends the fjell-lib Library
 * and adds Sequelize-specific functionality:
 * - models: Array of Sequelize model classes for this library
 *
 * @template V - The type of the data model item, extending Item
 * @template S - The string literal type representing the model's key type
 * @template L1-L5 - Optional string literal types for location hierarchy levels
 */
export interface SequelizeLibrary<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Library<V, S, L1, L2, L3, L4, L5> {
  /** Array of Sequelize model classes associated with this library */
  models: ModelStatic<any>[];
}

/**
 * Creates a new SequelizeLibrary that extends the fjell-lib Library
 * with Sequelize-specific functionality
 */
export const createSequelizeLibrary = <
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
  ): SequelizeLibrary<V, S, L1, L2, L3, L4, L5> => {
  logger.debug("createSequelizeLibrary", { coordinate, models, registry, options });

  // Create Sequelize-specific operations
  const operations = createOperations<V, S, L1, L2, L3, L4, L5>(models, coordinate, registry, options);

  // Wrap operations with validation and hooks from base library
  const wrappedOperations = Library.wrapOperations(operations, options, coordinate, registry);

  // Create the base fjell-lib library
  const libLibrary = Library.createLibrary(registry, coordinate, wrappedOperations, options);

  return {
    ...libLibrary,
    models,
  };
}

/**
 * Type guard to check if an object is a SequelizeLibrary
 */
export const isSequelizeLibrary = (library: any): library is SequelizeLibrary<any, any, any, any, any, any, any> => {
  return library != null &&
    library.coordinate != null &&
    library.operations != null &&
    library.options != null &&
    library.registry != null &&
    library.models != null &&
    Array.isArray(library.models);
}
