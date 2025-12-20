
import { Item, ItemTypeArray } from '@fjell/types';
import { Contained } from '@fjell/lib';
import * as Library from '@fjell/lib';
import { createOperations } from '../Operations';
import { ModelStatic } from 'sequelize';
import { Registry } from '../Registry';
import { createOptions, Options } from '../Options';
import { Coordinate, createCoordinate } from '../Coordinate';

export interface SequelizeLibrary<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> {
  coordinate: Coordinate<S, L1, L2, L3, L4, L5>;
  registry: Registry;
  operations: Library.Operations<V, S, L1, L2, L3, L4, L5>;
  options: Options<V, S, L1, L2, L3, L4, L5>;
  models: ModelStatic<any>[];
}

export function createSequelizeLibrary<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  keyTypes: ItemTypeArray<S, L1, L2, L3, L4, L5>,
  models: ModelStatic<any>[],
  libOptions: Partial<Options<V, S, L1, L2, L3, L4, L5>> = {},
  scopes: string[] = [],
  registry: Registry
): SequelizeLibrary<V, S, L1, L2, L3, L4, L5> {

  // Create coordinate and options separately following new pattern
  const coordinate = createCoordinate(keyTypes, scopes);
  const options = createOptions(libOptions);

  // Create operations with the new signature
  const operations = createOperations<V, S, L1, L2, L3, L4, L5>(models, coordinate, registry, options);

  // Wrap operations for contained pattern
  const wrappedOperations = Contained.wrapOperations(operations, options as any, coordinate, registry);

  return {
    coordinate,
    registry,
    operations: wrappedOperations,
    options,
    models,
  } as unknown as SequelizeLibrary<V, S, L1, L2, L3, L4, L5>;
}
