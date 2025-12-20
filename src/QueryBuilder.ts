/* eslint-disable max-len */
import {
  CompoundCondition,
  Condition,
  EventQuery,
  ItemQuery,
  OrderBy,
  PriKey,
  References
} from '@fjell/types';
import { isCondition } from "@fjell/types";
import { isComKey, isPriKey } from "@fjell/core";

import { Association, ModelStatic, Op } from 'sequelize';
import LibLogger from './logger';
import { stringifyJSON } from './util/general';
import { SequelizeReferenceDefinition } from './processing/ReferenceBuilder';
import type { Registry } from '@fjell/lib';

const logger = LibLogger.get('sequelize', 'QueryBuilder');

export type QueryOptions = {
  where: Record<string, any>;
  limit?: number;
  offset?: number;
  order?: Array<[string, string]>;
  include?: Array<any>;
}

const addDeleteQuery = (options: QueryOptions, model: ModelStatic<any>): QueryOptions => {
  logger.default(`QueryBuilder adding delete query with options: ${stringifyJSON(options)}`);
  if (model.getAttributes().deletedAt) {
    options.where['deletedAt'] = {
      [Op.eq]: null
    }
  } else if (model.getAttributes().isDeleted) {
    options.where['isDeleted'] = {
      [Op.eq]: false
    }
  }

  return options;
}

const addEventQueries = (
  options: QueryOptions, events: Record<string, EventQuery>, model: ModelStatic<any>): QueryOptions => {
  logger.default(`QueryBuilder adding event queries with options: ${stringifyJSON(options)}, events: ${stringifyJSON(events)}`);
  Object.keys(events).forEach((key: string) => {

    if (!model.getAttributes()[`${key}At`]) {
      throw new Error(`Event ${key} is not supported on model '${model.name}', column '${key}At' not found. Available columns: [${Object.keys(model.getAttributes()).join(', ')}]. Event query: ${stringifyJSON(events[key])}`);
    }

    let whereClauses = {};

    const event = events[key];
    if (event.start) {
      whereClauses = { ...whereClauses, [Op.gte]: new Date(event.start) };
    }
    if (event.end) {
      whereClauses = { ...whereClauses, [Op.lt]: new Date(event.end) };
    }

    if (event.by) {
      if (!model.getAttributes()[`${key}By`]) {
        throw new Error(`Event ${key} is not supported on model '${model.name}', column '${key}By' not found. Available columns: [${Object.keys(model.getAttributes()).join(', ')}]. Event query: ${stringifyJSON(events[key])}`);
      }
      whereClauses = { ...whereClauses, [Op.eq]: event.by };
    }

    options.where[`${key}At`] = whereClauses;

  });
  return options;
}

// Add the references to the query
const addReferenceQueries = (options: any, references: References, model: ModelStatic<any>): any => {
  logger.default(`QueryBuilder adding reference queries with options: ${stringifyJSON(options)}, references: ${stringifyJSON(references)}`);

  Object.keys(references).forEach((key: string) => {
    logger.default(`QueryBuilder adding reference query for key: ${key}, references: ${stringifyJSON(references)}`);

    if (!model.getAttributes()[`${key}Id`]) {
      throw new Error(`Reference ${key} is not supported on model '${model.name}', column '${key}Id' not found. Available columns: [${Object.keys(model.getAttributes()).join(', ')}]. Reference query: ${stringifyJSON(references[key])}`);
    }

    const refValue = references[key];
    const keyValue = (refValue as any).key || refValue;

    if (isPriKey(keyValue)) {
      const priKey: PriKey<string> = keyValue as PriKey<string>;

      if (priKey.pk == null || priKey.pk === '' || (typeof priKey.pk === 'object' && Object.keys(priKey.pk).length === 0)) {
        logger.error(`Reference key '${key}' has invalid pk value: ${stringifyJSON(priKey.pk)}`, { priKey, references });
        throw new Error(`Reference key '${key}' has invalid pk value: ${stringifyJSON(priKey.pk)}. Model: '${model.name}', Key type: '${priKey.kt}', Full reference: ${stringifyJSON(references[key])}`);
      }

      logger.trace(`[QueryBuilder] Setting reference where clause: ${key}Id = ${stringifyJSON(priKey.pk)} (type: ${typeof priKey.pk})`);
      options.where[`${key}Id`] = {
        [Op.eq]: priKey.pk
      }
    } else if (isComKey(references[key])) {
      throw new Error(`ComKeys are not supported in Sequelize. Reference key: '${key}', Model: '${model.name}', ComKey: ${stringifyJSON(references[key])}`);
    }
  });
  return options;
}

