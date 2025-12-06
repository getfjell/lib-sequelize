/**
 * Unit tests for addAggregationIncludes function
 *
 * These tests verify the core logic of the N+1 prevention feature
 * in isolation from the rest of the library.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addAggregationIncludes } from '../src/QueryBuilder';
import { Association } from 'sequelize';

describe('QueryBuilder - addAggregationIncludes', () => {
  let mockModel: any;
  let mockTargetModel: any;
  
  beforeEach(() => {
    mockTargetModel = {
      name: 'TargetModel'
    };
    
    mockModel = {
      name: 'TestModel',
      associations: {}
    };
  });

  describe('Basic Functionality', () => {
    it('should return empty array when no aggregations provided', () => {
      const options = { where: {} };
      const result = addAggregationIncludes(options, mockModel, []);
      
      expect(result.includedAggregations).toEqual([]);
      expect(result.options).toEqual(options);
    });

    it('should return empty array when aggregations is undefined', () => {
      const options = { where: {} };
      const result = addAggregationIncludes(options, mockModel, undefined as any);
      
      expect(result.includedAggregations).toEqual([]);
      expect(result.options).toEqual(options);
    });

    it('should add include when association exists', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };
      
      mockModel.associations = {
        children: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual(['children']);
      expect(result.options.include).toHaveLength(1);
      expect(result.options.include[0]).toEqual({
        model: mockTargetModel,
        as: 'children',
        required: false
      });
    });

    it('should not add include when association does not exist', () => {
      mockModel.associations = {};

      const options = { where: {} };
      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual([]);
      // No includes should be added
      expect(result.options.include).toEqual([]);
    });

    it('should use LEFT JOIN (required: false) to preserve items without aggregations', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };
      
      mockModel.associations = {
        items: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['item', 'parent'],
        property: 'items',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.options.include[0].required).toBe(false);
    });
  });

  describe('Multiple Aggregations', () => {
    it('should add includes for multiple aggregations', () => {
      const association1: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };
      
      const association2: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        children: association1,
        siblings: association2
      };

      const options = { where: {} };
      const aggregations = [
        {
          kta: ['child', 'parent'],
          property: 'children',
          cardinality: 'many'
        },
        {
          kta: ['sibling', 'parent'],
          property: 'siblings',
          cardinality: 'many'
        }
      ];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toHaveLength(2);
      expect(result.includedAggregations).toContain('children');
      expect(result.includedAggregations).toContain('siblings');
      expect(result.options.include).toHaveLength(2);
    });

    it('should handle mix of existing and non-existing associations', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        children: association
        // 'others' does not exist
      };

      const options = { where: {} };
      const aggregations = [
        {
          kta: ['child', 'parent'],
          property: 'children',
          cardinality: 'many'
        },
        {
          kta: ['other', 'parent'],
          property: 'others',
          cardinality: 'many'
        }
      ];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toHaveLength(1);
      expect(result.includedAggregations).toContain('children');
      expect(result.options.include).toHaveLength(1);
    });
  });

  describe('Duplicate Detection', () => {
    it('should not add duplicate includes for same association', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        children: association
      };

      const options = {
        where: {},
        include: [
          {
            model: mockTargetModel,
            as: 'children'
          }
        ]
      };

      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      // Should still track it as included
      expect(result.includedAggregations).toContain('children');
      // But should not add duplicate to includes array
      expect(result.options.include).toHaveLength(1);
    });

    it('should detect string-format includes', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        children: association
      };

      const options = {
        where: {},
        include: ['children']
      };

      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toContain('children');
      expect(result.options.include).toHaveLength(1);
    });
  });

  describe('Cardinality Support', () => {
    it('should work with cardinality: one (one-to-one)', () => {
      const association: Partial<Association> = {
        associationType: 'HasOne',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        profile: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['profile', 'user'],
        property: 'profile',
        cardinality: 'one'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual(['profile']);
      expect(result.options.include).toHaveLength(1);
      expect(result.options.include[0].as).toBe('profile');
    });

    it('should work with cardinality: many (one-to-many)', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        posts: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['post', 'user'],
        property: 'posts',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual(['posts']);
      expect(result.options.include).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle model with no associations property', () => {
      const modelWithoutAssociations = {
        name: 'TestModel'
        // No associations property
      } as any;

      const options = { where: {} };
      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, modelWithoutAssociations, aggregations);

      expect(result.includedAggregations).toEqual([]);
      // Include array is initialized when aggregations are provided
      expect(result.options.include).toEqual([]);
    });

    it('should handle empty associations object', () => {
      mockModel.associations = {};

      const options = { where: {} };
      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual([]);
    });

    it('should preserve existing include array', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        children: association
      };

      const existingInclude = {
        model: { name: 'OtherModel' },
        as: 'other'
      };

      const options = {
        where: {},
        include: [existingInclude]
      };

      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.options.include).toHaveLength(2);
      expect(result.options.include[0]).toEqual(existingInclude);
    });

    it('should initialize include array if it does not exist', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        children: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['child', 'parent'],
        property: 'children',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(Array.isArray(result.options.include)).toBe(true);
      expect(result.options.include).toHaveLength(1);
    });
  });

  describe('Association Types', () => {
    it('should work with HasMany association', () => {
      const association: Partial<Association> = {
        associationType: 'HasMany',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        items: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['item', 'container'],
        property: 'items',
        cardinality: 'many'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual(['items']);
    });

    it('should work with HasOne association', () => {
      const association: Partial<Association> = {
        associationType: 'HasOne',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        detail: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['detail', 'master'],
        property: 'detail',
        cardinality: 'one'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual(['detail']);
    });

    it('should work with BelongsTo association', () => {
      const association: Partial<Association> = {
        associationType: 'BelongsTo',
        target: mockTargetModel as any
      };

      mockModel.associations = {
        parent: association
      };

      const options = { where: {} };
      const aggregations = [{
        kta: ['parent'],
        property: 'parent',
        cardinality: 'one'
      }];

      const result = addAggregationIncludes(options, mockModel, aggregations);

      expect(result.includedAggregations).toEqual(['parent']);
    });
  });
});

