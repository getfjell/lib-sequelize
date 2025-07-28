import { describe, expect, it } from 'vitest';
import { AggregationDefinition, createOptions, ReferenceDefinition } from '../src/Options';

describe('Options', () => {
  describe('AggregationDefinition interface', () => {
    it('should define the correct structure for aggregation definition', () => {
      const aggregationDef: AggregationDefinition = {
        kta: ['test', 'level1'],
        property: 'testProperty',
        cardinality: 'one'
      };

      expect(aggregationDef.kta).toEqual(['test', 'level1']);
      expect(aggregationDef.property).toBe('testProperty');
      expect(aggregationDef.cardinality).toBe('one');
    });

    it('should accept "many" cardinality', () => {
      const aggregationDef: AggregationDefinition = {
        kta: ['test'],
        property: 'testProperty',
        cardinality: 'many'
      };

      expect(aggregationDef.cardinality).toBe('many');
    });
  });

  describe('ReferenceDefinition interface', () => {
    it('should define the correct structure for reference definition', () => {
      const referenceDef: ReferenceDefinition = {
        column: 'test_column',
        kta: ['test', 'reference'],
        property: 'testRef'
      };

      expect(referenceDef.column).toBe('test_column');
      expect(referenceDef.kta).toEqual(['test', 'reference']);
      expect(referenceDef.property).toBe('testRef');
    });
  });

  describe('createOptions', () => {
    it('should create options with default values when no parameters provided', () => {
      const options = createOptions();

      expect(options).toBeDefined();
      expect(options.deleteOnRemove).toBe(false);
      expect(options.references).toEqual([]);
      expect(options.aggregations).toEqual([]);
    });

    it('should merge provided options with defaults', () => {
      const customOptions = {
        deleteOnRemove: true,
        references: [{
          column: 'custom_column',
          kta: ['custom', 'reference'],
          property: 'customRef'
        }] as ReferenceDefinition[]
      };

      const options = createOptions(customOptions);

      expect(options.deleteOnRemove).toBe(true);
      expect(options.references).toEqual(customOptions.references);
      expect(options.aggregations).toEqual([]); // Should still use default
    });

    it('should handle partial options object', () => {
      const partialOptions = {
        deleteOnRemove: true
      };

      const options = createOptions(partialOptions);

      expect(options.deleteOnRemove).toBe(true);
      expect(options.references).toEqual([]);
      expect(options.aggregations).toEqual([]);
    });

    it('should merge aggregations correctly', () => {
      const aggregations: AggregationDefinition[] = [
        {
          kta: ['test', 'agg1'],
          property: 'firstAgg',
          cardinality: 'one'
        },
        {
          kta: ['test', 'agg2'],
          property: 'secondAgg',
          cardinality: 'many'
        }
      ];

      const options = createOptions({ aggregations });

      expect(options.aggregations).toEqual(aggregations);
      expect(options.aggregations).toHaveLength(2);
      expect(options.deleteOnRemove).toBe(false); // Should still use default
      expect(options.references).toEqual([]); // Should still use default
    });

    it('should merge references correctly', () => {
      const references: ReferenceDefinition[] = [
        {
          column: 'ref1_id',
          kta: ['ref1'],
          property: 'reference1'
        },
        {
          column: 'ref2_id',
          kta: ['ref2', 'nested'],
          property: 'reference2'
        }
      ];

      const options = createOptions({ references });

      expect(options.references).toEqual(references);
      expect(options.references).toHaveLength(2);
      expect(options.deleteOnRemove).toBe(false); // Should still use default
      expect(options.aggregations).toEqual([]); // Should still use default
    });

    it('should handle complex options with all properties', () => {
      const fullOptions = {
        deleteOnRemove: true,
        references: [{
          column: 'complex_ref_id',
          kta: ['complex', 'ref'],
          property: 'complexRef'
        }] as ReferenceDefinition[],
        aggregations: [{
          kta: ['complex', 'agg'],
          property: 'complexAgg',
          cardinality: 'many' as const
        }] as AggregationDefinition[]
      };

      const options = createOptions(fullOptions);

      expect(options.deleteOnRemove).toBe(true);
      expect(options.references).toEqual(fullOptions.references);
      expect(options.aggregations).toEqual(fullOptions.aggregations);
    });

    it('should clean undefined values from options', () => {
      const optionsWithUndefined: any = {
        deleteOnRemove: true,
        // eslint-disable-next-line no-undefined
        references: undefined,
        aggregations: [{
          kta: ['test'],
          property: 'testProp',
          cardinality: 'one' as const
        }]
      };

      const options = createOptions(optionsWithUndefined);

      expect(options.deleteOnRemove).toBe(true);
      expect(options.references).toEqual([]); // Should use default when undefined
      expect(options.aggregations).toEqual(optionsWithUndefined.aggregations);
    });

    it('should handle empty arrays properly', () => {
      const emptyArrayOptions = {
        deleteOnRemove: false,
        references: [],
        aggregations: []
      };

      const options = createOptions(emptyArrayOptions);

      expect(options.deleteOnRemove).toBe(false);
      expect(options.references).toEqual([]);
      expect(options.aggregations).toEqual([]);
    });

    it('should preserve library options integration', () => {
      // Test that the function integrates with Library.createOptions
      const options = createOptions();

      // The result should be an Options object that extends Library.Options
      expect(options).toBeDefined();
      expect(typeof options).toBe('object');

      // Verify sequelize-specific properties are present
      expect(options).toHaveProperty('deleteOnRemove');
      expect(options).toHaveProperty('references');
      expect(options).toHaveProperty('aggregations');
    });

    it('should handle multiple aggregations with different cardinalities', () => {
      const mixedAggregations: AggregationDefinition[] = [
        {
          kta: ['test1'],
          property: 'singleRef',
          cardinality: 'one'
        },
        {
          kta: ['test2'],
          property: 'multiRef',
          cardinality: 'many'
        }
      ];

      const options = createOptions({ aggregations: mixedAggregations });

      expect(options.aggregations).toHaveLength(2);
      expect(options.aggregations[0].cardinality).toBe('one');
      expect(options.aggregations[1].cardinality).toBe('many');
    });

    it('should handle nested kta arrays in references and aggregations', () => {
      const deepOptions = {
        references: [{
          column: 'deep_ref',
          kta: ['level1', 'level2', 'level3', 'level4'],
          property: 'deepReference'
        }] as ReferenceDefinition[],
        aggregations: [{
          kta: ['agg1', 'agg2', 'agg3'],
          property: 'deepAggregation',
          cardinality: 'many' as const
        }] as AggregationDefinition[]
      };

      const options = createOptions(deepOptions);

      expect(options.references[0].kta).toHaveLength(4);
      expect(options.aggregations[0].kta).toHaveLength(3);
      expect(options.references[0].kta).toEqual(['level1', 'level2', 'level3', 'level4']);
      expect(options.aggregations[0].kta).toEqual(['agg1', 'agg2', 'agg3']);
    });
  });
});
