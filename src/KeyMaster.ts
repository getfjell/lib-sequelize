/* eslint-disable indent */
import {
  AllItemTypeArrays,
  Item,
  ItemProperties
} from '@fjell/core';

import LibLogger from '@/logger';

const logger = LibLogger.get('sequelize', 'KeyMaster');

export const removeKey = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  item: ItemProperties<S, L1, L2, L3, L4, L5>
): ItemProperties<S, L1, L2, L3, L4, L5> => {
  logger.default('Removing Key', { item });
  delete item.key;
  return item;
}

// export const populateKey = <
//   S extends string,
//   L1 extends string = never,
//   L2 extends string = never,
//   L3 extends string = never,
//   L4 extends string = never,
//   L5 extends string = never
// >(
//   item: ItemProperties<S, L1, L2, L3, L4, L5>,
//   keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>
// ): ItemProperties<S, L1, L2, L3, L4, L5> => {
//   if (keyTypes.length === 1) {
//     item.key = { kt: keyTypes[0], pk: item.id };
//     delete item.id;
//   } else if (keyTypes.length === 2) {
//     item.key = {
//       kt: keyTypes[0], pk: item.id,
//       // TODO: Shouldn't this be inspecting the model to get the primary key type?
//       loc: [{ kt: keyTypes[1], lk: item[keyTypes[1] + 'Id'] }],
//     };
//     delete item.id;
//     delete item[keyTypes[1] + 'Id'];
//   } else {
//     throw new Error('Not implemented');
//   }
//   return item;
// }

export const addKey = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  item: Partial<Item<S, L1, L2, L3, L4, L5>>,
  keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>
): Item<S, L1, L2, L3, L4, L5> => {
  logger.default('Adding Key', { item });
  const key = {};
  if (Array.isArray(keyTypes) && keyTypes.length > 1) {
    const type = [...keyTypes];
    const pkType = type.shift();
    Object.assign(key, { kt: pkType, pk: item.id });
    // TODO: This is really just for primary items
    if (type.length === 1) {
      // TODO: This should be looking at the model to get the primary key of the reference item or association
      const locKeyTypeId = type[0] + 'Id';
      Object.assign(key, { loc: [{ kt: type[0], lk: item[locKeyTypeId] }] });
    } else if (type.length === 2) {
      throw new Error('Not implemented');
    } else if (type.length === 3) {
      throw new Error('Not implemented');
    } else if (type.length === 4) {
      throw new Error('Not implemented');
    } else if (type.length === 5) {
      throw new Error('Not implemented');
    }
  } else {
    Object.assign(key, { kt: keyTypes[0], pk: item.id });
  }
  Object.assign(item, { key });
  return item as Item<S, L1, L2, L3, L4, L5>;
};