export const addCompoundCondition = (
  options: any,
  compoundCondition: CompoundCondition,
  model: ModelStatic<any>,
  references?: SequelizeReferenceDefinition[],
  allReferences?: Map<string, SequelizeReferenceDefinition[]>,
  registry?: Registry
) => {
  // Ensure options.where exists
  options.where = options.where || {};

  let compoundOp: symbol;
  const compoundType = compoundCondition.compoundType;
  if (compoundType === "AND") {
    compoundOp = Op.and;
  } else {
    compoundOp = Op.or;
  };

  let conditions: Record<string, any> = {};
  compoundCondition.conditions.forEach((condition: Condition | CompoundCondition) => {
    if (isCondition(condition)) {
      conditions = addCondition(conditions, condition, model, options, references, allReferences, registry);
    } else {
      throw new Error(`Nested Compound conditions not supported. Model: '${model.name}', Compound condition: ${stringifyJSON(compoundCondition)}, Nested condition: ${stringifyJSON(condition)}`);
    }
  });

  // Merge with existing where conditions instead of replacing
  if (Object.keys(options.where).length > 0) {
    // If there are existing conditions, wrap everything in an AND
    options.where = {
      [Op.and]: [
        options.where,
        { [compoundOp]: conditions }
      ]
    };
  } else {
    // If no existing conditions, just set the compound condition
    options.where[compoundOp] = conditions;
  }

  return options;
}

const getSequelizeOperator = (operator: string): symbol => {
  if (operator === '==') {
    return Op.eq;
  } else if (operator === '<') {
    return Op.lt;
  } else if (operator === '>') {
    return Op.gt;
  } else if (operator === '<=') {
    return Op.lte;
  } else if (operator === '>=') {
    return Op.gte;
  } else if (operator === 'in') {
    return Op.in;
  } else if (operator === '!=') {
    return Op.ne;
  } else {
    throw new Error(`Operator ${operator} not supported`);
  }
};

/**
 * Finds a reference definition that matches the given property name.
 * @param propertyName - The property name to match (e.g., "phase")
 * @param references - Array of reference definitions
 * @returns The matching reference definition or null
 */
const findReferenceByProperty = (
  propertyName: string,
  references?: SequelizeReferenceDefinition[]
): SequelizeReferenceDefinition | null => {
  if (!references || references.length === 0) {
    return null;
  }
  return references.find(ref => ref.property === propertyName) || null;
};

/**
 * Gets reference definitions for a model from the registry by looking up the library
 * associated with the model's primary key type.
 * @param model - The Sequelize model
 * @param registry - The registry to look up libraries
 * @returns Array of reference definitions or undefined if not found
 */
const getReferencesFromRegistry = (
  model: ModelStatic<any>,
  registry?: Registry
): SequelizeReferenceDefinition[] | undefined => {
  if (!registry) {
    return;
  }

  // Try to get the library for this model by its name (which often matches the key type)
  // We'll try the model name first, then try common variations
  const modelName = model.name.toLowerCase();
  try {
    const library = registry.get([modelName] as any);
    if (library && (library as any).options && (library as any).options.references) {
      return (library as any).options.references;
    }
  } catch {
    // Model name might not match key type, that's okay
  }

  return;
};

