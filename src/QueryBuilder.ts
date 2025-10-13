/* eslint-disable max-len */
import {
  CompoundCondition,
  Condition,
  EventQuery,
  isComKey,
  isCondition,
  isPriKey,
  ItemQuery,
  OrderBy,
  PriKey,
  References
} from '@fjell/core';

import { Association, ModelStatic, Op } from 'sequelize';
import LibLogger from './logger';
import { stringifyJSON } from './util/general';

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

export const addCompoundCondition = (options: any, compoundCondition: CompoundCondition, model: ModelStatic<any>) => {
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
      conditions = addCondition(conditions, condition, model);
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
  } else {
    throw new Error(`Operator ${operator} not supported`);
  }
};

const addAssociationCondition = (
  conditions: Record<string, any>,
  condition: Condition,
  model: ModelStatic<any>
): Record<string, any> => {
  const [associationName, attributeName] = condition.column.split('.', 2);

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

export const addCondition = (conditions: Record<string, any>, condition: Condition, model: ModelStatic<any>) => {
  const conditionColumn: string = condition.column;

  // Check if this is an association query (contains a dot)
  if (conditionColumn.includes('.')) {
    return addAssociationCondition(conditions, condition, model);
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

export const buildQuery = (
  itemQuery: ItemQuery,
  model: ModelStatic<any>
): any => {
  logger.default(`QueryBuilder build called with itemQuery: ${stringifyJSON(itemQuery)}`);

  let options: any = {
    where: {},
  };

  if (itemQuery.compoundCondition) {
    logger.default(`QueryBuilder adding conditions: ${stringifyJSON(itemQuery.compoundCondition)}`);
    options = addCompoundCondition(options, itemQuery.compoundCondition, model);
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
  options = addAssociationIncludes(options, model);

  return options;
}
