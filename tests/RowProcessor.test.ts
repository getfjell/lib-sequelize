import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Model } from 'sequelize';
import { AllItemTypeArrays } from '@fjell/core';
import * as Library from '@fjell/lib';

// Mock all dependencies
vi.mock('../src/logger', () => ({
  default: {
    get: vi.fn().mockReturnValue({
      default: vi.fn(),
      debug: vi.fn()
    })
  }
}));
vi.mock('../src/KeyMaster');
vi.mock('@fjell/lib', async () => {
  const actual = await vi.importActual('@fjell/lib');
  return {
    ...actual,
    // Mock the builders
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buildReference: vi.fn().mockImplementation(async (item, def, _registry, _context) => {
      // Mock implementation that adds the reference property
      if (def.property === 'reference1') {
        item.reference1 = { data: 'ref1' };
      } else if (def.property === 'reference2') {
        item.reference2 = { data: 'ref2' };
      } else if (def.property === 'reference') {
        item.reference = { data: 'referenced' };
      }
      return item;
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buildAggregation: vi.fn().mockImplementation(async (item, def, _registry, _context) => {
      // Mock implementation that adds the aggregation property
      if (def.property === 'aggregation1') {
        item.aggregation1 = { count: 10 };
      } else if (def.property === 'aggregation2') {
        item.aggregation2 = { count: 20 };
      } else if (def.property === 'aggregation') {
        item.aggregation = { count: 5 };
      }
      return item;
    })
  };
});
vi.mock('../src/util/general');
vi.mock('../src/EventCoordinator');

import { addKey } from '../src/KeyMaster';
import { processRow } from '../src/RowProcessor';
import { buildAggregation, buildReference } from '@fjell/lib';
import { stringifyJSON } from '../src/util/general';
import { populateEvents } from '../src/EventCoordinator';
import { AggregationDefinition, ReferenceDefinition } from '../src/Options';
import LibLogger from '../src/logger';

describe('RowProcessor', () => {
  let mockLoggerDefault: Mock;
  let mockRow: Model<any, any>;
  let mockKeyTypes: AllItemTypeArrays<'test'>;
  let mockRegistry: Library.Registry;
  let mockReferenceDefinitions: ReferenceDefinition[];
  let mockAggregationDefinitions: AggregationDefinition[];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get the mocked logger function
    const mockLogger = (LibLogger.get as Mock)();
    mockLoggerDefault = mockLogger.default;

    // Setup row mock
    mockRow = {
      get: vi.fn().mockReturnValue({ id: 1, name: 'test' })
    } as any;

    // Setup key types
    mockKeyTypes = ['test'] as AllItemTypeArrays<'test'>;

    // Setup registry mock
    mockRegistry = {} as Library.Registry;

    // Setup definitions
    mockReferenceDefinitions = [];
    mockAggregationDefinitions = [];

    // Setup utility mocks
    (stringifyJSON as Mock).mockImplementation((obj) => JSON.stringify(obj));
    (addKey as Mock).mockImplementation((_row, item) => ({
      ...item,
      key: { kt: 'test', pk: '1' }
    }));
    (populateEvents as Mock).mockImplementation((item) => ({
      ...item,
      events: []
    }));
    (buildReference as Mock).mockImplementation((item) => item);
    (buildAggregation as Mock).mockImplementation((item) => item);
  });

  describe('processRow', () => {
    it('should process a basic row without references or aggregations', async () => {
      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(mockRow.get).toHaveBeenCalledWith({ plain: true });
      expect(addKey).toHaveBeenCalledWith(mockRow, { id: 1, name: 'test' }, mockKeyTypes);
      expect(populateEvents).toHaveBeenCalledWith({
        id: 1,
        name: 'test',
        key: { kt: 'test', pk: '1' }
      });
      expect(result).toEqual({
        id: 1,
        name: 'test',
        key: { kt: 'test', pk: '1' },
        events: []
      });
    });

    it('should log processing steps', async () => {
      await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(mockLoggerDefault).toHaveBeenCalledWith('Processing Row', { row: mockRow });
      expect(mockLoggerDefault).toHaveBeenCalledWith(
        'Adding Key to Item with Key Types: %s',
        JSON.stringify(mockKeyTypes)
      );
      expect(mockLoggerDefault).toHaveBeenCalledWith(
        'Key Added to Item: %s',
        JSON.stringify({ kt: 'test', pk: '1' })
      );
    });

    it('should process reference definitions when provided', async () => {
      const mockReference: ReferenceDefinition = {
        column: 'referenceId',
        kta: ['referenced'],
        property: 'reference'
      };
      mockReferenceDefinitions = [mockReference];

      (buildReference as Mock).mockImplementation((item) => ({
        ...item,
        reference: { data: 'referenced' }
      }));

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(buildReference).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'test',
          key: { kt: 'test', pk: '1' },
          events: []
        }),
        mockReference,
        mockRegistry,
        expect.any(Object)
      );
      expect(mockLoggerDefault).toHaveBeenCalledWith(
        'Processing Reference for %s to %s',
        'test',
        JSON.stringify(['referenced'])
      );
      expect(result.reference).toEqual({ data: 'referenced' });
    });

    it('should process multiple reference definitions', async () => {
      const mockReference1: ReferenceDefinition = {
        column: 'reference1Id',
        kta: ['ref1'],
        property: 'reference1'
      };
      const mockReference2: ReferenceDefinition = {
        column: 'reference2Id',
        kta: ['ref2'],
        property: 'reference2'
      };
      mockReferenceDefinitions = [mockReference1, mockReference2];

      let callCount = 0;
      (buildReference as Mock).mockImplementation((item) => ({
        ...item,
        [`reference${++callCount}`]: { data: `ref${callCount}` }
      }));

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(buildReference).toHaveBeenCalledTimes(2);
      expect(result.reference1).toEqual({ data: 'ref1' });
      expect(result.reference2).toEqual({ data: 'ref2' });
    });

    it('should process aggregation definitions when provided', async () => {
      const mockAggregation: AggregationDefinition = {
        kta: ['aggregated'],
        property: 'aggregation',
        cardinality: 'many'
      };
      mockAggregationDefinitions = [mockAggregation];

      (buildAggregation as Mock).mockImplementation((item) => ({
        ...item,
        aggregation: { count: 5 }
      }));

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(buildAggregation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'test',
          key: { kt: 'test', pk: '1' },
          events: []
        }),
        mockAggregation,
        mockRegistry,
        expect.any(Object)
      );
      expect(mockLoggerDefault).toHaveBeenCalledWith(
        'Processing Aggregation for %s from %s',
        'test',
        JSON.stringify(['aggregated'])
      );
      expect(result.aggregation).toEqual({ count: 5 });
    });

    it('should process multiple aggregation definitions', async () => {
      const mockAgg1: AggregationDefinition = {
        kta: ['agg1'],
        property: 'aggregation1',
        cardinality: 'many'
      };
      const mockAgg2: AggregationDefinition = {
        kta: ['agg2'],
        property: 'aggregation2',
        cardinality: 'one'
      };
      mockAggregationDefinitions = [mockAgg1, mockAgg2];

      let callCount = 0;
      (buildAggregation as Mock).mockImplementation((item) => ({
        ...item,
        [`aggregation${++callCount}`]: { count: callCount * 10 }
      }));

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(buildAggregation).toHaveBeenCalledTimes(2);
      expect(result.aggregation1).toEqual({ count: 10 });
      expect(result.aggregation2).toEqual({ count: 20 });
    });

    it('should process both references and aggregations', async () => {
      const mockReference: ReferenceDefinition = {
        column: 'referenceId',
        kta: ['referenced'],
        property: 'reference'
      };
      const mockAggregation: AggregationDefinition = {
        kta: ['aggregated'],
        property: 'aggregation',
        cardinality: 'many'
      };

      mockReferenceDefinitions = [mockReference];
      mockAggregationDefinitions = [mockAggregation];

      (buildReference as Mock).mockImplementation((item) => ({
        ...item,
        reference: { data: 'referenced' }
      }));
      (buildAggregation as Mock).mockImplementation((item) => ({
        ...item,
        aggregation: { count: 5 }
      }));

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(buildReference).toHaveBeenCalledTimes(1);
      expect(buildAggregation).toHaveBeenCalledTimes(1);
      expect(result.reference).toEqual({ data: 'referenced' });
      expect(result.aggregation).toEqual({ count: 5 });
    });

    it('should handle empty reference and aggregation definitions', async () => {
      mockReferenceDefinitions = [];
      mockAggregationDefinitions = [];

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(buildReference).not.toHaveBeenCalled();
      expect(buildAggregation).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        key: { kt: 'test', pk: '1' },
        events: []
      });
    });

    it('should handle null reference and aggregation definitions', async () => {
      const result = await processRow(
        mockRow,
        mockKeyTypes,
        null as any,
        null as any,
        mockRegistry
      );

      expect(buildReference).not.toHaveBeenCalled();
      expect(buildAggregation).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        key: { kt: 'test', pk: '1' },
        events: []
      });
    });

    it('should log the final processed result', async () => {
      const expectedResult = {
        id: 1,
        name: 'test',
        key: { kt: 'test', pk: '1' },
        events: []
      };

      await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(mockLoggerDefault).toHaveBeenCalledWith(
        'Processed Row: %j',
        JSON.stringify(expectedResult)
      );
    });

    it('should handle errors from buildReference gracefully', async () => {
      const mockReference: ReferenceDefinition = {
        column: 'referenceId',
        kta: ['referenced'],
        property: 'reference'
      };
      mockReferenceDefinitions = [mockReference];

      const error = new Error('Reference build failed');
      (buildReference as Mock).mockRejectedValue(error);

      await expect(processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      )).rejects.toThrow('Reference build failed');
    });

    it('should handle errors from buildAggregation gracefully', async () => {
      const mockAggregation: AggregationDefinition = {
        kta: ['aggregated'],
        property: 'aggregation',
        cardinality: 'many'
      };
      mockAggregationDefinitions = [mockAggregation];

      const error = new Error('Aggregation build failed');
      (buildAggregation as Mock).mockRejectedValue(error);

      await expect(processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      )).rejects.toThrow('Aggregation build failed');
    });

    it('should handle complex row data', async () => {
      const complexData = {
        id: 1,
        name: 'test',
        metadata: { type: 'complex', values: [1, 2, 3] },
        nested: { deep: { value: 'nested' } }
      };

      mockRow.get = vi.fn().mockReturnValue(complexData);

      const result = await processRow(
        mockRow,
        mockKeyTypes,
        mockReferenceDefinitions,
        mockAggregationDefinitions,
        mockRegistry
      );

      expect(addKey).toHaveBeenCalledWith(mockRow, complexData, mockKeyTypes);
      expect(result).toEqual({
        ...complexData,
        key: { kt: 'test', pk: '1' },
        events: []
      });
    });
  });
});