/**
 * Builds nested include structure for a reference path (e.g., "step.phase.code").
 * For the first segment, requires a reference definition match.
 * For subsequent segments, looks up reference definitions from registry if available.
 * @param pathSegments - Array of path segments (e.g., ["step", "phase"])
 * @param currentModel - The current Sequelize model
 * @param references - Array of reference definitions for the current model (only used for first segment)
 * @param allReferences - Map of all reference definitions by model name (for nested references)
 * @param registry - Registry to look up reference definitions for nested models
 * @param isFirstSegment - Whether this is the first segment (requires reference definition match)
 * @returns Include configuration object or null if path cannot be resolved
 */
const buildNestedInclude = (
  pathSegments: string[],
  currentModel: ModelStatic<any>,
  references?: SequelizeReferenceDefinition[],
  allReferences?: Map<string, SequelizeReferenceDefinition[]>,
  registry?: Registry,
  isFirstSegment: boolean = true
): { include: any; associationName: string } | null => {
  if (pathSegments.length === 0) {
    return null;
  }

  const [firstSegment, ...remainingSegments] = pathSegments;

  // For the first segment, check if it matches a reference definition
  if (isFirstSegment) {
    const refDef = findReferenceByProperty(firstSegment, references);
    if (!refDef) {
      logger.debug(`[buildNestedInclude] No reference definition found for property '${firstSegment}'`, {
        model: currentModel.name,
        property: firstSegment,
        availableReferences: references?.map(r => r.property) || [],
        referencesCount: references?.length || 0
      });
      return null;
    }
    logger.debug(`[buildNestedInclude] Found reference definition for property '${firstSegment}'`, {
      model: currentModel.name,
      property: firstSegment,
      refDef: { property: refDef.property, column: refDef.column, kta: refDef.kta }
    });
  }

  // Check if Sequelize association exists
  const association = currentModel.associations?.[firstSegment];
  if (!association) {
    if (isFirstSegment) {
      logger.debug(`[buildNestedInclude] Reference property '${firstSegment}' found but no Sequelize association exists`, {
        model: currentModel.name,
        property: firstSegment,
        availableAssociations: Object.keys(currentModel.associations || {}),
        associationsObject: currentModel.associations ? Object.keys(currentModel.associations) : 'undefined'
      });
    }
    return null;
  }
  logger.debug(`[buildNestedInclude] Found Sequelize association for '${firstSegment}'`, {
    model: currentModel.name,
    property: firstSegment,
    associationType: association.associationType,
    targetModel: association.target?.name
  });

  const targetModel = association.target;
  const includeConfig: any = {
    model: targetModel,
    as: firstSegment,
    required: true // Use INNER JOIN for filtering conditions
  };

  // If there are remaining segments, recursively build nested includes
  // For nested segments, we use Sequelize associations directly (no reference definition required)
  if (remainingSegments.length === 0) {
    return { include: includeConfig, associationName: firstSegment };
  }

  // Try to get nested references from registry first, then fall back to allReferences map
  let nestedReferences: SequelizeReferenceDefinition[] | undefined = getReferencesFromRegistry(targetModel, registry);
  if (!nestedReferences) {
    nestedReferences = allReferences?.get(targetModel.name);
  }
  const nestedInclude = buildNestedInclude(
    remainingSegments,
    targetModel,
    nestedReferences,
    allReferences,
    registry,
    false // Subsequent segments don't require reference definition match
  );

  if (nestedInclude) {
    includeConfig.include = [nestedInclude.include];
    return { include: includeConfig, associationName: firstSegment };
  }

  // Fallback: try direct Sequelize association lookup for nested paths
  // This allows "step.phase.code" to work even if Step model doesn't have "phase" in its references
  const [nextSegment, ...restSegments] = remainingSegments;
  const nextAssociation = targetModel.associations?.[nextSegment];

  if (!nextAssociation) {
    return null;
  }

  if (restSegments.length === 0) {
    // Final segment - just add the include
    includeConfig.include = [{
      model: nextAssociation.target,
      as: nextSegment,
      required: true
    }];
    return { include: includeConfig, associationName: firstSegment };
  }

  // Continue building deeper nested includes
  const deeperInclude = buildNestedInclude(
    remainingSegments,
    targetModel,
    nestedReferences,
    allReferences,
    registry,
    false
  );
  if (!deeperInclude) {
    return null;
  }
  includeConfig.include = [deeperInclude.include];

  return { include: includeConfig, associationName: firstSegment };
};

