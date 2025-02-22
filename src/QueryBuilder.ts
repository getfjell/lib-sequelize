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
  
import { ModelStatic, Op } from 'sequelize';
import LibLogger from '@/logger';

const logger = LibLogger.get('sequelize', 'QueryBuilder');

export type QueryOptions = {
  where: Record<string, any>;
  limit?: number;
  offset?: number;
  order?: Array<[string, string]>;
}

const addDeleteQuery = (options: QueryOptions, model: ModelStatic<any>): QueryOptions => {
  logger.default('Adding Delete Query', { options });
  if(model.getAttributes().deletedAt) {
    options.where['deletedAt'] = {
      [Op.eq]: null
    }
  } else if(model.getAttributes().isDeleted) {
    options.where['isDeleted'] = {
      [Op.eq]: false
    }
  }

  return options;
}
  
const addEventQueries = (
  options: QueryOptions, events: Record<string, EventQuery>, model: ModelStatic<any>): QueryOptions => {
  logger.default('Adding Event Queries', { options, events });
  Object.keys(events).forEach((key: string) => {

    if(!model.getAttributes()[`${key}At`]) {
      throw new Error(`Event ${key} is not supported on this model, column ${key}At not found`);
    }

    let whereClauses = {};

    const event = events[key];
    if (event.start) {
      whereClauses = { ...whereClauses, [Op.gte]: new Date(event.start) };
    }
    if (event.end) {
      whereClauses = { ...whereClauses, [Op.lt]: new Date(event.end) };
    }

    if(event.by) {
      if(!model.getAttributes()[`${key}By`]) {
        throw new Error(`Event ${key} is not supported on this model, column ${key}By not found`);
      }
      whereClauses = { ...whereClauses, [Op.eq]: event.by };
    }

    options.where[`${key}At`] = whereClauses;

  });
  return options;
}

// Add the references to the query
const addReferenceQueries = (options: any, references: References, model: ModelStatic<any>): any => {
  logger.default('Adding Reference Queries', { options, references });

  Object.keys(references).forEach((key: string) => {
    logger.default('Adding Reference Query', { key, references });

    if(!model.getAttributes()[`${key}Id`]) {
      throw new Error(`Reference ${key} is not supported on this model, column ${key}Id not found`);
    }

    if (isPriKey(references[key])) {
      const priKey: PriKey<string> = references[key] as PriKey<string>;

      options.where[`${key}Id`] = {
        [Op.eq]: priKey.pk
      }
    } else if (isComKey(references[key])) {
      throw new Error('ComKeys are not supported in Sequelize');
    }
  });
  return options;
}

export const addCompoundCondition = (options: any, compoundCondition: CompoundCondition, model: ModelStatic<any>) => {
  const where: Record<symbol, any> = {};
  
  let compoundOp: symbol;
  const compoundType = compoundCondition.compoundType;
  if( compoundType === "AND" ) {
    compoundOp = Op.and;
  } else {
    compoundOp = Op.or;
  };

  let conditions: Record<symbol, any> = {};
  compoundCondition.conditions.forEach((condition: Condition | CompoundCondition) => {
    if(isCondition(condition)) {
      conditions = addCondition(conditions,condition, model);
    } else {
      throw new Error('Nest Compound conditions not supported');
    }
  });

  where[compoundOp] = conditions;
  options.where = where;

  return options;
}

export const addCondition = (conditions: Record<string, any>, condition: Condition, model: ModelStatic<any>) => {
  let conditionOp: symbol;
  const conditionColumn: string = condition.column;

  if(!model.getAttributes()[conditionColumn]) {
    throw new Error(`Condition column ${conditionColumn} not found on model ${model.name}`);
  }

  if(condition.operator === '==') {
    conditionOp = Op.eq;
  } else if(condition.operator === '<') {
    conditionOp = Op.lt;
  } else if(condition.operator === '>') {
    conditionOp = Op.gt;
  } else if(condition.operator === '<=') {
    conditionOp = Op.lte;
  } else if(condition.operator === '>=') {
    conditionOp = Op.gte;
  } else if(condition.operator === 'in') {
    conditionOp = Op.in;
  } else {
    throw new Error(`Operator ${condition.operator} not supported`);
  }

  conditions[conditionColumn] = {
    [conditionOp]: condition.value
  }

  return conditions;
}

export const buildQuery = (
  itemQuery: ItemQuery,
  model: ModelStatic<any>
): any => {
  logger.default('build', { itemQuery });

  let options: any = {
    where: {},
  };

  if (itemQuery.compoundCondition) {
    logger.default('Adding Conditions', { compoundCondition: itemQuery.compoundCondition });
    options = addCompoundCondition(options, itemQuery.compoundCondition, model);
  }

  // If the model has a deletedAt column, we need to add a delete query
  if(model.getAttributes().deletedAt || model.getAttributes().isDeleted) {
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
    logger.default('Limiting to', { limit: itemQuery.limit });
    options.limit = itemQuery.limit;
  }
  
  // Apply an offset to the result set
  if (itemQuery.offset) {
    options.offset = itemQuery.offset;
  }
  
  // Add orderBy to the query
  if (itemQuery.orderBy) {
    itemQuery.orderBy.forEach((orderBy: OrderBy) => {
      if(!model.getAttributes()[orderBy.field]) {
        throw new Error(`Order by field ${orderBy.field} not found on model ${model.name}`);
      }
      options.order = [
        [orderBy.field, orderBy.direction]
      ];
    });
  }

  return options;
}
  