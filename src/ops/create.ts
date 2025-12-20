/* eslint-disable indent */
import { ComKey, CreateMethod, Item, LocKeyArray, PriKey } from "@fjell/types";
import { createCreateWrapper, isComKey, isPriKey } from "@fjell/core";
import { validateKeys } from "@fjell/validation";

import { Definition } from "../Definition";
import { processRow } from "../RowProcessor";
import * as Library from "@fjell/lib";
import { ModelStatic } from "sequelize";
import { extractEvents, removeEvents } from "../EventCoordinator";
import { buildRelationshipChain, buildRelationshipPath } from "../util/relationshipUtils";
import { stringifyJSON } from "../util/general";
import { transformSequelizeError } from "../errors/sequelizeErrorHandler";
import { removeRefsFromSequelizeItem } from "../processing/RefsAdapter";
import { removeAggsFromItem } from "../processing/AggsAdapter";
import { queryMetrics } from "../metrics/QueryMetrics";
import LibLogger from '../logger';

const logger = LibLogger.get('sequelize', 'ops', 'create');

// Helper function to validate hierarchical chain exists
async function validateHierarchicalChain(
  models: ModelStatic<any>[],
  locKey: { kt: string; lk: any },
  kta: string[]
): Promise<void> {
  // Find the direct parent model that contains this locator
  const locatorIndex = kta.indexOf(locKey.kt);
  if (locatorIndex === -1) {
    throw new Error(`Locator type '${locKey.kt}' not found in kta array`);
  }

  // Get the model for this locator (define outside try block for catch block access)
  const locatorModel = models[locatorIndex] || models[0]; // Fallback to primary model

  try {
    // Build a query to validate the chain exists
    const chainResult = buildRelationshipChain(locatorModel, kta, locatorIndex, kta.length - 1);

    if (!chainResult.success) {
      // If we can't build a chain, just validate the record exists
      queryMetrics.recordQuery(locatorModel.name);
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

    queryMetrics.recordQuery(locatorModel.name);
    const record = await locatorModel.findOne(queryOptions);
    if (!record) {
      throw new Error(`Referenced ${locKey.kt} with id ${locKey.lk} does not exist or chain is invalid`);
    }
  } catch (error: any) {
    // Transform database errors to Fjell error types
    if (error.original) {
      throw transformSequelizeError(error, locKey.kt, { locKey, kta }, locatorModel.name);
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
): CreateMethod<V, S, L1, L2, L3, L4, L5> => {

  const { coordinate, options: { references, aggregations } } = definition;
  const { kta } = coordinate;

  return createCreateWrapper(
    coordinate,
    async (
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?: {
        key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
        locations?: never;
      } | {
        key?: never;
        locations: LocKeyArray<L1, L2, L3, L4, L5>,
      }
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

    // Get the primary model (first model in array)
    const model = models[0];
    const modelAttributes = model.getAttributes();

    // Validate that all item attributes exist on the model
    let itemData = { ...item } as any;

    // TODO: We need the opposite of processRow, something to step down from fjell to database.
    itemData = extractEvents(itemData);
    itemData = removeEvents(itemData);

    // Remove refs structure if present (convert back to foreign key columns)
    if (references && references.length > 0) {
      itemData = removeRefsFromSequelizeItem(itemData, references);
    }

    // Remove aggs structure if present (convert back to direct properties)
    if (aggregations && aggregations.length > 0) {
      itemData = removeAggsFromItem(itemData, aggregations);
    }

    // Validate that all item attributes exist on the model
    const invalidAttributes: string[] = [];
    for (const key of Object.keys(itemData)) {
      if (!modelAttributes[key]) {
        invalidAttributes.push(key);
      }
    }

    if (invalidAttributes.length > 0) {
      const availableAttributes = Object.keys(modelAttributes).join(', ');
      const errorMessage = `Invalid attributes for model '${model.name}': [${invalidAttributes.join(', ')}]. ` +
        `Available attributes: [${availableAttributes}].`;

      logger.error('Create operation failed - invalid attributes', {
        operation: 'create',
        model: model.name,
        invalidAttributes,
        availableAttributes: Object.keys(modelAttributes),
        providedAttributes: Object.keys(itemData),
        itemData: JSON.stringify(itemData, null, 2),
        suggestion: `Remove invalid attributes or add them to the model definition. Valid attributes are: ${availableAttributes}`,
        coordinate: JSON.stringify(definition.coordinate)
      });

      throw new Error(errorMessage + ` Item data: ${JSON.stringify(itemData, null, 2)}`);
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
      queryMetrics.recordQuery(model.name);
      const createdRecord = await model.create(itemData);

      // For composite items (kta.length > 1), we need to reload the record with relationships
      // so that the key can be properly constructed by traversing the relationship chain
      let recordToProcess = createdRecord;
      if (kta.length > 1) {
        // Build includes for the relationship chain needed for key construction
        // We only need to include up to the second-to-last level (since the last is accessed via the penultimate)
        const includesForKey: any[] = [];

        // Build nested includes for each level in the kta (excluding the first which is self)
        let currentInclude: any = null;
        for (let i = kta.length - 1; i > 0; i--) {
          const relationshipType = kta[i];
          const relationshipInfo = buildRelationshipPath(model, relationshipType, kta, true);

          if (relationshipInfo.found && !relationshipInfo.isDirect) {
            // This is a hierarchical relationship that needs to be included
            const intermediateType = kta[i - 1];
            const newInclude: any = {
              association: intermediateType,
              required: false,
            };

            if (currentInclude) {
              newInclude.include = [currentInclude];
            }

            currentInclude = newInclude;
          }
        }

        if (currentInclude) {
          includesForKey.push(currentInclude);
        }

        if (includesForKey.length > 0) {
          logger.debug(`[CREATE] Reloading ${model.name} with includes for key construction`, { includes: includesForKey });
          queryMetrics.recordQuery(model.name);
          const reloadedRecord = await model.findByPk(createdRecord.get('id'), {
            include: includesForKey
          });

          if (reloadedRecord) {
            recordToProcess = reloadedRecord;
          } else {
            logger.warning(`[CREATE] Failed to reload ${model.name} after creation, using original record`);
          }
        }
      }

      // Add key and events
      // Create operations get their own context since they're top-level operations
      // For create, we don't pre-load aggregations via INCLUDE, so pass void 0
      const processedRecord = await processRow(recordToProcess, kta, references || [], aggregations || [], registry, void 0, void 0);
      const result = validateKeys(processedRecord, kta) as V;

      logger.debug(`[CREATE] Created ${model.name} with key: ${(result as any).key ? JSON.stringify((result as any).key) : `id=${createdRecord.id}`}`);
      return result;
    } catch (error: any) {
      // Log detailed error information for debugging
      logger.error('Create operation failed', {
        operation: 'create',
        model: model.name,
        itemData: JSON.stringify(itemData, null, 2),
        options: JSON.stringify(options),
        errorType: error?.constructor?.name || typeof error,
        errorMessage: error?.message,
        errorName: error?.name,
        sqlError: error?.original?.message,
        sqlCode: error?.original?.code,
        constraint: error?.original?.constraint,
        detail: error?.original?.detail,
        suggestion: 'Check validation rules, unique constraints, foreign keys, required fields, and data types',
        coordinate: JSON.stringify(definition.coordinate)
      });

      throw transformSequelizeError(error, kta[0], options?.key, model.name, itemData);
    }
    }
  );
}