/**
 * Detects if a condition field path matches a reference property and returns include configuration.
 * @param fieldPath - The condition field path (e.g., "phase.code" or "step.phase.code")
 * @param model - The Sequelize model
 * @param references - Array of reference definitions
 * @param allReferences - Optional map of all reference definitions by model name
 * @returns Object with include config and remaining attribute path, or null if no match
 */
const detectReferenceJoin = (
  fieldPath: string,
  model: ModelStatic<any>,
  references?: SequelizeReferenceDefinition[],
  allReferences?: Map<string, SequelizeReferenceDefinition[]>,
  registry?: Registry
): { include: any; attributePath: string; associationName: string } | null => {
  const pathSegments = fieldPath.split('.');

  if (pathSegments.length < 2) {
    // Need at least "property.attribute" format
    return null;
  }

  // Try to match progressively longer paths (e.g., "phase", "step.phase")
  // Start from the longest possible path and work backwards to find the best match
  for (let i = pathSegments.length - 1; i >= 1; i--) {
    const referencePath = pathSegments.slice(0, i);
    const attributePath = pathSegments.slice(i).join('.');

    const includeResult = buildNestedInclude(referencePath, model, references, allReferences, registry);

    if (!includeResult) {
      continue;
    }

    // Verify that the attribute path resolves to a single attribute on the final model
    // Traverse the include structure to get the final model
    let finalModel = model;
    for (const segment of referencePath) {
      const assoc = finalModel.associations?.[segment];
      if (!assoc) {
        break;
      }
      finalModel = assoc.target;
    }

    // Check if attributePath is a single attribute (not nested)
    const attributeSegments = attributePath.split('.');
    if (attributeSegments.length !== 1 || !finalModel.getAttributes()[attributePath]) {
      continue;
    }

    logger.debug(`Auto-detected reference join for condition '${fieldPath}'`, {
      model: model.name,
      referencePath: referencePath.join('.'),
      attributePath,
      associationName: includeResult.associationName
    });

    return {
      include: includeResult.include,
      attributePath,
      associationName: includeResult.associationName
    };
  }

  return null;
};

/**
 * Adds an include to options if it doesn't already exist.
 * Handles nested includes by merging them properly.
 */
const addIncludeIfNotExists = (options: any, newInclude: any): void => {
  options.include = options.include || [];

  // Check if this include already exists (by model and alias)
  const exists = options.include.some((inc: any) => {
    if (typeof inc === 'string') {
      return inc === newInclude.as;
    }
    if (inc.model === newInclude.model && inc.as === newInclude.as) {
      // If it exists and has nested includes, merge them
      if (newInclude.include && inc.include) {
        newInclude.include.forEach((nested: any) => {
          const nestedExists = inc.include.some((existingNested: any) =>
            existingNested.model === nested.model && existingNested.as === nested.as
          );
          if (!nestedExists) {
            inc.include.push(nested);
          }
        });
      } else if (newInclude.include) {
        inc.include = newInclude.include;
      }
      return true;
    }
    return false;
  });

  if (!exists) {
    options.include.push(newInclude);
  }
};

