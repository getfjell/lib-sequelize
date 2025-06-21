import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item, ItemTypeArray } from '@fjell/core';
import * as Library from '@fjell/lib';
import { ModelStatic } from 'sequelize';
import { createInstance, Instance } from '@/Instance';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';
import { Options } from '@/Options';

// Mock the dependencies
vi.mock('@/Definition');
vi.mock('@/Operations');
vi.mock('@fjell/lib');

const mockCreateDefinition = vi.mocked(createDefinition);
const mockCreateOperations = vi.mocked(createOperations);
const mockLibraryWrapOperations = vi.mocked(Library.wrapOperations);

// Mock Sequelize models
const mockModel1 = {
  name: 'TestModel1',
  tableName: 'test_table_1',
} as ModelStatic<any>;

const mockModel2 = {
  name: 'TestModel2',
  tableName: 'test_table_2',
} as ModelStatic<any>;

describe('Instance', () => {
  const mockDefinition = {
    coordinate: { kt: ['customer'], scopes: ['test'] },
    operations: {},
    queries: {},
    options: {
      deleteOnRemove: false,
      references: [],
      aggregations: [],
    },
  };

  const mockOperations = {
    all: vi.fn(),
    one: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    find: vi.fn(),
    upsert: vi.fn(),
  };

  const mockWrappedOperations = {
    ...mockOperations,
    wrapped: true,
  };

  const mockRegistry = {
    instances: new Map(),
    get: vi.fn(),
    set: vi.fn(),
  } as unknown as Library.Registry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateDefinition.mockReturnValue(mockDefinition as any);
    mockCreateOperations.mockReturnValue(mockOperations as any);
    mockLibraryWrapOperations.mockReturnValue(mockWrappedOperations as any);
  });

  describe('createInstance', () => {
    it('should create instance with single key type', () => {
      const keyTypes: ItemTypeArray<'customer'> = ['customer'];
      const models = [mockModel1];
      const libOptions: Partial<Options<any, any>> = { deleteOnRemove: true };
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with multiple key types', () => {
      const keyTypes: ItemTypeArray<'order', 'customer'> = ['order', 'customer'];
      const models = [mockModel1, mockModel2];
      const libOptions: Partial<Options<any, any, any>> = {
        deleteOnRemove: false,
        references: [{ column: 'customerId', kta: ['customer'], property: 'customer' }],
      };
      const scopes = ['test', 'production'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with default libOptions when not provided', () => {
      const keyTypes: ItemTypeArray<'product'> = ['product'];
      const models = [mockModel1];
      const scopes = ['default'];

      const result = createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, {});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with empty scopes array', () => {
      const keyTypes: ItemTypeArray<'item'> = ['item'];
      const models = [mockModel1];
      const libOptions: Partial<Options<any, any>> = {
        aggregations: [{ kta: ['order'], property: 'orders', cardinality: 'many' }],
      };
      const scopes: string[] = [];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with complex key type hierarchy', () => {
      const keyTypes: ItemTypeArray<'orderLine', 'order', 'customer'> = ['orderLine', 'order', 'customer'];
      const models = [mockModel1, mockModel2];
      const libOptions: Partial<Options<any, any, any, any>> = {
        deleteOnRemove: true,
        references: [
          { column: 'orderId', kta: ['order'], property: 'order' },
          { column: 'customerId', kta: ['customer'], property: 'customer' },
        ],
        aggregations: [
          { kta: ['orderLine'], property: 'orderLines', cardinality: 'many' },
        ],
      };
      const scopes = ['test', 'integration'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with empty models array', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const models: ModelStatic<any>[] = [];
      const libOptions: Partial<Options<any, any>> = {};
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models: [],
        registry: mockRegistry,
      });
    });

    it('should create instance with minimal parameters', () => {
      const keyTypes: ItemTypeArray<'minimal'> = ['minimal'];
      const models = [mockModel1];

      const result = createInstance(keyTypes, models, {}, [], mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, [], {});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should preserve models reference in returned instance', () => {
      const keyTypes: ItemTypeArray<'reference'> = ['reference'];
      const models = [mockModel1, mockModel2];
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(result.models).toBe(models);
      expect(result.models).toHaveLength(2);
      expect(result.models[0]).toBe(mockModel1);
      expect(result.models[1]).toBe(mockModel2);
    });

    it('should preserve registry reference in returned instance', () => {
      const keyTypes: ItemTypeArray<'registry'> = ['registry'];
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(result.registry).toBe(mockRegistry);
    });

    it('should call all dependencies with correct parameters', () => {
      const keyTypes: ItemTypeArray<'verification'> = ['verification'];
      const models = [mockModel1];
      const libOptions: Partial<Options<any, any>> = { deleteOnRemove: true };
      const scopes = ['verify'];

      createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledTimes(1);
      expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, libOptions);

      expect(mockCreateOperations).toHaveBeenCalledTimes(1);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);

      expect(mockLibraryWrapOperations).toHaveBeenCalledTimes(1);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);
    });

    it('should handle different registry instances', () => {
      const differentRegistry = {
        instances: new Map(),
        get: vi.fn(),
        set: vi.fn(),
      } as unknown as Library.Registry;

      const keyTypes: ItemTypeArray<'different'> = ['different'];
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, {}, scopes, differentRegistry);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, differentRegistry);
      expect(mockLibraryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, differentRegistry);
      expect(result.registry).toBe(differentRegistry);
    });
  });

  describe('Instance interface', () => {
    it('should extend Library.Instance and include models property', () => {
      // This test verifies the type structure at compile time
      const instance: Instance<Item<'test'>, 'test'> = {
        definition: mockDefinition as any,
        operations: mockWrappedOperations as any,
        models: [mockModel1],
        registry: mockRegistry,
      };

      expect(instance).toBeDefined();
      expect(instance.definition).toBeDefined();
      expect(instance.operations).toBeDefined();
      expect(instance.models).toBeDefined();
      expect(instance.registry).toBeDefined();
      expect(Array.isArray(instance.models)).toBe(true);
    });

    it('should allow different model configurations', () => {
      const instanceWithMultipleModels: Instance<Item<'multi'>, 'multi'> = {
        definition: mockDefinition as any,
        operations: mockWrappedOperations as any,
        models: [mockModel1, mockModel2],
        registry: mockRegistry,
      };

      const instanceWithNoModels: Instance<Item<'empty'>, 'empty'> = {
        definition: mockDefinition as any,
        operations: mockWrappedOperations as any,
        models: [],
        registry: mockRegistry,
      };

      expect(instanceWithMultipleModels.models).toHaveLength(2);
      expect(instanceWithNoModels.models).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from createDefinition', () => {
      const error = new Error('Definition creation failed');
      mockCreateDefinition.mockImplementation(() => {
        throw error;
      });

      const keyTypes: ItemTypeArray<'error'> = ['error'];
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, models, {}, scopes, mockRegistry);
      }).toThrow('Definition creation failed');
    });

    it('should propagate errors from createOperations', () => {
      const error = new Error('Operations creation failed');
      mockCreateOperations.mockImplementation(() => {
        throw error;
      });

      const keyTypes: ItemTypeArray<'error'> = ['error'];
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, models, {}, scopes, mockRegistry);
      }).toThrow('Operations creation failed');
    });

    it('should propagate errors from Library.wrapOperations', () => {
      const error = new Error('Wrap operations failed');
      mockLibraryWrapOperations.mockImplementation(() => {
        throw error;
      });

      const keyTypes: ItemTypeArray<'error'> = ['error'];
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, models, {}, scopes, mockRegistry);
      }).toThrow('Wrap operations failed');
    });
  });
});
