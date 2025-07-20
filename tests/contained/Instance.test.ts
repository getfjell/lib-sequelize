import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item, ItemTypeArray } from '@fjell/core';
import * as Library from '@fjell/lib';
import { Contained } from '@fjell/lib';
import { ModelStatic } from 'sequelize';
import { createInstance, Instance } from '@/contained/Instance';
import { createOperations } from '@/Operations';
import { createOptions } from '@/Options';
import { createCoordinate } from '@/Coordinate';

// Mock the dependencies
vi.mock('@/Operations');
vi.mock('@/Options');
vi.mock('@/Coordinate');
vi.mock('@fjell/lib', () => ({
  __esModule: true,
  ...vi.importActual('@fjell/lib'),
  Contained: {
    wrapOperations: vi.fn(),
  },
}));

const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockCreateOptions = vi.mocked(createOptions);
const mockCreateOperations = vi.mocked(createOperations);
const mockContainedWrapOperations = vi.mocked(Contained.wrapOperations);

// Mock Sequelize models
const mockModel1 = {
  name: 'TestModel1',
  tableName: 'test_table_1',
  primaryKeyAttribute: 'id',
  getAttributes: vi.fn().mockReturnValue({
    id: {},
    testColumn: {},
    createdAt: {},
    updatedAt: {},
  }),
} as unknown as ModelStatic<any>;

const mockModel2 = {
  name: 'TestModel2',
  tableName: 'test_table_2',
  primaryKeyAttribute: 'id',
  getAttributes: vi.fn().mockReturnValue({
    id: {},
    name: {},
    status: {},
  }),
} as unknown as ModelStatic<any>;

