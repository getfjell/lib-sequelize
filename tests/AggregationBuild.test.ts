import { buildAggregation } from '../src/AggregationBuilder';
import { AggregationDefinition } from '../src/Options';
import { Item } from '@fjell/core';
import * as Library from '@fjell/lib';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

// Mock the ikToLKA function from @fjell/core
vi.mock('@fjell/core', async () => {
  const actual = await vi.importActual('@fjell/core');
  return {
    ...actual,
    ikToLKA: vi.fn()
  };
});

// Mock the OperationContext module
vi.mock('../src/OperationContext', () => ({
  contextManager: {
    withContext: vi.fn().mockImplementation((ctx, fn) => fn()),
    getCurrentContext: vi.fn()
  },
  serializeKey: vi.fn().mockReturnValue('test-key')
}));

import { ikToLKA } from '@fjell/core';
import { contextManager, serializeKey } from '../src/OperationContext';

type TestItem = Item<'test', never, never, never, never, never>;

describe('buildAggregation', () => {
  let mockItem: TestItem;
  let mockRegistry: Mocked<Library.Registry>;
  let mockLibraryInstance: any;
  let aggregationDefinition: AggregationDefinition;
  const mockIkToLKA = vi.mocked(ikToLKA);
  const mockContextManager = vi.mocked(contextManager);
  const mockSerializeKey = vi.mocked(serializeKey);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock item with basic structure
    mockItem = {
      key: {
        kt: 'test',
        pk: '123'
      },
      events: {},
      testProperty: 'initial value'
    } as unknown as TestItem;

    // Mock library instance with operations that return promises
    mockLibraryInstance = {
      operations: {
        one: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([])
      },
      definition: {},
      registry: {} as any
    };

    // Mock registry
    mockRegistry = {
      get: vi.fn().mockReturnValue(mockLibraryInstance),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    // Default aggregation definition
    aggregationDefinition = {
      kta: ['related'],
      property: 'relatedItems',
      cardinality: 'one'
    };

    // Mock ikToLKA to return a location key array
    mockIkToLKA.mockReturnValue([{ kt: 'test', lk: '123' }] as any);

    // Reset context manager mocks
    mockContextManager.withContext.mockImplementation((ctx, fn) => fn());
    // getCurrentContext returns undefined by default
    mockSerializeKey.mockReturnValue('test-key');
  });

  describe('Happy path scenarios', () => {
    it('should successfully build aggregation with cardinality "one"', async () => {
      const mockResult = { id: 'related-1', name: 'Related Item' };
      mockLibraryInstance.operations.one.mockResolvedValue(mockResult);

      aggregationDefinition.cardinality = 'one';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(mockIkToLKA).toHaveBeenCalledWith(mockItem.key);
      expect(mockRegistry.get).toHaveBeenCalledWith(['related']);
      expect(mockLibraryInstance.operations.one).toHaveBeenCalledWith(
        {},
        [{ kt: 'test', lk: '123' }]
      );
      expect(mockLibraryInstance.operations.all).not.toHaveBeenCalled();
      expect(result.relatedItems).toEqual(mockResult);
      expect(result).toBe(mockItem); // Should return the same item instance
    });

    it('should successfully build aggregation with cardinality "many"', async () => {
      const mockResults = [
        { id: 'related-1', name: 'Related Item 1' },
        { id: 'related-2', name: 'Related Item 2' }
      ];
      mockLibraryInstance.operations.all.mockResolvedValue(mockResults);

      aggregationDefinition.cardinality = 'many';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(mockIkToLKA).toHaveBeenCalledWith(mockItem.key);
      expect(mockRegistry.get).toHaveBeenCalledWith(['related']);
      expect(mockLibraryInstance.operations.all).toHaveBeenCalledWith(
        {},
        [{ kt: 'test', lk: '123' }]
      );
      expect(mockLibraryInstance.operations.one).not.toHaveBeenCalled();
      expect(result.relatedItems).toEqual(mockResults);
      expect(result).toBe(mockItem); // Should return the same item instance
    });

    it('should handle any cardinality value other than "one" as "many"', async () => {
      const mockResults = [{ id: 'related-1', name: 'Related Item' }];
      mockLibraryInstance.operations.all.mockResolvedValue(mockResults);

      // Test with undefined cardinality (should default to "many" behavior)
      aggregationDefinition.cardinality = 'some-other-value' as any;

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(mockLibraryInstance.operations.all).toHaveBeenCalledWith(
        {},
        [{ kt: 'test', lk: '123' }]
      );
      expect(mockLibraryInstance.operations.one).not.toHaveBeenCalled();
      expect(result.relatedItems).toEqual(mockResults);
    });

    it('should handle complex key type arrays', async () => {
      const mockResult = { id: 'complex-1', name: 'Complex Item' };
      mockLibraryInstance.operations.one.mockResolvedValue(mockResult);

      aggregationDefinition.kta = ['parent', 'child', 'grandchild'];
      aggregationDefinition.cardinality = 'one';

      await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(mockRegistry.get).toHaveBeenCalledWith(['parent', 'child', 'grandchild']);
    });

    it('should overwrite existing property on item', async () => {
      const mockResult = { id: 'new-value', name: 'New Value' };
      mockLibraryInstance.operations.one.mockResolvedValue(mockResult);

      // Item already has this property with different value
      (mockItem as any).relatedItems = 'old value';
      aggregationDefinition.cardinality = 'one';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(result.relatedItems).toEqual(mockResult);
      expect(result.relatedItems).not.toEqual('old value');
    });
  });

  describe('Error scenarios', () => {
    it('should throw error when library instance is not found', async () => {
      mockRegistry.get.mockReturnValue(null);

      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow('Library instance not found for key type array: related');

      expect(mockRegistry.get).toHaveBeenCalledWith(['related']);
      expect(mockLibraryInstance.operations.one).not.toHaveBeenCalled();
      expect(mockLibraryInstance.operations.all).not.toHaveBeenCalled();
    });

    it('should throw error when library instance is undefined', async () => {
      mockRegistry.get.mockReturnValue(null);

      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow('Library instance not found for key type array: related');
    });

    it('should handle error message with multiple key types', async () => {
      mockRegistry.get.mockReturnValue(null);
      aggregationDefinition.kta = ['parent', 'child', 'grandchild'];

      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow('Library instance not found for key type array: parent, child, grandchild');
    });

    it('should propagate error from one operation', async () => {
      const mockError = new Error('Database connection failed');
      mockLibraryInstance.operations.one.mockRejectedValue(mockError);

      aggregationDefinition.cardinality = 'one';

      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow('Database connection failed');

      expect(mockLibraryInstance.operations.one).toHaveBeenCalled();
    });

    it('should propagate error from all operation', async () => {
      const mockError = new Error('Query timeout');
      mockLibraryInstance.operations.all.mockRejectedValue(mockError);

      aggregationDefinition.cardinality = 'many';

      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow('Query timeout');

      expect(mockLibraryInstance.operations.all).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle null result from one operation', async () => {
      mockLibraryInstance.operations.one.mockResolvedValue(null);

      aggregationDefinition.cardinality = 'one';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(result.relatedItems).toBeNull();
    });

    it('should handle empty array result from all operation', async () => {
      mockLibraryInstance.operations.all.mockResolvedValue([]);

      aggregationDefinition.cardinality = 'many';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(result.relatedItems).toEqual([]);
    });

    it('should handle undefined result from operations', async () => {
      mockLibraryInstance.operations.one.mockResolvedValue(null);

      aggregationDefinition.cardinality = 'one';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(result.relatedItems).toBeNull();
    });

    it('should work with different property names', async () => {
      const mockResult = { id: 'test-1' };
      mockLibraryInstance.operations.one.mockResolvedValue(mockResult);

      aggregationDefinition.property = 'customPropertyName';
      aggregationDefinition.cardinality = 'one';

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect((result as any).customPropertyName).toEqual(mockResult);
      expect((result as any).relatedItems).toBeUndefined();
    });

    it('should handle complex location key arrays from ikToLKA', async () => {
      const complexLocation = [
        { kt: 'parent', lk: 'p1' },
        { kt: 'child', lk: 'c1' }
      ] as any;

      mockIkToLKA.mockReturnValue(complexLocation);
      mockLibraryInstance.operations.one.mockResolvedValue({ id: 'result' });

      aggregationDefinition.cardinality = 'one';

      await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(mockLibraryInstance.operations.one).toHaveBeenCalledWith({}, complexLocation);
    });

    it('should handle library instance without proper operations', async () => {
      const invalidLibraryInstance = {
        operations: {},
        definition: {},
        registry: {} as any
      };
      mockRegistry.get.mockReturnValue(invalidLibraryInstance as any);

      aggregationDefinition.cardinality = 'one';

      // This should throw when trying to call the missing operation
      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple sequential aggregations on same item', async () => {
      const firstResult = { id: 'first-1', name: 'First Item' };
      const secondResult = { id: 'second-1', name: 'Second Item' };

      // First aggregation
      mockLibraryInstance.operations.one.mockResolvedValueOnce(firstResult);
      aggregationDefinition.cardinality = 'one';
      aggregationDefinition.property = 'firstRelation';

      let result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect((result as any).firstRelation).toEqual(firstResult);

      // Second aggregation on same item
      const secondAggregation: AggregationDefinition = {
        kta: ['other'],
        property: 'secondRelation',
        cardinality: 'many'
      };

      const secondLibraryInstance = {
        operations: {
          one: vi.fn(),
          all: vi.fn().mockResolvedValue([secondResult])
        },
        definition: {},
        registry: {} as any
      };

      mockRegistry.get.mockReturnValue(secondLibraryInstance as any);

      result = await buildAggregation(result, secondAggregation, mockRegistry);

      expect((result as any).firstRelation).toEqual(firstResult); // Should preserve first
      expect((result as any).secondRelation).toEqual([secondResult]); // Should add second
    });

    it('should work with different item key structures', async () => {
      // Test with composite key item
      const compositeKeyItem = {
        key: {
          kt: 'test',
          pk: '123',
          loc: [{ kt: 'parent', lk: 'p1' }]
        }
      } as any;

      const complexLocation = [
        { kt: 'test', lk: '123' },
        { kt: 'parent', lk: 'p1' }
      ] as any;

      mockIkToLKA.mockReturnValue(complexLocation);
      mockLibraryInstance.operations.one.mockResolvedValue({ id: 'composite-result' });

      aggregationDefinition.cardinality = 'one';

      const result = await buildAggregation(compositeKeyItem, aggregationDefinition, mockRegistry);

      expect(mockIkToLKA).toHaveBeenCalledWith(compositeKeyItem.key);
      expect(mockLibraryInstance.operations.one).toHaveBeenCalledWith({}, complexLocation);
      expect((result as any).relatedItems).toEqual({ id: 'composite-result' });
    });
  });

  describe('caching behavior', () => {
    it('should use cached aggregation result when available', async () => {
      const cachedResult = { id: 'cached-result', name: 'Cached Item' };
      const cacheKey = 'related_one_test-key';

      const mockContext = {
        cache: new Map([[cacheKey, cachedResult]]),
        inProgress: new Set()
      } as any;

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry, mockContext);

      // Should use cached result without calling operations
      expect(mockLibraryInstance.operations.one).not.toHaveBeenCalled();
      expect(mockLibraryInstance.operations.all).not.toHaveBeenCalled();
      expect(result.relatedItems).toEqual(cachedResult);
    });

    it('should handle fallback context creation when no context provided', async () => {
      aggregationDefinition.cardinality = 'one';
      mockLibraryInstance.operations.one.mockResolvedValue({ id: 'fallback-result' });

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);

      expect(mockContextManager.withContext).toHaveBeenCalled();
      expect((result as any).relatedItems).toEqual({ id: 'fallback-result' });
    });

    it('should cache results after successful aggregation', async () => {
      const mockContext = {
        cache: new Map(),
        inProgress: new Set()
      } as any;

      aggregationDefinition.cardinality = 'many';
      const aggregationResult = [{ id: 'item1' }, { id: 'item2' }];
      mockLibraryInstance.operations.all.mockResolvedValue(aggregationResult);

      const result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry, mockContext);

      expect((result as any).relatedItems).toEqual(aggregationResult);
      // Check that result was cached
      expect(mockContext.cache.size).toBeGreaterThan(0);
    });
  });

  describe('error conditions', () => {
    it('should throw error when library instance not found', async () => {
      mockRegistry.get.mockReturnValue(null);

      await expect(
        buildAggregation(mockItem as any, aggregationDefinition, mockRegistry)
      ).rejects.toThrow('Library instance not found for key type array: related');
    });

    it('should handle different cardinality values', async () => {
      // Test 'one' cardinality
      aggregationDefinition.cardinality = 'one';
      mockLibraryInstance.operations.one.mockResolvedValue({ id: 'one-result' });

      let result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);
      expect((result as any).relatedItems).toEqual({ id: 'one-result' });

      // Test 'many' cardinality
      aggregationDefinition.cardinality = 'many';
      mockLibraryInstance.operations.all.mockResolvedValue([{ id: 'many-result' }]);

      result = await buildAggregation(mockItem as any, aggregationDefinition, mockRegistry);
      expect((result as any).relatedItems).toEqual([{ id: 'many-result' }]);
    });
  });
});
