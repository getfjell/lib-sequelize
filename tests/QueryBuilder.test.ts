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
        orderField: {},
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
  });
});
