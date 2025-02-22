import { addCompoundCondition, addCondition, buildQuery } from '@/QueryBuilder';
import { CompoundCondition, Condition, ItemQuery } from '@fjell/core';
import dayjs from 'dayjs';
import { ModelStatic, Op } from 'sequelize';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});

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
      })
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
        value: [5,6,7]
      };

      const result = addCondition({}, condition, mockModel);

      expect(result).toEqual({
        testColumn: {
          [Op.in]: [5,6,7]
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
