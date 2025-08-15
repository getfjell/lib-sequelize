/* eslint-disable indent */
import { ComKey, isComKey, isPriKey, Item, LocKeyArray, PriKey, validateKeys } from "@fjell/core";

import { Definition } from "../Definition";
import LibLogger from '../logger';
import { processRow } from "../RowProcessor";
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { extractEvents, removeEvents } from "../EventCoordinator";
import { buildRelationshipChain, buildRelationshipPath } from "../util/relationshipUtils";
import { stringifyJSON } from "../util/general";

const logger = LibLogger.get('sequelize', 'ops', 'create');

// Helper function to translate PostgreSQL errors to meaningful messages
function translateDatabaseError(error: any, itemData: any, modelName: string): Error {
  const originalMessage = error.message || '';
  const errorCode = error.original?.code;
  const constraint = error.original?.constraint;
  const detail = error.original?.detail;

  logger.error('Database error during create operation', {
    errorCode,
    constraint,
    detail,
    originalMessage,
    modelName,
    itemData: JSON.stringify(itemData, null, 2)
  });

  // Handle specific PostgreSQL error codes
  switch (errorCode) {
    case '23505': // unique_violation
      if (constraint) {
        return new Error(`Duplicate value violates unique constraint '${constraint}'. ${detail || ''}`);
      }
      return new Error(`Duplicate value detected. This record already exists. ${detail || ''}`);

    case '23503': // foreign_key_violation
      if (constraint) {
        return new Error(`Foreign key constraint '${constraint}' violated. Referenced record does not exist. ${detail || ''}`);
      }
      return new Error(`Referenced record does not exist. Check that all related records are valid. ${detail || ''}`);

    case '23502': // not_null_violation
      const column = error.original?.column;
      if (column) {
        return new Error(`Required field '${column}' cannot be null`);
      }
      return new Error(`Required field is missing or null`);

    case '23514': // check_violation
      if (constraint) {
        return new Error(`Check constraint '${constraint}' violated. ${detail || ''}`);
      }
      return new Error(`Data validation failed. Check constraint violated. ${detail || ''}`);

    case '22001': // string_data_right_truncation
      return new Error(`Data too long for field. Check string lengths. ${detail || ''}`);

    case '22003': // numeric_value_out_of_range
      return new Error(`Numeric value out of range. Check number values. ${detail || ''}`);

    case '42703': // undefined_column
      const undefinedColumn = error.original?.column;
      if (undefinedColumn) {
        return new Error(`Column '${undefinedColumn}' does not exist in table '${modelName}'`);
      }
      return new Error(`Referenced column does not exist`);

    case '42P01': // undefined_table
      return new Error(`Table '${modelName}' does not exist`);

    default:
      // Handle SQLite-specific errors that don't have error codes
      if (originalMessage.includes('notNull Violation')) {
        const fieldMatches = originalMessage.match(/([a-zA-Z]+\.[a-zA-Z]+) cannot be null/g);
        if (fieldMatches) {
          const fields = fieldMatches.map(match => {
            const parts = match.split('.');
            return parts[1]?.split(' ')[0]; // Extract field name like 'code' from 'WidgetType.code'
          }).filter(Boolean);
          if (fields.length > 0) {
            return new Error(`Required field${fields.length > 1 ? 's' : ''} ${fields.join(', ')} cannot be null`);
          }
        }
        return new Error('Required fields are missing');
      }

      // For unknown errors, provide the original message with context
      return new Error(`Database error in ${modelName}.create(): ${originalMessage}. Item data: ${JSON.stringify(itemData, null, 2)}`);
  }
}

