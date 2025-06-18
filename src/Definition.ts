import {
  Item,
  ItemTypeArray
} from '@fjell/core';

import * as Library from '@fjell/lib';
import { createCoordinate } from './Coordinate';
import { createOptions } from './Options';
import { Options } from './Options';
import LibLogger from './logger';

const logger = LibLogger.get('lib-sequelize', 'Definition');

export interface Definition<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Definition<V, S, L1, L2, L3, L4, L5> {
  options: Options<V, S, L1, L2, L3, L4, L5>;
}

export function createDefinition<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  kta: ItemTypeArray<S, L1, L2, L3, L4, L5>,
  scopes: string[],
  libOptions?: Partial<Options<V, S, L1, L2, L3, L4, L5>>,
): Definition<V, S, L1, L2, L3, L4, L5> {
  logger.debug('createDefinition', { kta, scopes, libOptions });
  const coordinate = createCoordinate(kta, scopes);
  const options = createOptions(libOptions);

  const definition = Library.createDefinition(coordinate, options);

  return {
    ...definition,
    options,
  }
}
