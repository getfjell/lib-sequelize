/* eslint-disable indent */
import {
  AllItemTypeArrays,
  Item,
  ItemProperties
} from '@fjell/core';

import LibLogger from '@/logger';
import { Model, ModelStatic } from 'sequelize';
import { buildRelationshipPath } from '@/util/relationshipUtils';

const logger = LibLogger.get('sequelize', 'KeyMaster');

// Helper function to extract location key value from item
const extractLocationKeyValue = (
  model: ModelStatic<any>,
  item: any,
  locatorType: string,
  kta: string[]
): any => {
  logger.default('Extracting location key value', { locatorType, kta });

  const relationshipInfo = buildRelationshipPath(model, locatorType, kta, true);

  if (!relationshipInfo.found) {
    throw new Error(`Location key '${locatorType}' cannot be resolved on model '${model.name}' or through its relationships.`);
  }

  if (relationshipInfo.isDirect) {
    // Direct foreign key field
    const foreignKeyField = `${locatorType}Id`;
    const value = item[foreignKeyField];
    if (typeof value === 'undefined' || value === null) {
      throw new Error(`Direct foreign key field '${foreignKeyField}' is missing or null in item`);
    }
    return value;
  } else {
    // Need to traverse relationship
    // Try to get the value from the loaded relationship object
    const relationshipObject = item[locatorType];
    if (relationshipObject && typeof relationshipObject.id !== 'undefined') {
      return relationshipObject.id;
    }

    // If the relationship object isn't loaded, we might need to look at the foreign key field
    // This handles cases where we have the foreign key but not the full object
    const foreignKeyField = `${locatorType}Id`;
    if (typeof item[foreignKeyField] !== 'undefined' && item[foreignKeyField] !== null) {
      return item[foreignKeyField];
    }

    throw new Error(`Unable to extract location key for '${locatorType}'. Neither the relationship object nor direct foreign key is available.`);
  }
};

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
  model: Model<any, any>,
  item: Partial<Item<S, L1, L2, L3, L4, L5>>,
  keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>
): Item<S, L1, L2, L3, L4, L5> => {
  logger.default('Adding Key', { item });
  const key = {};
  const modelClass = model.constructor as ModelStatic<any>;
  const primaryKeyAttr = modelClass.primaryKeyAttribute;

  if (Array.isArray(keyTypes) && keyTypes.length > 1) {
    const type = [...keyTypes];
    const pkType = type.shift();
    Object.assign(key, { kt: pkType, pk: item[primaryKeyAttr] });

    // Build location keys for composite key
    const locationKeys = [];
    for (const locatorType of type) {
      try {
        const lk = extractLocationKeyValue(modelClass, item, locatorType, keyTypes as string[]);
        locationKeys.push({ kt: locatorType, lk });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to extract location key for '${locatorType}'`, { error: errorMessage, item, keyTypes });
        throw error;
      }
    }

    Object.assign(key, { loc: locationKeys });
  } else {
    Object.assign(key, { kt: keyTypes[0], pk: item[primaryKeyAttr] });
  }
  Object.assign(item, { key });
  return item as Item<S, L1, L2, L3, L4, L5>;
};