const addAssociationCondition = (
  conditions: Record<string, any>,
  condition: Condition,
  model: ModelStatic<any>,
  options?: any,
  references?: SequelizeReferenceDefinition[],
  allReferences?: Map<string, SequelizeReferenceDefinition[]>,
  registry?: Registry
  // eslint-disable-next-line max-params
): Record<string, any> => {
  const fieldPath = condition.column;
  const pathSegments = fieldPath.split('.');

  // First, try to detect if this matches a reference property
  logger.debug(`[addAssociationCondition] Processing condition '${fieldPath}'`, {
    model: model.name,
    hasReferences: !!references,
    referencesCount: references?.length || 0,
    pathSegmentsLength: pathSegments.length,
    pathSegments,
    willAttemptDetection: !!(references && pathSegments.length >= 2)
  });

  if (references && pathSegments.length >= 2) {
    logger.debug(`[addAssociationCondition] Attempting reference join detection for '${fieldPath}'`, {
      model: model.name,
      referencesCount: references.length,
      references: references.map(r => ({ property: r.property, column: r.column })),
      pathSegments,
      hasOptions: !!options
    });
    const referenceJoin = detectReferenceJoin(fieldPath, model, references, allReferences, registry);

    if (!referenceJoin) {
      logger.debug(`[addAssociationCondition] Reference join detection returned null for '${fieldPath}'`, {
        model: model.name,
        fieldPath
      });
    }

    if (referenceJoin && options) {
      logger.debug(`[addAssociationCondition] Reference join detected successfully for '${fieldPath}'`, {
        model: model.name,
        associationName: referenceJoin.associationName,
        attributePath: referenceJoin.attributePath
      });
      // Add the include to options
      addIncludeIfNotExists(options, referenceJoin.include);

      // Build the Sequelize association column syntax
      // For nested paths like "step.phase.code", we need "$step.phase.code$"
      // The referenceJoin.attributePath already contains just the final attribute name (e.g., "code")
      const attributeName = referenceJoin.attributePath;
      // Build the full association path (everything except the final attribute)
      const associationPath = fieldPath.substring(0, fieldPath.length - attributeName.length - 1);
      const sequelizeAssociationColumn = `$${associationPath}.${attributeName}$`;

      // Verify the attribute exists on the target model
      // Traverse the association path to get to the final model
      const finalPathSegments = associationPath.split('.');
      let currentModel = model;
      let targetModel = model;

      for (const segment of finalPathSegments) {
        const assoc = currentModel.associations?.[segment];
        if (!assoc) {
          throw new Error(`Association ${segment} not found on model ${currentModel.name}`);
        }
        targetModel = assoc.target;
        currentModel = targetModel;
      }

      if (!targetModel.getAttributes()[attributeName]) {
        throw new Error(`Attribute ${attributeName} not found on associated model ${targetModel.name} for path ${associationPath}`);
      }

      // Handle null values with proper SQL IS NULL / IS NOT NULL syntax
      if (condition.value === null) {
        if (condition.operator === '==' || !condition.operator) {
          logger.trace(`[QueryBuilder] Setting reference condition: ${sequelizeAssociationColumn} IS NULL`);
          conditions[sequelizeAssociationColumn] = {
            [Op.is]: null
          };
        } else if (condition.operator === '!=') {
          logger.trace(`[QueryBuilder] Setting reference condition: ${sequelizeAssociationColumn} IS NOT NULL`);
          conditions[sequelizeAssociationColumn] = {
            [Op.not]: null
          };
        } else {
          logger.error(`Operator ${condition.operator} cannot be used with null value on reference`, { condition });
          throw new Error(`Operator ${condition.operator} cannot be used with null value. Use '==' for IS NULL or '!=' for IS NOT NULL.`);
        }
        return conditions;
      }

      const conditionOp = getSequelizeOperator(condition.operator);
      logger.trace(`[QueryBuilder] Setting reference condition: ${sequelizeAssociationColumn} = ${stringifyJSON(condition.value)} (type: ${typeof condition.value})`);
      conditions[sequelizeAssociationColumn] = {
        [conditionOp]: condition.value
      };

      return conditions;
    }
  }

  // Fall back to original behavior: check for direct Sequelize association
  const [associationName, attributeName] = fieldPath.split('.', 2);

  // Check if the association exists on the model
  if (!model.associations || !model.associations[associationName]) {
    throw new Error(`Association ${associationName} not found on model ${model.name}`);
  }

  const association: Association<any, any> = model.associations[associationName];
  const associatedModel = association.target;

  // Check if the attribute exists on the associated model
  if (!associatedModel.getAttributes()[attributeName]) {
    throw new Error(`Attribute ${attributeName} not found on associated model ${associatedModel.name} for association ${associationName}`);
  }

  // Use Sequelize's $association.attribute$ syntax for querying associated models
  const sequelizeAssociationColumn = `$${associationName}.${attributeName}$`;

  // Handle null values with proper SQL IS NULL / IS NOT NULL syntax
  if (condition.value === null) {
    if (condition.operator === '==' || !condition.operator) {
      // Use Op.is for IS NULL
      logger.trace(`[QueryBuilder] Setting association condition: ${sequelizeAssociationColumn} IS NULL`);
      conditions[sequelizeAssociationColumn] = {
        [Op.is]: null
      };
    } else if (condition.operator === '!=') {
      // Use Op.not for IS NOT NULL
      logger.trace(`[QueryBuilder] Setting association condition: ${sequelizeAssociationColumn} IS NOT NULL`);
      conditions[sequelizeAssociationColumn] = {
        [Op.not]: null
      };
    } else {
      logger.error(`Operator ${condition.operator} cannot be used with null value on association`, { condition });
      throw new Error(`Operator ${condition.operator} cannot be used with null value. Use '==' for IS NULL or '!=' for IS NOT NULL.`);
    }
    return conditions;
  }

  const conditionOp = getSequelizeOperator(condition.operator);

  logger.trace(`[QueryBuilder] Setting association condition: ${sequelizeAssociationColumn} = ${stringifyJSON(condition.value)} (type: ${typeof condition.value})`);
  conditions[sequelizeAssociationColumn] = {
    [conditionOp]: condition.value
  };

  return conditions;
};

