import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '@fjell/core';
import { createOperations } from '../src/Operations';
import { ModelStatic } from 'sequelize';
import { Options } from '../src/Options';

// Mock all the operation modules
vi.mock('../src/ops/all');
vi.mock('../src/ops/one');
vi.mock('../src/ops/create');
vi.mock('../src/ops/update');
vi.mock('../src/ops/get');
vi.mock('../src/ops/remove');
vi.mock('../src/ops/find');

// Import the mocked functions
import { getAllOperation } from '../src/ops/all';
import { getOneOperation } from '../src/ops/one';
import { getCreateOperation } from '../src/ops/create';
import { getUpdateOperation } from '../src/ops/update';
import { getGetOperation } from '../src/ops/get';
import { getRemoveOperation } from '../src/ops/remove';
import { getFindOperation } from '../src/ops/find';

// Mock the operation functions
const mockGetAllOperation = vi.mocked(getAllOperation);
const mockGetOneOperation = vi.mocked(getOneOperation);
const mockGetCreateOperation = vi.mocked(getCreateOperation);
const mockGetUpdateOperation = vi.mocked(getUpdateOperation);
const mockGetGetOperation = vi.mocked(getGetOperation);
const mockGetRemoveOperation = vi.mocked(getRemoveOperation);
const mockGetFindOperation = vi.mocked(getFindOperation);

