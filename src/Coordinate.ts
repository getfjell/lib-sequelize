import { Coordinate, createCoordinate as createBaseCoordinate, ItemTypeArray } from '@fjell/core';
import LibLogger from './logger';

const logger = LibLogger.get('Coordinate');

export const SCOPE_SEQUELIZE = 'sequelize';

export const createCoordinate = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(kta: ItemTypeArray<S, L1, L2, L3, L4, L5>, scopes?: string[]): Coordinate<S, L1, L2, L3, L4, L5> => {
  logger.debug('createCoordinate', { kta, scopes });
  const coordinate = createBaseCoordinate(kta, [SCOPE_SEQUELIZE, ...(scopes || [])]);
  return coordinate;
};

// Re-export the Coordinate type
export type { Coordinate } from '@fjell/core';
