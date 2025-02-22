import { ItemTypeArray } from '@fjell/core';
import * as Library from '@fjell/lib';

export const SCOPE_SEQUELIZE = 'sequelize';

export const createCoordinate = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(kta: ItemTypeArray<S, L1, L2, L3, L4, L5>, scopes?: string[]) => {
  const coordinate = Library.createCoordinate(kta,[SCOPE_SEQUELIZE, ...(scopes || [])])
  return coordinate;
};