const addAttributeCondition = (
  conditions: Record<string, any>,
  condition: Condition,
  model: ModelStatic<any>
): Record<string, any> => {
  const conditionColumn = condition.column;

  if (!model.getAttributes()[conditionColumn]) {
    throw new Error(`Condition column ${conditionColumn} not found on model ${model.name}`);
  }

  // Handle null values with proper SQL IS NULL / IS NOT NULL syntax
  if (condition.value === null) {
    if (condition.operator === '==' || !condition.operator) {
      // Use Op.is for IS NULL
      logger.trace(`[QueryBuilder] Setting attribute condition: ${conditionColumn} IS NULL`);
      conditions[conditionColumn] = {
        [Op.is]: null
      };
    } else if (condition.operator === '!=') {
      // Use Op.not for IS NOT NULL
      logger.trace(`[QueryBuilder] Setting attribute condition: ${conditionColumn} IS NOT NULL`);
      conditions[conditionColumn] = {
        [Op.not]: null
      };
    } else {
      logger.error(`Operator ${condition.operator} cannot be used with null value`, { condition });
      throw new Error(`Operator ${condition.operator} cannot be used with null value. Use '==' for IS NULL or '!=' for IS NOT NULL.`);
    }
    return conditions;
  }

  const conditionOp = getSequelizeOperator(condition.operator);

  logger.trace(`[QueryBuilder] Setting attribute condition: ${conditionColumn} = ${stringifyJSON(condition.value)} (type: ${typeof condition.value})`);
  conditions[conditionColumn] = {
    [conditionOp]: condition.value
  };

  return conditions;
};

export const addCondition = (
  conditions: Record<string, any>,
  condition: Condition,
  model: ModelStatic<any>,
  options?: any,
  references?: SequelizeReferenceDefinition[],
  allReferences?: Map<string, SequelizeReferenceDefinition[]>,
  registry?: Registry
  // eslint-disable-next-line max-params
) => {
  const conditionColumn: string = condition.column;

  // Check if this is an association query (contains a dot)
  if (conditionColumn.includes('.')) {
    return addAssociationCondition(conditions, condition, model, options, references, allReferences, registry);
  }

  // Handle regular column queries
  return addAttributeCondition(conditions, condition, model);
}

