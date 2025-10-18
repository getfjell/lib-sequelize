import { Item, Coordinate } from "@fjell/core";
import { Options } from "./Options";
import { Registry as LocalRegistry } from "./Registry";
import { InstanceFactory as BaseInstanceFactory, Registry as BaseRegistry, RegistryHub } from "@fjell/registry";
import { createSequelizeLibrary, SequelizeLibrary } from "./SequelizeLibrary";
import { ModelStatic } from "sequelize";
import SequelizeLogger from "./logger";

const logger = SequelizeLogger.get("InstanceFactory");

/**
 * Sequelize Library Factory type that extends the base factory
 * to include Sequelize-specific models parameter
 */
export type SequelizeLibraryFactory<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> = (
  models: ModelStatic<any>[],
  options: Options<V, S, L1, L2, L3, L4, L5>
) => BaseInstanceFactory<S, L1, L2, L3, L4, L5>;

/**
 * Factory function for creating Sequelize libraries
 * This extends the fjell-lib pattern by adding Sequelize-specific models
 */
export const createSequelizeLibraryFactory = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
    models: ModelStatic<any>[],
    options: Options<V, S, L1, L2, L3, L4, L5>
  ): BaseInstanceFactory<S, L1, L2, L3, L4, L5> => {
  return (coordinate: Coordinate<S, L1, L2, L3, L4, L5>, context: { registry: BaseRegistry, registryHub?: RegistryHub }) => {
    logger.debug("Creating Sequelize instance", {
      coordinate,
      registry: context.registry,
      models: models.map(m => m.name),
      options
    });

    return createSequelizeLibrary<V, S, L1, L2, L3, L4, L5>(
      context.registry as LocalRegistry,
      coordinate,
      models,
      options
    ) as SequelizeLibrary<V, S, L1, L2, L3, L4, L5>;
  };
};