describe('Operations', () => {
  // Mock interfaces and types
  interface TestItem extends Item<'test', 'loc1', 'loc2'> {
    id: string;
    name: string;
  }

  interface AnotherTestItem extends Item<'another'> {
    id: string;
    value: number;
  }

  const mockRegistry = {
    type: 'lib',
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    list: vi.fn(),
  } as any;

  const mockCoordinate = {
    kta: ['test', 'loc1', 'loc2'],
    scopes: ['sequelize', 'test'],
  };

  const mockOptions: Options<TestItem, 'test', 'loc1', 'loc2'> = {
    deleteOnRemove: false,
    references: [],
    aggregations: [],
    hooks: {},
    validators: {},
    finders: {},
    actions: {},
    allActions: {},
    facets: {},
    allFacets: {},
  };

  const mockModels: ModelStatic<any>[] = [
    {
      name: 'TestModel',
      tableName: 'test_table',
    } as ModelStatic<any>,
  ];

  const mockOperationFunctions = {
    all: vi.fn(),
    one: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    find: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock all operation creation functions to return mock functions
    mockGetAllOperation.mockReturnValue(mockOperationFunctions.all);
    mockGetOneOperation.mockReturnValue(mockOperationFunctions.one);
    mockGetCreateOperation.mockReturnValue(mockOperationFunctions.create);
    mockGetUpdateOperation.mockReturnValue(mockOperationFunctions.update);
    mockGetGetOperation.mockReturnValue(mockOperationFunctions.get);
    mockGetRemoveOperation.mockReturnValue(mockOperationFunctions.remove);
    mockGetFindOperation.mockReturnValue(mockOperationFunctions.find);
  });

  describe('createOperations', () => {
    it('should create operations object with all required methods', () => {
      const operations = createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations).toBeDefined();
      expect(operations.all).toBeDefined();
      expect(operations.one).toBeDefined();
      expect(operations.create).toBeDefined();
      expect(operations.update).toBeDefined();
      expect(operations.get).toBeDefined();
      expect(operations.remove).toBeDefined();
      expect(operations.find).toBeDefined();
      expect(operations.upsert).toBeDefined();
    });

    it('should call all operation factory functions with correct parameters', () => {
      const definition = { coordinate: mockCoordinate, options: mockOptions };
      createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(mockGetAllOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
      expect(mockGetOneOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
      expect(mockGetCreateOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
      expect(mockGetUpdateOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
      expect(mockGetGetOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
      expect(mockGetRemoveOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
      expect(mockGetFindOperation).toHaveBeenCalledWith(mockModels, definition, mockRegistry);
    });

    it('should return operations object with correct function references', () => {
      const operations = createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations.all).toBe(mockOperationFunctions.all);
      expect(operations.one).toBe(mockOperationFunctions.one);
      expect(operations.create).toBe(mockOperationFunctions.create);
      expect(operations.update).toBe(mockOperationFunctions.update);
      expect(operations.get).toBe(mockOperationFunctions.get);
      expect(operations.remove).toBe(mockOperationFunctions.remove);
      expect(operations.find).toBe(mockOperationFunctions.find);
    });

    it('should work with empty models array', () => {
      const emptyModels: ModelStatic<any>[] = [];
      const operations = createOperations(emptyModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations).toBeDefined();
      expect(typeof operations.all).toBe('function');
      expect(typeof operations.one).toBe('function');
      expect(typeof operations.create).toBe('function');
      expect(typeof operations.update).toBe('function');
      expect(typeof operations.get).toBe('function');
      expect(typeof operations.remove).toBe('function');
      expect(typeof operations.find).toBe('function');
      expect(typeof operations.upsert).toBe('function');
    });

    it('should work with multiple models', () => {
      const multipleModels = [
        { name: 'Model1', tableName: 'table1' } as ModelStatic<any>,
        { name: 'Model2', tableName: 'table2' } as ModelStatic<any>,
      ];

      const operations = createOperations(multipleModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations).toBeDefined();
      expect(operations.all).toBe(mockOperationFunctions.all);
      expect(operations.one).toBe(mockOperationFunctions.one);
    });

    it('should handle different coordinate types', () => {
      const operations = createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations).toBeDefined();
      expect(typeof operations.all).toBe('function');
      expect(typeof operations.one).toBe('function');
      expect(typeof operations.create).toBe('function');
      expect(typeof operations.update).toBe('function');
      expect(typeof operations.get).toBe('function');
      expect(typeof operations.remove).toBe('function');
      expect(typeof operations.find).toBe('function');
      expect(typeof operations.upsert).toBe('function');
    });

    it('should handle different option configurations', () => {
      const customOptions: Options<AnotherTestItem, 'another'> = {
        deleteOnRemove: true,
        references: [{ column: 'userId', kta: ['user'], property: 'user' }],
        aggregations: [{ kta: ['order'], property: 'orders', cardinality: 'many' }],
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
        },
        validators: {},
        finders: {},
        actions: {},
        allActions: {},
        facets: {},
        allFacets: {},
      };

      const anotherCoordinate = { kta: ['another'], scopes: ['sequelize'] };
      const operations = createOperations(mockModels, anotherCoordinate as any, mockRegistry, customOptions);

      expect(operations).toBeDefined();
      expect(typeof operations.all).toBe('function');
    });

    it('should call operation factory functions exactly once each', () => {
      createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(mockGetAllOperation).toHaveBeenCalledTimes(1);
      expect(mockGetOneOperation).toHaveBeenCalledTimes(1);
      expect(mockGetCreateOperation).toHaveBeenCalledTimes(1);
      expect(mockGetUpdateOperation).toHaveBeenCalledTimes(1);
      expect(mockGetGetOperation).toHaveBeenCalledTimes(1);
      expect(mockGetRemoveOperation).toHaveBeenCalledTimes(1);
      expect(mockGetFindOperation).toHaveBeenCalledTimes(1);
    });

    it('should create new operations object on each call', () => {
      const operations1 = createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);
      const operations2 = createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations1).not.toBe(operations2);
      expect(operations1.all).toBe(operations2.all); // Same mock function
      expect(operations1.create).toBe(operations2.create); // Same mock function
    });

    it('should include upsert operation that throws error', async () => {
      const operations = createOperations(mockModels, mockCoordinate as any, mockRegistry, mockOptions);

      expect(operations.upsert).toBeDefined();
      expect(typeof operations.upsert).toBe('function');

      await expect(operations.upsert({} as any, {} as any)).rejects.toThrow('Not implemented');
    });

    it('should maintain type safety for operation functions', () => {
      const operations = createOperations<TestItem, 'test', 'loc1', 'loc2'>(
        mockModels,
        mockCoordinate as any,
        mockRegistry,
        mockOptions
      );

      expect(operations).toBeDefined();
      expect(typeof operations.all).toBe('function');
      expect(typeof operations.one).toBe('function');
      expect(typeof operations.create).toBe('function');
      expect(typeof operations.update).toBe('function');
      expect(typeof operations.get).toBe('function');
      expect(typeof operations.remove).toBe('function');
      expect(typeof operations.find).toBe('function');
      expect(typeof operations.upsert).toBe('function');
    });
  });
});