const collectAssociationsFromConditions = (conditions: any): Set<string> => {
  const associations = new Set<string>();

  const processObject = (obj: any) => {
    if (typeof obj === 'object' && obj !== null) {
      // Check string keys
      Object.keys(obj).forEach(key => {
        // Check if this is an association reference ($association.attribute$)
        if (typeof key === 'string' && key.startsWith('$') && key.endsWith('$') && key.includes('.')) {
          const associationName = key.substring(1, key.indexOf('.'));
          associations.add(associationName);
        }

        // Recursively process nested objects
        if (typeof obj[key] === 'object') {
          processObject(obj[key]);
        }
      });

      // Also check Symbol keys (for compound conditions like Op.and, Op.or)
      Object.getOwnPropertySymbols(obj).forEach(symbol => {
        if (typeof obj[symbol] === 'object') {
          processObject(obj[symbol]);
        }
      });
    }

    // Handle arrays (for compound conditions that might be arrays)
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (typeof item === 'object') {
          processObject(item);
        }
      });
    }
  };

  processObject(conditions);
  return associations;
};

const addAssociationIncludes = (options: any, model: ModelStatic<any>): any => {
  // Collect all association names used in conditions
  const referencedAssociations = collectAssociationsFromConditions(options.where);

  if (referencedAssociations.size > 0) {
    options.include = options.include || [];

    // Add each referenced association to the include array
    referencedAssociations.forEach(associationName => {
      // Check if this association is already included
      const alreadyIncluded = options.include.some((inc: any) =>
        (typeof inc === 'string' && inc === associationName) ||
        (typeof inc === 'object' && inc.association === associationName)
      );

      if (!alreadyIncluded && model.associations && model.associations[associationName]) {
        options.include.push({
          model: model.associations[associationName].target,
          as: associationName,
          required: false // Use LEFT JOIN so records without associations are still returned
        });
      }
    });
  }

  return options;
};

/**
 * Detects references that can be loaded via Sequelize INCLUDE and adds them to options.
 * This prevents N+1 queries by using JOIN instead of separate queries per item.
 *
 * @param options - Query options to modify
 * @param model - Sequelize model to check for associations
 * @param referenceDefinitions - Reference definitions from library config
 * @returns Modified options with includes added, plus array of property names that were included
 */
export const addReferenceIncludes = (
  options: any,
  model: ModelStatic<any>,
  referenceDefinitions: SequelizeReferenceDefinition[]
): { options: any; includedReferences: string[] } => {
  if (!referenceDefinitions || referenceDefinitions.length === 0) {
    return { options, includedReferences: [] };
  }

  const includedReferences: string[] = [];
  options.include = options.include || [];

  for (const refDef of referenceDefinitions) {
    // Check if the model has an association matching the reference property
    const association = model.associations && model.associations[refDef.property];

    if (association) {
      // Check if this association is already included
      const alreadyIncluded = options.include.some((inc: any) =>
        (typeof inc === 'string' && inc === refDef.property) ||
        (typeof inc === 'object' && inc.as === refDef.property)
      );

      if (!alreadyIncluded) {
        logger.default(`Auto-detected association for reference '${refDef.property}' - using INCLUDE to prevent N+1`, {
          property: refDef.property,
          associationType: association.associationType,
          targetModel: association.target.name
        });

        // Add the association to includes
        options.include.push({
          model: association.target,
          as: refDef.property,
          required: false // Use LEFT JOIN to preserve items without references
        });

        includedReferences.push(refDef.property);
      } else {
        logger.debug(`Association '${refDef.property}' already included in query`, {
          property: refDef.property
        });
        includedReferences.push(refDef.property);
      }
    } else {
      logger.debug(`No association found for reference '${refDef.property}' - will use separate query`, {
        property: refDef.property,
        availableAssociations: Object.keys(model.associations || {})
      });
    }
  }

  return { options, includedReferences };
};

/**
 * Detects aggregations that can be loaded via Sequelize INCLUDE and adds them to options.
 * This prevents N+1 queries by using JOIN instead of separate queries per item.
 *
 * @param options - Query options to modify
 * @param model - Sequelize model to check for associations
 * @param aggregationDefinitions - Aggregation definitions from library config
 * @returns Modified options with includes added, plus array of property names that were included
 */