// Helper function to validate hierarchical chain exists
async function validateHierarchicalChain(
  models: ModelStatic<any>[],
  locKey: { kt: string; lk: any },
  kta: string[]
): Promise<void> {
  try {
    // Find the direct parent model that contains this locator
    const locatorIndex = kta.indexOf(locKey.kt);
    if (locatorIndex === -1) {
      throw new Error(`Locator type '${locKey.kt}' not found in kta array`);
    }

    // Get the model for this locator
    const locatorModel = models[locatorIndex] || models[0]; // Fallback to primary model

    // Build a query to validate the chain exists
    const chainResult = buildRelationshipChain(locatorModel, kta, locatorIndex, kta.length - 1);

    if (!chainResult.success) {
      // If we can't build a chain, just validate the record exists
      const record = await locatorModel.findByPk(locKey.lk);
      if (!record) {
        throw new Error(`Referenced ${locKey.kt} with id ${locKey.lk} does not exist`);
      }
      return;
    }

    // Validate that the chain exists
    const queryOptions: any = {
      where: { id: locKey.lk }
    };

    if (chainResult.includes && chainResult.includes.length > 0) {
      queryOptions.include = chainResult.includes;
    }

    const record = await locatorModel.findOne(queryOptions);
    if (!record) {
      throw new Error(`Referenced ${locKey.kt} with id ${locKey.lk} does not exist or chain is invalid`);
    }
  } catch (error: any) {
    // Add context to validation errors
    if (error.original) {
      throw translateDatabaseError(error, { locKey, kta }, locKey.kt);
    }
    throw error;
  }
}

