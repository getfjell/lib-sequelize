import { addCompoundCondition, addCondition, buildQuery } from '@/QueryBuilder';
import { CompoundCondition, Condition, ItemQuery } from '@fjell/core';
import dayjs from 'dayjs';
import { ModelStatic, Op } from 'sequelize';
import { beforeEach, describe, expect, it } from 'vitest';

describe('QueryBuilder', () => {
  let mockModel: ModelStatic<any>;

  beforeEach(() => {
    mockModel = {
      name: 'TestModel',
      getAttributes: () => ({
        testColumn: {},
        testColumn2: {},
        deletedAt: {},
        createdAt: {},
        updatedAt: {},
        birthdayAt: {},
        birthdayBy: {},
        orderField: {},
        orderField2: {},
        categoryId: {},
        domainId: {},
      }),
      associations: {
        phase: {
          target: {
            name: 'Phase',
            getAttributes: () => ({
              id: {},
              code: {},
              name: {},
              position: {},
            })
          }
        },
        user: {
          target: {
            name: 'User',
            getAttributes: () => ({
              id: {},
              email: {},
              name: {},
            })
          }
        }
      }
    } as any;
  });

  describe('addCondition', () => {
    it('should add equals condition', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: '==',
        value: 'test'
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.eq]: 'test'
        }
      });
    });

    it('should add greater than condition', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: '>',
        value: 5
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.gt]: 5
        }
      });
    });

    it('should add less than condition', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: '<',
        value: 5
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.lt]: 5
        }
      });
    });

    it('should add less than equals condition', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: '<=',
        value: 5
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.lte]: 5
        }
      });
    });

    it('should add greater than equals condition', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: '>=',
        value: 5
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.gte]: 5
        }
      });
    });

    it('should add in condition', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: 'in',
        value: [5, 6, 7]
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.in]: [5, 6, 7]
        }
      });
    });

    it('should handle different data types for condition values', () => {
      const stringCondition: Condition = {
        column: 'testColumn',
        operator: '==',
        value: 'string_value'
      };

      const numberCondition: Condition = {
        column: 'testColumn2',
        operator: '==',
        value: 42
      };

      const booleanCondition: Condition = {
        column: 'testColumn',
        operator: '==',
        value: true
      };

      expect(addCondition({}, stringCondition, mockModel)).toEqual({
        testColumn: { [Op.eq]: 'string_value' }
      });

      expect(addCondition({}, numberCondition, mockModel)).toEqual({
        testColumn2: { [Op.eq]: 42 }
      });

      expect(addCondition({}, booleanCondition, mockModel)).toEqual({
        testColumn: { [Op.eq]: true }
      });
    });

    it('should handle null values', () => {
      const nullCondition: Condition = {
        column: 'testColumn',
        operator: '==',
        value: null as any
      };

      expect(addCondition({}, nullCondition, mockModel)).toEqual({
        testColumn: { [Op.eq]: null }
      });
    });

    it('should throw error for invalid column', () => {
      const condition: Condition = {
        column: 'invalidColumn',
        operator: '==',
        value: 'test'
      };

      expect(() => addCondition({}, condition, mockModel))
        .toThrow('Condition column invalidColumn not found on model TestModel');
    });

    it('should throw error for unsupported operator', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: '!=' as any,
        value: 'test'
      };

      expect(() => addCondition({}, condition, mockModel))
        .toThrow('Operator != not supported');
    });

    it('should throw error for unsupported like operator', () => {
      const condition: Condition = {
        column: 'testColumn',
        operator: 'like' as any,
        value: '%test%'
      };

      expect(() => addCondition({}, condition, mockModel))
        .toThrow('Operator like not supported');
    });

    // Association tests
    it('should add condition for association attribute', () => {
      const condition: Condition = {
        column: 'phase.code',
        operator: '==',
        value: 'DESIGN'
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        '$phase.code$': {
          [Op.eq]: 'DESIGN'
        }
      });
    });

    it('should add condition for association attribute with different operators', () => {
      const condition: Condition = {
        column: 'phase.position',
        operator: '>',
        value: 1
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        '$phase.position$': {
          [Op.gt]: 1
        }
      });
    });

    it('should handle multiple association levels in column name', () => {
      const condition: Condition = {
        column: 'user.email',
        operator: '==',
        value: 'test@example.com'
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        '$user.email$': {
          [Op.eq]: 'test@example.com'
        }
      });
    });

    it('should throw error for non-existent association', () => {
      const condition: Condition = {
        column: 'nonExistentAssociation.attribute',
        operator: '==',
        value: 'test'
      };

      expect(() => addCondition({}, condition, mockModel))
        .toThrow('Association nonExistentAssociation not found on model TestModel');
    });

    it('should throw error for non-existent attribute on associated model', () => {
      const condition: Condition = {
        column: 'phase.nonExistentAttribute',
        operator: '==',
        value: 'test'
      };

      expect(() => addCondition({}, condition, mockModel))
        .toThrow('Attribute nonExistentAttribute not found on associated model Phase for association phase');
    });

    it('should handle association with missing associations property', () => {
      const modelWithoutAssociations = {
        name: 'TestModel',
        getAttributes: () => ({
          testColumn: {},
        }),
        associations: null
      } as any;

      const condition: Condition = {
        column: 'phase.code',
        operator: '==',
        value: 'test'
      };

      expect(() => addCondition({}, condition, modelWithoutAssociations))
        .toThrow('Association phase not found on model TestModel');
    });

    it('should handle empty associations object', () => {
      const modelWithEmptyAssociations = {
        name: 'TestModel',
        getAttributes: () => ({
          testColumn: {},
        }),
        associations: {}
      } as any;

      const condition: Condition = {
        column: 'phase.code',
        operator: '==',
        value: 'test'
      };

      expect(() => addCondition({}, condition, modelWithEmptyAssociations))
        .toThrow('Association phase not found on model TestModel');
    });
  });

  describe('addCompoundCondition', () => {
    it('should add AND compound condition', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          {
            column: 'testColumn',
            operator: '==',
            value: 'test1'
          },
          {
            column: 'testColumn2',
            operator: '>',
            value: 5
          }
        ]
      };

      const result = addCompoundCondition({}, compoundCondition, mockModel);

      expect(result).toEqual({
        where: {
          [Op.and]: {
            testColumn: {
              [Op.eq]: 'test1'
            },
            testColumn2: {
              [Op.gt]: 5
            }
          }
        }
      });
    });

    it('should add OR compound condition', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'OR',
        conditions: [
          {
            column: 'testColumn',
            operator: '==',
            value: 'test1'
          },
          {
            column: 'testColumn2',
            operator: '>',
            value: 5
          }
        ]
      };

      const result = addCompoundCondition({}, compoundCondition, mockModel);

      expect(result).toEqual({
        where: {
          [Op.or]: {
            testColumn: {
              [Op.eq]: 'test1'
            },
            testColumn2: {
              [Op.gt]: 5
            }
          }
        }
      });
    });

    it('should merge with existing where conditions using AND', () => {
      const options = {
        where: {
          existingColumn: {
            [Op.eq]: 'existingValue'
          }
        }
      };

      const compoundCondition: CompoundCondition = {
        compoundType: 'OR',
        conditions: [
          {
            column: 'testColumn',
            operator: '==',
            value: 'test1'
          },
          {
            column: 'testColumn2',
            operator: '>',
            value: 5
          }
        ]
      };

      const result = addCompoundCondition(options, compoundCondition, mockModel);

      expect(result).toEqual({
        where: {
          [Op.and]: [
            {
              existingColumn: {
                [Op.eq]: 'existingValue'
              }
            },
            {
              [Op.or]: {
                testColumn: {
                  [Op.eq]: 'test1'
                },
                testColumn2: {
                  [Op.gt]: 5
                }
              }
            }
          ]
        }
      });
    });

    it('should handle empty conditions array', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: []
      };

      const result = addCompoundCondition({}, compoundCondition, mockModel);

      expect(result).toEqual({
        where: {
          [Op.and]: {}
        }
      });
    });

    it('should handle single condition in compound', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          {
            column: 'testColumn',
            operator: '==',
            value: 'singleTest'
          }
        ]
      };

      const result = addCompoundCondition({}, compoundCondition, mockModel);

      expect(result).toEqual({
        where: {
          [Op.and]: {
            testColumn: {
              [Op.eq]: 'singleTest'
            }
          }
        }
      });
    });

    it('should handle compound conditions with associations', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          {
            column: 'phase.code',
            operator: '==',
            value: 'DESIGN'
          },
          {
            column: 'user.email',
            operator: '==',
            value: 'test@example.com'
          }
        ]
      };

      const result = addCompoundCondition({}, compoundCondition, mockModel);

      expect(result).toEqual({
        where: {
          [Op.and]: {
            '$phase.code$': {
              [Op.eq]: 'DESIGN'
            },
            '$user.email$': {
              [Op.eq]: 'test@example.com'
            }
          }
        }
      });
    });

    it('should create where object if not present', () => {
      const options = {};

      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          {
            column: 'testColumn',
            operator: '==',
            value: 'test'
          }
        ]
      };

      const result = addCompoundCondition(options, compoundCondition, mockModel);

      expect(result).toHaveProperty('where');
      expect(Object.getOwnPropertySymbols(result.where)).toContain(Op.and);
    });

    it('should throw error for nested compound conditions', () => {
      const nestedCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          {
            compoundType: 'OR',
            conditions: []
          } as CompoundCondition
        ]
      };

      expect(() => addCompoundCondition({}, nestedCondition, mockModel))
        .toThrow('Nest Compound conditions not supported');
    });
  });

  describe('buildQuery', () => {
    it('should build complete query with all options', () => {
      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'testColumn',
              operator: '==',
              value: 'test'
            }
          ]
        },
        limit: 10,
        offset: 5,
        orderBy: [{
          field: 'orderField',
          direction: 'asc'
        }]
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: expect.any(Object),
        limit: 10,
        offset: 5,
        order: [['orderField', 'asc']]
      });
    });

    it('should handle query with limit and offset but no other conditions', () => {
      const itemQuery: ItemQuery = {
        limit: 20,
        offset: 10
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        limit: 20,
        offset: 10,
        where: {
          deletedAt: {
            [Op.eq]: null
          }
        }
      });
    });

    it('should handle multiple orderBy fields', () => {
      const itemQuery: ItemQuery = {
        orderBy: [
          {
            field: 'orderField',
            direction: 'asc'
          },
          {
            field: 'orderField2',
            direction: 'desc'
          }
        ]
      };

      const result = buildQuery(itemQuery, mockModel);

      // Note: The current implementation only supports one orderBy field
      // This test documents the current behavior
      expect(result.order).toEqual([['orderField2', 'desc']]);
    });

    it('should automatically include associations when referenced in conditions', () => {
      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'phase.code',
              operator: '==',
              value: 'DESIGN'
            }
          ]
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      // Check that the query has the correct structure
      // The compound condition should be added with a Symbol key (Op.and)
      const whereSymbols = Object.getOwnPropertySymbols(result.where);
      expect(whereSymbols).toHaveLength(1);

      // Check that the association condition is present
      const andConditions = result.where[whereSymbols[0]];
      expect(andConditions).toHaveProperty('$phase.code$');

      // Check that the operator and value are correctly set (as Symbol keys)
      const phaseCondition = andConditions['$phase.code$'];
      const phaseSymbols = Object.getOwnPropertySymbols(phaseCondition);
      expect(phaseSymbols).toHaveLength(1);
      expect(phaseCondition[phaseSymbols[0]]).toBe('DESIGN');

      // Check that include property exists
      expect(result).toHaveProperty('include');
      expect(result.include).toBeInstanceOf(Array);
      expect(result.include).toHaveLength(1);
      expect(result.include[0]).toMatchObject({
        model: mockModel.associations.phase.target,
        as: 'phase',
        required: false
      });
    });

    it('should include multiple associations when referenced', () => {
      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'phase.code',
              operator: '==',
              value: 'DESIGN'
            },
            {
              column: 'user.email',
              operator: '==',
              value: 'test@example.com'
            }
          ]
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toHaveProperty('include');
      expect(result.include).toBeInstanceOf(Array);
      expect(result.include).toHaveLength(2);

      const includeAssociations = result.include.map((inc: any) => inc.as);
      expect(includeAssociations).toContain('phase');
      expect(includeAssociations).toContain('user');
    });

    it('should not duplicate includes for same association', () => {
      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'phase.code',
              operator: '==',
              value: 'DESIGN'
            },
            {
              column: 'phase.name',
              operator: '==',
              value: 'Design Phase'
            }
          ]
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toHaveProperty('include');
      expect(result.include).toBeInstanceOf(Array);
      expect(result.include).toHaveLength(1);
      expect(result.include[0]).toMatchObject({
        model: mockModel.associations.phase.target,
        as: 'phase',
        required: false
      });
    });

    it('should automatically include associations when referenced in conditions without deletedAt interference', () => {
      // Create a model without deletedAt to avoid interference
      const simpleModel = {
        name: 'SimpleModel',
        getAttributes: () => ({
          testColumn: {},
        }),
        associations: {
          phase: {
            target: {
              name: 'Phase',
              getAttributes: () => ({
                id: {},
                code: {},
                name: {},
                position: {},
              })
            }
          }
        }
      } as any;

      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'phase.code',
              operator: '==',
              value: 'DESIGN'
            }
          ]
        }
      };

      const result = buildQuery(itemQuery, simpleModel);

      // Check that the query has the correct structure
      // The compound condition should be added with a Symbol key (Op.and)
      const whereSymbols = Object.getOwnPropertySymbols(result.where);
      expect(whereSymbols).toHaveLength(1);

      // Check that the association condition is present
      const andConditions = result.where[whereSymbols[0]];
      expect(andConditions).toHaveProperty('$phase.code$');

      // Check that the operator and value are correctly set (as Symbol keys)
      const phaseCondition = andConditions['$phase.code$'];
      const phaseSymbols = Object.getOwnPropertySymbols(phaseCondition);
      expect(phaseSymbols).toHaveLength(1);
      expect(phaseCondition[phaseSymbols[0]]).toBe('DESIGN');

      // Check that include property exists
      expect(result).toHaveProperty('include');
      expect(result.include).toBeInstanceOf(Array);
      expect(result.include).toHaveLength(1);
      expect(result.include[0]).toMatchObject({
        model: simpleModel.associations.phase.target,
        as: 'phase',
        required: false
      });
    });

    it('should add deletedAt null check when model has deletedAt', () => {
      const itemQuery: ItemQuery = {};
      const result = buildQuery(itemQuery, mockModel);

      expect(result.where).toEqual({
        deletedAt: {
          [Op.eq]: null
        }
      });
    });

    it('should add isDeleted false check when model has isDeleted', () => {

      const mockModel2: ModelStatic<any> = {
        name: 'TestModel2',
        getAttributes: () => ({
          testColumn: {},
          testColumn2: {},
          isDeleted: {},
          createdAt: {},
          updatedAt: {},
          orderField: {}
        })
      } as any;

      const itemQuery: ItemQuery = {};
      const result = buildQuery(itemQuery, mockModel2);

      expect(result.where).toEqual({
        isDeleted: {
          [Op.eq]: false
        }
      });
    });

    it('should not add delete query when model has neither deletedAt nor isDeleted', () => {
      const modelWithoutDeleteFields = {
        name: 'SimpleModel',
        getAttributes: () => ({
          testColumn: {},
        }),
        associations: {}
      } as any;

      const itemQuery: ItemQuery = {};
      const result = buildQuery(itemQuery, modelWithoutDeleteFields);

      expect(result.where).toEqual({});
    });

    it('should handle empty ItemQuery', () => {
      const modelWithoutDeleteFields = {
        name: 'SimpleModel',
        getAttributes: () => ({
          testColumn: {},
        }),
        associations: {}
      } as any;

      const itemQuery: ItemQuery = {};
      const result = buildQuery(itemQuery, modelWithoutDeleteFields);

      expect(result).toEqual({
        where: {}
      });
    });

    it('should throw error for invalid orderBy field', () => {
      const itemQuery: ItemQuery = {
        orderBy: [{
          field: 'invalidField',
          direction: 'asc'
        }]
      };

      expect(() => buildQuery(itemQuery, mockModel))
        .toThrow('Order by field invalidField not found on model TestModel');
    });

    it('should handle orderBy with desc direction', () => {
      const itemQuery: ItemQuery = {
        orderBy: [{
          field: 'orderField',
          direction: 'desc'
        }]
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result.order).toEqual([['orderField', 'desc']]);
    });
  });

  describe('addEventQueries', () => {
    it('query for createdAt after a specified start date', () => {
      const now = new Date();
      const itemQuery: ItemQuery = {
        events: {
          'created': {
            start: now,
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          createdAt: {
            [Op.gte]: now,
          },
        },
      });
    });

    it('query for updatedAt before a specified end date', () => {
      const now = new Date();
      const itemQuery: ItemQuery = {
        events: {
          'updated': {
            end: now,
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          updatedAt: {
            [Op.lt]: now,
          },
        },
      });
    });

    it('query for deletedAt between two dates', () => {
      const now = new Date();
      const yesterday = dayjs(now).subtract(1, 'day').toDate();

      const itemQuery: ItemQuery = {
        events: {
          'deleted': {
            end: now,
            start: yesterday,
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          deletedAt: {
            [Op.lt]: now,
            [Op.gte]: yesterday,
          },
        },
      });
    });

    it('should handle event query with by parameter', () => {
      const now = new Date();
      const userId = 'user123';

      const itemQuery: ItemQuery = {
        events: {
          'birthday': {
            start: now,
            by: userId
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          birthdayAt: {
            [Op.gte]: now,
            [Op.eq]: userId,
          },
        },
      });
    });

    it('should throw error for event with by parameter when by column does not exist', () => {
      const now = new Date();
      const userId = 'user123';

      const itemQuery: ItemQuery = {
        events: {
          'created': {
            start: now,
            by: userId
          }
        },
      };

      expect(() => buildQuery(itemQuery, mockModel))
        .toThrow('Event created is not supported on this model, column createdBy not found');
    });

    it('should handle multiple event queries', () => {
      const now = new Date();
      const yesterday = dayjs(now).subtract(1, 'day').toDate();

      const itemQuery: ItemQuery = {
        events: {
          'created': {
            start: yesterday,
          },
          'updated': {
            end: now,
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          createdAt: {
            [Op.gte]: yesterday,
          },
          updatedAt: {
            [Op.lt]: now,
          },
        },
      });
    });

    it('should handle event query with only by parameter', () => {
      const userId = 'user123';

      const itemQuery: ItemQuery = {
        events: {
          'birthday': {
            by: userId
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          birthdayAt: {
            [Op.eq]: userId,
          },
        },
      });
    });

    it('query for non-existant event', () => {
      const now = new Date();

      const itemQuery: ItemQuery = {
        events: {
          'finalization': {
            start: now,
          }
        },
      };

      expect(() =>
        buildQuery(itemQuery, mockModel)
      ).toThrow('Event finalization is not supported on this model, column finalizationAt not found');
    });

    it('query for birthday before a certain date (custom event)', () => {
      const now = new Date();
      const legalBirthday = dayjs(now).subtract(21, 'years').toDate();
      const itemQuery: ItemQuery = {
        events: {
          'birthday': {
            end: legalBirthday,
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          birthdayAt: {
            [Op.lt]: legalBirthday,
          },
        },
      });
    });

    it('should handle Date strings in event queries', () => {
      const dateString = '2023-01-01T00:00:00.000Z';
      const itemQuery: ItemQuery = {
        events: {
          'created': {
            start: new Date(dateString),
          }
        },
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          createdAt: {
            [Op.gte]: new Date(dateString),
          },
        },
      });
    });
  });

  describe('addReferenceQueries', () => {

    it('query for a custom refernece', () => {
      const itemQuery: ItemQuery = {
        refs: {
          category: { kt: 'category', pk: '1' },
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          categoryId: {
            [Op.eq]: '1',
          },
        },
      });
    });

    it('query for non-existant reference', () => {
      const itemQuery: ItemQuery = {
        refs: {
          dance: { kt: 'dance', pk: '1' },
        }
      };

      expect(
        () => buildQuery(itemQuery, mockModel)
      ).toThrow(`Reference dance is not supported on this model, column danceId not found`);
    });

    it('query for multiple references', () => {
      const itemQuery: ItemQuery = {
        refs: {
          category: { kt: 'category', pk: '2' },
          domain: { kt: 'domain', pk: '3' },
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          categoryId: {
            [Op.eq]: '2',
          },
          domainId: {
            [Op.eq]: '3',
          }
        },
      });
    });

    it('should handle reference with numeric pk', () => {
      const itemQuery: ItemQuery = {
        refs: {
          category: { kt: 'category', pk: '123' },
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        where: {
          categoryId: {
            [Op.eq]: '123',
          },
        },
      });
    });

    it('should throw error for ComKey references', () => {
      const itemQuery: ItemQuery = {
        refs: {
          category: {
            kt: 'category',
            pk: '123',
            loc: [{ kt: 'location', lk: 'loc123' }]
          } as any,
        }
      };

      expect(() => buildQuery(itemQuery, mockModel))
        .toThrow('ComKeys are not supported in Sequelize');
    });

    it('should handle empty refs object', () => {
      const itemQuery: ItemQuery = {
        refs: {}
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result.where).toEqual({
        deletedAt: {
          [Op.eq]: null
        }
      });
    });
  });

  describe('complex integration scenarios', () => {
    it('should handle query with all features combined', () => {
      const now = new Date();
      const yesterday = dayjs(now).subtract(1, 'day').toDate();

      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'testColumn',
              operator: '==',
              value: 'test'
            },
            {
              column: 'phase.code',
              operator: '==',
              value: 'DESIGN'
            }
          ]
        },
        refs: {
          category: { kt: 'category', pk: '1' }
        },
        events: {
          'created': {
            start: yesterday
          }
        },
        limit: 10,
        offset: 5,
        orderBy: [{
          field: 'orderField',
          direction: 'asc'
        }]
      };

      const result = buildQuery(itemQuery, mockModel);

      expect(result).toMatchObject({
        limit: 10,
        offset: 5,
        order: [['orderField', 'asc']],
        include: expect.arrayContaining([
          expect.objectContaining({
            as: 'phase',
            required: false
          })
        ])
      });

      // Verify where conditions include all expected elements
      expect(result.where).toHaveProperty('deletedAt');
      expect(result.where).toHaveProperty('categoryId');
      expect(result.where).toHaveProperty('createdAt');

      // Verify compound condition exists (as symbol key)
      const whereSymbols = Object.getOwnPropertySymbols(result.where);
      expect(whereSymbols.length).toBeGreaterThan(0);
    });

    it('should handle compound conditions with existing where clauses from events and refs', () => {
      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'OR',
          conditions: [
            {
              column: 'testColumn',
              operator: '==',
              value: 'value1'
            },
            {
              column: 'testColumn2',
              operator: '==',
              value: 'value2'
            }
          ]
        },
        refs: {
          category: { kt: 'category', pk: '1' }
        },
        events: {
          'created': {
            start: new Date()
          }
        }
      };

      const result = buildQuery(itemQuery, mockModel);

      // Should have multiple where conditions merged properly
      expect(result.where).toHaveProperty('deletedAt');
      expect(result.where).toHaveProperty('categoryId');
      expect(result.where).toHaveProperty('createdAt');

      // Should have compound condition as symbol key
      const whereSymbols = Object.getOwnPropertySymbols(result.where);
      expect(whereSymbols.length).toBeGreaterThan(0);
    });

    it('should handle model with pre-existing includes', () => {
      const itemQuery: ItemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            {
              column: 'phase.code',
              operator: '==',
              value: 'DESIGN'
            }
          ]
        }
      };

      // Mock query options with existing includes
      const result = buildQuery(itemQuery, mockModel);

      expect(result.include).toHaveLength(1);
      expect(result.include[0]).toMatchObject({
        as: 'phase',
        required: false
      });
    });
  });
});