export const addAggregationIncludes = (
  options: any,
  model: ModelStatic<any>,
  aggregationDefinitions: any[]
): { options: any; includedAggregations: string[] } => {
  if (!aggregationDefinitions || aggregationDefinitions.length === 0) {
    return { options, includedAggregations: [] };
  }

  const includedAggregations: string[] = [];
  options.include = options.include || [];

  for (const aggDef of aggregationDefinitions) {
    // Check if the model has an association matching the aggregation property
    const association = model.associations && model.associations[aggDef.property];

    if (association) {
      // Check if this association is already included
      const alreadyIncluded = options.include.some((inc: any) =>
        (typeof inc === 'string' && inc === aggDef.property) ||
        (typeof inc === 'object' && inc.as === aggDef.property)
      );

      if (!alreadyIncluded) {
        logger.default(`Auto-detected association for aggregation '${aggDef.property}' - using INCLUDE to prevent N+1`, {
          property: aggDef.property,
          associationType: association.associationType,
          targetModel: association.target.name
        });

        // Add the association to includes
        options.include.push({
          model: association.target,
          as: aggDef.property,
          required: false // Use LEFT JOIN to preserve items without aggregations
        });

        includedAggregations.push(aggDef.property);
      } else {
        logger.debug(`Association '${aggDef.property}' already included in query`, {
          property: aggDef.property
        });
        includedAggregations.push(aggDef.property);
      }
    } else {
      logger.debug(`No association found for aggregation '${aggDef.property}' - will use separate query`, {
        property: aggDef.property,
        availableAssociations: Object.keys(model.associations || {})
      });
    }
  }

  return { options, includedAggregations };
};

export const buildQuery = (
  itemQuery: ItemQuery,
  model: ModelStatic<any>,
  references?: SequelizeReferenceDefinition[],
  registry?: Registry
): any => {
  logger.default(`QueryBuilder build called with itemQuery: ${stringifyJSON(itemQuery)}`);
  logger.debug(`[buildQuery] Parameters:`, {
    modelName: model.name,
    referencesCount: references?.length || 0,
    references: references?.map(r => ({ property: r.property, column: r.column })) || [],
    hasRegistry: !!registry,
    hasCompoundCondition: !!itemQuery.compoundCondition
  });

  let options: any = {
    where: {},
  };

  // Build a map of references by model name for nested reference lookups
  // This is a simplified approach - in a real scenario, we'd need to resolve
  // model names from the registry, but for now we'll use the references array
  const allReferences = new Map<string, SequelizeReferenceDefinition[]>();
  if (references) {
    // For now, we'll store references under the current model name
    // In a full implementation, we'd need to resolve model names from the registry
    allReferences.set(model.name, references);
  }

  if (itemQuery.compoundCondition) {
    logger.default(`QueryBuilder adding conditions: ${stringifyJSON(itemQuery.compoundCondition)}`);
    options = addCompoundCondition(options, itemQuery.compoundCondition, model, references, allReferences, registry);
  }

  // If the model has a deletedAt column, we need to add a delete query
  if (model.getAttributes().deletedAt || model.getAttributes().isDeleted) {
    options = addDeleteQuery(options, model);
  }

  if (itemQuery.refs) {
    options = addReferenceQueries(options, itemQuery.refs, model);
  }
  if (itemQuery.events) {
    options = addEventQueries(options, itemQuery.events, model);
  }

  // TODO: Once we start to support Aggs on the server-side, we'll need to parse agg queries

  // Apply a limit to the result set
  if (itemQuery.limit) {
    logger.default(`QueryBuilder applying limit: ${itemQuery.limit}`);
    options.limit = itemQuery.limit;
  }

  // Apply an offset to the result set
  if (itemQuery.offset) {
    options.offset = itemQuery.offset;
  }

  // Add orderBy to the query
  if (itemQuery.orderBy) {
    itemQuery.orderBy.forEach((orderBy: OrderBy) => {
      if (!model.getAttributes()[orderBy.field]) {
        throw new Error(`Order by field ${orderBy.field} not found on model ${model.name}`);
      }
      options.order = [
        [orderBy.field, orderBy.direction]
      ];
    });
  }

  // Add includes for any associations referenced in conditions
  // This will pick up includes added by reference detection as well as direct association references
  options = addAssociationIncludes(options, model);

  return options;
}
