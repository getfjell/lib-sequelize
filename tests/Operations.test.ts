import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComKey, Item, PriKey, TypesProperties } from '@fjell/core';
import * as Library from '@fjell/lib';
import { createOperations } from '@/Operations';
import { Definition } from '@/Definition';
import { ModelStatic } from 'sequelize';

// Mock all the operation modules
vi.mock('@/ops/all');
vi.mock('@/ops/one');
vi.mock('@/ops/create');
vi.mock('@/ops/update');
vi.mock('@/ops/get');
vi.mock('@/ops/remove');
vi.mock('@/ops/find');

// Import the mocked functions
import { getAllOperation } from '@/ops/all';
import { getOneOperation } from '@/ops/one';
import { getCreateOperation } from '@/ops/create';
import { getUpdateOperation } from '@/ops/update';
import { getGetOperation } from '@/ops/get';
import { getRemoveOperation } from '@/ops/remove';
import { getFindOperation } from '@/ops/find';

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

  type TestItemProperties = TypesProperties<TestItem, 'test', 'loc1', 'loc2'>;

  // Mock operation functions
  const mockAllFunction = vi.fn();
  const mockOneFunction = vi.fn();
  const mockCreateFunction = vi.fn();
  const mockUpdateFunction = vi.fn();
  const mockGetFunction = vi.fn();
  const mockRemoveFunction = vi.fn();
  const mockFindFunction = vi.fn();

  // Mock models
  const mockModels = [
    {
      name: 'TestModel',
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      associations: {},
    }
  ] as unknown as ModelStatic<any>[];

  // Mock definition
  const mockDefinition = {
    coordinate: {
      kt: 'test',
      kta: ['test', 'loc1', 'loc2'],
      scopes: ['sequelize']
    },
    options: {
      deleteOnRemove: false,
      references: [],
      aggregations: []
    }
  } as unknown as Definition<TestItem, 'test', 'loc1', 'loc2'>;

  // Mock registry
  const mockRegistry = {
    find: vi.fn(),
    register: vi.fn(),
    get: vi.fn()
  } as unknown as Library.Registry;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock return values
    mockGetAllOperation.mockReturnValue(mockAllFunction);
    mockGetOneOperation.mockReturnValue(mockOneFunction);
    mockGetCreateOperation.mockReturnValue(mockCreateFunction);
    mockGetUpdateOperation.mockReturnValue(mockUpdateFunction);
    mockGetGetOperation.mockReturnValue(mockGetFunction);
    mockGetRemoveOperation.mockReturnValue(mockRemoveFunction);
    mockGetFindOperation.mockReturnValue(mockFindFunction);
  });

  describe('createOperations', () => {
    it('should create operations object with all required methods', () => {
      const operations = createOperations(mockModels, mockDefinition, mockRegistry);

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
      createOperations(mockModels, mockDefinition, mockRegistry);

      expect(mockGetAllOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
      expect(mockGetOneOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
      expect(mockGetCreateOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
      expect(mockGetUpdateOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
      expect(mockGetGetOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
      expect(mockGetRemoveOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
      expect(mockGetFindOperation).toHaveBeenCalledWith(mockModels, mockDefinition, mockRegistry);
    });

    it('should assign correct operation functions to operations object', () => {
      const operations = createOperations(mockModels, mockDefinition, mockRegistry);

      expect(operations.all).toBe(mockAllFunction);
      expect(operations.one).toBe(mockOneFunction);
      expect(operations.create).toBe(mockCreateFunction);
      expect(operations.update).toBe(mockUpdateFunction);
      expect(operations.get).toBe(mockGetFunction);
      expect(operations.remove).toBe(mockRemoveFunction);
      expect(operations.find).toBe(mockFindFunction);
    });

    it('should throw error when upsert is called', async () => {
      const operations = createOperations(mockModels, mockDefinition, mockRegistry);

      const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
      const itemProperties = { name: 'test' } as TestItemProperties;

      await expect(operations.upsert(key, itemProperties)).rejects.toThrow('Not implemented');
    });

    it('should work with empty models array', () => {
      const emptyModels: ModelStatic<any>[] = [];
      const operations = createOperations(emptyModels, mockDefinition, mockRegistry);

      expect(operations).toBeDefined();
      expect(mockGetAllOperation).toHaveBeenCalledWith(emptyModels, mockDefinition, mockRegistry);
    });

    it('should work with multiple models', () => {
      const multipleModels = [
        mockModels[0],
        {
          name: 'AnotherTestModel',
          findAll: vi.fn(),
          findOne: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          destroy: vi.fn(),
          associations: {},
        }
      ] as unknown as ModelStatic<any>[];

      const operations = createOperations(multipleModels, mockDefinition, mockRegistry);

      expect(operations).toBeDefined();
      expect(mockGetAllOperation).toHaveBeenCalledWith(multipleModels, mockDefinition, mockRegistry);
    });

    it('should preserve function signatures for all operations', () => {
      const operations = createOperations(mockModels, mockDefinition, mockRegistry);

      // Test that all operations can be called with expected parameters
      expect(typeof operations.all).toBe('function');
      expect(typeof operations.one).toBe('function');
      expect(typeof operations.create).toBe('function');
      expect(typeof operations.update).toBe('function');
      expect(typeof operations.get).toBe('function');
      expect(typeof operations.remove).toBe('function');
      expect(typeof operations.find).toBe('function');
      expect(typeof operations.upsert).toBe('function');
    });

    it('should handle different generic types', () => {
      interface AnotherTestItem extends Item<'another'> {
        id: string;
        value: number;
      }

      const anotherDefinition = {
        coordinate: {
          kt: 'another',
          kta: ['another'],
          scopes: ['sequelize']
        },
        options: {
          deleteOnRemove: true,
          references: [],
          aggregations: []
        }
      } as unknown as Definition<AnotherTestItem, 'another'>;

      const operations = createOperations(mockModels, anotherDefinition, mockRegistry);

      expect(operations).toBeDefined();
      expect(mockGetAllOperation).toHaveBeenCalledWith(mockModels, anotherDefinition, mockRegistry);
    });

    it('should call each operation factory function exactly once', () => {
      createOperations(mockModels, mockDefinition, mockRegistry);

      expect(mockGetAllOperation).toHaveBeenCalledTimes(1);
      expect(mockGetOneOperation).toHaveBeenCalledTimes(1);
      expect(mockGetCreateOperation).toHaveBeenCalledTimes(1);
      expect(mockGetUpdateOperation).toHaveBeenCalledTimes(1);
      expect(mockGetGetOperation).toHaveBeenCalledTimes(1);
      expect(mockGetRemoveOperation).toHaveBeenCalledTimes(1);
      expect(mockGetFindOperation).toHaveBeenCalledTimes(1);
    });

    it('should return the same operation functions on subsequent calls', () => {
      const operations1 = createOperations(mockModels, mockDefinition, mockRegistry);
      const operations2 = createOperations(mockModels, mockDefinition, mockRegistry);

      // Should create new operation objects but use the same factory functions
      expect(operations1).not.toBe(operations2);
      expect(operations1.all).toBe(mockAllFunction);
      expect(operations2.all).toBe(mockAllFunction);
    });
  });

  describe('upsert implementation', () => {
    it('should throw error with specific message', async () => {
      const operations = createOperations(mockModels, mockDefinition, mockRegistry);

      try {
        await operations.upsert({} as PriKey<'test'>, {} as TestItemProperties);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Not implemented');
      }
    });

    it('should throw error regardless of parameters', async () => {
      const operations = createOperations(mockModels, mockDefinition, mockRegistry);

      const testCases = [
        [{ kt: 'test', pk: '1' } as PriKey<'test'>, { name: 'test1' } as TestItemProperties],
        [{ kt: 'test', pk: '2' } as PriKey<'test'>, { name: 'test2' } as TestItemProperties],
        [{ kt: 'test', pk: '3', loc: [{ kt: 'loc1', lk: 'a' }] } as ComKey<'test', 'loc1'>, { name: 'test3' } as TestItemProperties]
      ];

      for (const [key, props] of testCases) {
        await expect(operations.upsert(key as any, props as any)).rejects.toThrow('Not implemented');
      }
    });
  });
});