export const getCreateOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  models: ModelStatic<any>[],
  definition: Definition<V, S, L1, L2, L3, L4, L5>,

  registry: Library.Registry
) => {

  const create = async (
    item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    options?: {
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      locations?: never;
    } | {
      key?: never;
      locations: LocKeyArray<L1, L2, L3, L4, L5>,
    },
  ): Promise<V> => {
    const constraints = options?.key
      ? `key: pk=${options.key.pk}, loc=[${isComKey(options.key)
        ? (options.key as ComKey<S, L1, L2, L3, L4, L5>).loc.map((l: any) => `${l.kt}=${l.lk}`).join(', ')
        : ''}]`
      : options?.locations
        ? `locations: ${options.locations.map(loc => `${loc.kt}=${loc.lk}`).join(', ')}`
        : 'no constraints';
    logger.debug(`CREATE operation called on ${models[0].name} with ${constraints}`);
    logger.default(`Create configured for ${models[0].name} with ${Object.keys(item).length} item fields`);

    const { coordinate, options: { references, aggregations } } = definition;
    const { kta } = coordinate;

    // Get the primary model (first model in array)
    const model = models[0];
    const modelAttributes = model.getAttributes();

    // Validate that all item attributes exist on the model
    let itemData = { ...item } as any;

    // TODO: We need the opposite of processRow, something to step down from fjell to database.
    itemData = extractEvents(itemData);
    itemData = removeEvents(itemData);

    // Validate that all item attributes exist on the model
    const invalidAttributes: string[] = [];
    for (const key of Object.keys(itemData)) {
      if (!modelAttributes[key]) {
        invalidAttributes.push(key);
      }
    }

    if (invalidAttributes.length > 0) {
      const availableAttributes = Object.keys(modelAttributes).join(', ');
      throw new Error(
        `Invalid attributes for model '${model.name}': [${invalidAttributes.join(', ')}]. ` +
        `Available attributes: [${availableAttributes}]. ` +
        `Item data: ${JSON.stringify(itemData, null, 2)}`
      );
    }

    // Handle key options
    // If a key is supplied, assume its contents are to be assigned to the appropriate ids.
    // For most cases this will be null as key generation is often through autoIncrement.
    // If this is a CItem then the locations will be present.
    if (options?.key) {
      const key = options.key;
      if (isPriKey(key)) {
        // Set the primary key
        itemData.id = key.pk;
      } else if (isComKey(key)) {
        // Set primary key
        itemData.id = key.pk;

        // Process location keys - only set direct foreign keys, validate hierarchical chains
        const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
        const directLocations: Array<{ kt: string; lk: any }> = [];
        const hierarchicalLocations: Array<{ kt: string; lk: any }> = [];

        // Categorize location keys as direct or hierarchical
        for (const locKey of comKey.loc) {
          const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta, true);

          if (!relationshipInfo.found) {
            const associations = model.associations ? Object.keys(model.associations) : [];
            const errorMessage = `Composite key locator '${locKey.kt}' cannot be resolved on model '${model.name}' or through its relationships. ` +
              `Available associations: [${associations.join(', ')}]. ` +
              `KTA: [${kta.join(', ')}]. ` +
              `Composite key: ${JSON.stringify(comKey, null, 2)}`;
            logger.error(errorMessage, { key: comKey, kta, associations });
            throw new Error(errorMessage);
          }

          if (relationshipInfo.isDirect) {
            directLocations.push(locKey);
          } else {
            hierarchicalLocations.push(locKey);
          }
        }

        // Set direct foreign keys
        for (const locKey of directLocations) {
          if (locKey.lk == null || locKey.lk === '') {
            logger.error(`Composite key location '${locKey.kt}' has undefined/null lk value`, { locKey, key: comKey });
            throw new Error(`Composite key location '${locKey.kt}' has undefined/null lk value`);
          }
          const foreignKeyField = locKey.kt + 'Id';
          itemData[foreignKeyField] = locKey.lk;
        }

        // Validate hierarchical chains exist
        for (const locKey of hierarchicalLocations) {
          await validateHierarchicalChain(models, locKey, kta);
        }
      }
    }

    // Handle locations options
    // This is the most frequent way relationship ids will be set
    if (options?.locations) {
      const directLocations: Array<{ kt: string; lk: any }> = [];
      const hierarchicalLocations: Array<{ kt: string; lk: any }> = [];

      // Categorize location keys as direct or hierarchical
      for (const locKey of options.locations) {
        const relationshipInfo = buildRelationshipPath(model, locKey.kt, kta, true);

        if (!relationshipInfo.found) {
          const associations = model.associations ? Object.keys(model.associations) : [];
          const errorMessage = `Location key '${locKey.kt}' cannot be resolved on model '${model.name}' or through its relationships. ` +
            `Available associations: [${associations.join(', ')}]. ` +
            `KTA: [${kta.join(', ')}]. ` +
            `Locations: ${JSON.stringify(options.locations, null, 2)}`;
          logger.error(errorMessage, { locations: options.locations, kta, associations });
          throw new Error(errorMessage);
        }

        if (relationshipInfo.isDirect) {
          directLocations.push(locKey);
        } else {
          hierarchicalLocations.push(locKey);
        }
      }

      // Set direct foreign keys
      for (const locKey of directLocations) {
        if (locKey.lk == null || locKey.lk === '') {
          logger.error(`Location option '${locKey.kt}' has undefined/null lk value`, { locKey, locations: options.locations });
          throw new Error(`Location option '${locKey.kt}' has undefined/null lk value`);
        }
        const foreignKeyField = locKey.kt + 'Id';
        itemData[foreignKeyField] = locKey.lk;
      }

      // Validate hierarchical chains exist
      for (const locKey of hierarchicalLocations) {
        await validateHierarchicalChain(models, locKey, kta);
      }
    }

    // Create the record
    try {
      logger.trace(`[CREATE] Executing ${model.name}.create() with data: ${stringifyJSON(itemData)}`);
      const createdRecord = await model.create(itemData);

      // Add key and events
      // Create operations get their own context since they're top-level operations
      const processedRecord = await processRow(createdRecord, kta, references, aggregations, registry);
      const result = validateKeys(processedRecord, kta) as V;

      logger.debug(`[CREATE] Created ${model.name} with key: ${(result as any).key ? JSON.stringify((result as any).key) : `id=${createdRecord.id}`}`);
      return result;
    } catch (error: any) {
      throw translateDatabaseError(error, itemData, model.name);
    }
  }

  return create;
}