describe('contained/Instance', () => {
  const mockCoordinate = {
    kta: ['customer'],
    scopes: ['test']
  };

  const mockOptions = {
    deleteOnRemove: false,
    references: [],
    aggregations: [],
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
    register: vi.fn(),
    find: vi.fn(),
    libTree: vi.fn(),
  } as unknown as Library.Registry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateCoordinate.mockReturnValue(mockCoordinate as any);
    mockCreateOptions.mockReturnValue(mockOptions as any);
    mockCreateOperations.mockReturnValue(mockOperations as any);
    mockContainedWrapOperations.mockReturnValue(mockWrappedOperations as any);
  });

  describe('createInstance', () => {
    it('should create instance with single key type', () => {
      const keyTypes: ItemTypeArray<'customer'> = ['customer'];
      const models = [mockModel1];
      const libOptions = {
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
        }
      };
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with multiple key types', () => {
      const keyTypes: ItemTypeArray<'customer', 'location'> = ['customer', 'location'];
      const models = [mockModel1, mockModel2];
      const libOptions = {
        validators: {
          onCreate: vi.fn(),
          onUpdate: vi.fn(),
        },
      };
      const scopes = ['test', 'production'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with default libOptions when not provided', () => {
      const keyTypes: ItemTypeArray<'product'> = ['product'];
      const models = [mockModel1];
      const scopes = ['default'];

      const result = createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with empty scopes array', () => {
      const keyTypes: ItemTypeArray<'item'> = ['item'];
      const models = [mockModel1];
      const libOptions = {
        finders: {
          byName: vi.fn(),
        },
      };
      const scopes: string[] = [];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with complex key type hierarchy', () => {
      const keyTypes: ItemTypeArray<'order', 'customer', 'organization'> = ['order', 'customer', 'organization'];
      const models = [mockModel1, mockModel2];
      const libOptions = {
        deleteOnRemove: true,
        aggregations: [{ kta: ['test'], property: 'count', cardinality: 'one' as const }],
      };
      const scopes = ['enterprise'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with empty models array', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const models: ModelStatic<any>[] = [];
      const libOptions = {};
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models: [],
      });
    });

    it('should create instance with minimal parameters', () => {
      const keyTypes: ItemTypeArray<'minimal'> = ['minimal'];
      const models = [mockModel1];

      const result = createInstance(keyTypes, models, {}, [], mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, []);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
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
      const libOptions = {
        validators: {
          onCreate: vi.fn(),
        },
      };
      const scopes = ['verify'];

      createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledTimes(1);
      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);

      expect(mockCreateOptions).toHaveBeenCalledTimes(1);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(mockCreateOperations).toHaveBeenCalledTimes(1);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);

      expect(mockContainedWrapOperations).toHaveBeenCalledTimes(1);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);
    });

    it('should handle different registry instances', () => {
      const differentRegistry = {
        instances: new Map(),
        get: vi.fn(),
        set: vi.fn(),
        register: vi.fn(),
        find: vi.fn(),
        libTree: vi.fn(),
      } as unknown as Library.Registry;

      const keyTypes: ItemTypeArray<'different'> = ['different'];
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, {}, scopes, differentRegistry);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, differentRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, differentRegistry);
      expect(result.registry).toBe(differentRegistry);
    });

    it('should handle complex libOptions with hooks and finders', () => {
      const keyTypes: ItemTypeArray<'complex'> = ['complex'];
      const models = [mockModel1];
      const libOptions = {
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
          preUpdate: vi.fn(),
          postUpdate: vi.fn(),
        },
        finders: {
          byStatus: vi.fn(),
          byName: vi.fn(),
        },
      };
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, libOptions, scopes, mockRegistry);

      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should handle up to 5 key type levels', () => {
      const keyTypes: ItemTypeArray<'level1', 'level2', 'level3', 'level4', 'level5'> =
        ['level1', 'level2', 'level3', 'level4', 'level5'];
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(result).toBeDefined();
      expect(result.models).toBe(models);
    });
  });

  describe('Instance interface', () => {
    it('should extend AbstractSequelizeInstance and include models property', () => {
      // This test verifies the type structure at compile time
      const instance: Instance<Item<'test'>, 'test'> = {
        coordinate: mockCoordinate as any,
        options: mockOptions as any,
        operations: mockWrappedOperations as any,
        models: [mockModel1],
        registry: mockRegistry,
      };

      expect(instance).toBeDefined();
      expect(instance.coordinate).toBeDefined();
      expect(instance.options).toBeDefined();
      expect(instance.operations).toBeDefined();
      expect(instance.models).toBeDefined();
      expect(instance.registry).toBeDefined();
      expect(Array.isArray(instance.models)).toBe(true);
    });

    it('should allow different model configurations', () => {
      const instanceWithMultipleModels: Instance<Item<'multi'>, 'multi'> = {
        coordinate: mockCoordinate as any,
        options: mockOptions as any,
        operations: mockWrappedOperations as any,
        models: [mockModel1, mockModel2],
        registry: mockRegistry,
      };

      const instanceWithNoModels: Instance<Item<'empty'>, 'empty'> = {
        coordinate: mockCoordinate as any,
        options: mockOptions as any,
        operations: mockWrappedOperations as any,
        models: [],
        registry: mockRegistry,
      };

      expect(instanceWithMultipleModels.models).toHaveLength(2);
      expect(instanceWithNoModels.models).toHaveLength(0);
    });

    it('should maintain type safety with generic parameters', () => {
      const instance: Instance<Item<'typed'>, 'typed'> = {
        coordinate: mockCoordinate as any,
        options: mockOptions as any,
        operations: mockWrappedOperations as any,
        models: [mockModel1],
        registry: mockRegistry,
      };

      expect(instance).toBeDefined();
      expect(instance.models).toEqual([mockModel1]);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from createCoordinate', () => {
      const error = new Error('Coordinate creation failed');
      mockCreateCoordinate.mockImplementation(() => {
        throw error;
      });

      const keyTypes: ItemTypeArray<'error'> = ['error'];
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, models, {}, scopes, mockRegistry);
      }).toThrow('Coordinate creation failed');
    });

    it('should propagate errors from createOptions', () => {
      const error = new Error('Options creation failed');
      mockCreateOptions.mockImplementation(() => {
        throw error;
      });

      const keyTypes: ItemTypeArray<'error'> = ['error'];
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, models, {}, scopes, mockRegistry);
      }).toThrow('Options creation failed');
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

    it('should propagate errors from Contained.wrapOperations', () => {
      const error = new Error('Wrap operations failed');
      mockContainedWrapOperations.mockImplementation(() => {
        throw error;
      });

      const keyTypes: ItemTypeArray<'error'> = ['error'];
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, models, {}, scopes, mockRegistry);
      }).toThrow('Wrap operations failed');
    });

    it('should handle undefined parameters gracefully', () => {
      const keyTypes: ItemTypeArray<'undefined'> = ['undefined'];
      const models = [mockModel1];

      // Test with empty libOptions (should use default {})
      const result = createInstance(keyTypes, models, {}, [], mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, []);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(result).toBeDefined();
    });

    it('should handle null models gracefully', () => {
      const keyTypes: ItemTypeArray<'null'> = ['null'];
      const nullModels = null as any;
      const scopes = ['test'];

      expect(() => {
        createInstance(keyTypes, nullModels, {}, scopes, mockRegistry);
      }).not.toThrow();

      expect(mockCreateOperations).toHaveBeenCalledWith(nullModels, mockCoordinate, mockRegistry, mockOptions);
    });
  });

  describe('integration with dependencies', () => {
    it('should pass through all parameters correctly', () => {
      const keyTypes: ItemTypeArray<'integration'> = ['integration'];
      const models = [mockModel1, mockModel2];
      const libOptions = {
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
        },
        validators: {
          onCreate: vi.fn(),
        },
      };
      const scopes = ['integration', 'test'];

      createInstance(keyTypes, models, libOptions as any, scopes, mockRegistry);

      // Verify createCoordinate call
      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);

      // Verify createOptions call
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      // Verify createOperations call
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);

      // Verify Contained.wrapOperations call
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);
    });

    it('should handle dependency return values correctly', () => {
      const customCoordinate = { ...mockCoordinate, custom: true };
      const customOptions = { ...mockOptions, custom: true };
      const customOperations = { ...mockOperations, custom: true };
      const customWrappedOperations = { ...mockWrappedOperations, custom: true };

      mockCreateCoordinate.mockReturnValue(customCoordinate as any);
      mockCreateOptions.mockReturnValue(customOptions as any);
      mockCreateOperations.mockReturnValue(customOperations as any);
      mockContainedWrapOperations.mockReturnValue(customWrappedOperations as any);

      const keyTypes: ItemTypeArray<'custom'> = ['custom'];
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(result.coordinate).toBe(customCoordinate);
      expect(result.options).toBe(customOptions);
      expect(result.operations).toBe(customWrappedOperations);
    });

    it('should maintain correct execution order', () => {
      const executionOrder: string[] = [];

      mockCreateCoordinate.mockImplementation(() => {
        executionOrder.push('createCoordinate');
        return mockCoordinate as any;
      });

      mockCreateOptions.mockImplementation(() => {
        executionOrder.push('createOptions');
        return mockOptions as any;
      });

      mockCreateOperations.mockImplementation(() => {
        executionOrder.push('createOperations');
        return mockOperations as any;
      });

      mockContainedWrapOperations.mockImplementation(() => {
        executionOrder.push('wrapOperations');
        return mockWrappedOperations as any;
      });

      const keyTypes: ItemTypeArray<'order'> = ['order'];
      const models = [mockModel1];
      const scopes = ['test'];

      createInstance(keyTypes, models, {}, scopes, mockRegistry);

      expect(executionOrder).toEqual(['createCoordinate', 'createOptions', 'createOperations', 'wrapOperations']);
    });
  });
});
