import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '@fjell/core';
import * as Library from '@fjell/lib';
import { Primary } from '@fjell/lib';
import { ModelStatic } from 'sequelize';
import { createInstance, Instance } from '@/primary/Instance';
import { createOperations } from '@/Operations';
import { createOptions } from '@/Options';
import { createCoordinate } from '@fjell/registry';

// Mock the dependencies
vi.mock('@/Operations');
vi.mock('@/Options');
vi.mock('@fjell/registry', () => ({
  __esModule: true,
  ...vi.importActual('@fjell/registry'),
  createCoordinate: vi.fn(),
}));
vi.mock('@/logger', () => ({
  default: {
    get: vi.fn().mockReturnValue({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));
vi.mock('@fjell/lib', () => ({
  __esModule: true,
  ...vi.importActual('@fjell/lib'),
  Primary: {
    wrapOperations: vi.fn(),
  },
}));

const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockCreateOptions = vi.mocked(createOptions);
const mockCreateOperations = vi.mocked(createOperations);
const mockPrimaryWrapOperations = vi.mocked(Primary.wrapOperations);

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

describe('primary/Instance', () => {
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
    mockPrimaryWrapOperations.mockReturnValue(mockWrappedOperations as any);
  });

  describe('createInstance', () => {
    it('should create instance with single key type', () => {
      const keyType = 'customer';
      const models = [mockModel1];
      const libOptions = {
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
        }
      };
      const scopes = ['test'];

      const result = createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with multiple models', () => {
      const keyType = 'order';
      const models = [mockModel1, mockModel2];
      const libOptions = {
        validators: {
          onCreate: vi.fn(),
          onUpdate: vi.fn(),
        },
      };
      const scopes = ['test', 'production'];

      const result = createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with default libOptions when not provided', () => {
      const keyType = 'product';
      const models = [mockModel1];
      const scopes = ['default'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with empty scopes array', () => {
      const keyType = 'item';
      const models = [mockModel1];
      const libOptions = {
        finders: {
          byName: vi.fn(),
        },
      };
      const scopes: string[] = [];

      const result = createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize']);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should create instance with empty models array', () => {
      const keyType = 'test';
      const models: ModelStatic<any>[] = [];
      const libOptions = {};
      const scopes = ['test'];

      const result = createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models: [],
      });
    });

    it('should create instance with minimal parameters (default values)', () => {
      const keyType = 'minimal';
      const models = [mockModel1];

      const result = createInstance(keyType, models, {}, [], mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize']);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should preserve models reference in returned instance', () => {
      const keyType = 'reference';
      const models = [mockModel1, mockModel2];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(result.models).toBe(models);
      expect(result.models).toHaveLength(2);
      expect(result.models[0]).toBe(mockModel1);
      expect(result.models[1]).toBe(mockModel2);
    });

    it('should preserve registry reference in returned instance', () => {
      const keyType = 'registry';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(result.registry).toBe(mockRegistry);
    });

    it('should call all dependencies with correct parameters', () => {
      const keyType = 'verification';
      const models = [mockModel1];
      const libOptions = {
        validators: {
          onCreate: vi.fn(),
        },
      };
      const scopes = ['verify'];

      createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledTimes(1);
      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);

      expect(mockCreateOptions).toHaveBeenCalledTimes(1);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(mockCreateOperations).toHaveBeenCalledTimes(1);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);

      expect(mockPrimaryWrapOperations).toHaveBeenCalledTimes(1);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);
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

      const keyType = 'different';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, differentRegistry);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, differentRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, differentRegistry);
      expect(result.registry).toBe(differentRegistry);
    });

    it('should handle complex libOptions with hooks and finders', () => {
      const keyType = 'complex';
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

      const result = createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models,
      });
    });

    it('should convert single keyType to array for createCoordinate', () => {
      const keyType = 'single';
      const models = [mockModel1];
      const scopes = ['test'];

      createInstance(keyType, models, {}, scopes, mockRegistry);

      // Verify that the single keyType is wrapped in an array
      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);
    });

    it('should handle string key types correctly', () => {
      const stringKeyTypes = ['order', 'customer', 'product', 'user', 'item'];

      for (const keyType of stringKeyTypes) {
        createInstance(keyType as any, [mockModel1], {}, ['test'], mockRegistry);
        expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', 'test']);
      }
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

      mockPrimaryWrapOperations.mockImplementation(() => {
        executionOrder.push('wrapOperations');
        return mockWrappedOperations as any;
      });

      const keyType = 'order';
      const models = [mockModel1];
      const scopes = ['test'];

      createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(executionOrder).toEqual(['createCoordinate', 'createOptions', 'createOperations', 'wrapOperations']);
    });

    it('should handle dependency return values correctly', () => {
      const customCoordinate = { ...mockCoordinate, custom: true };
      const customOptions = { ...mockOptions, custom: true };
      const customOperations = { ...mockOperations, custom: true };
      const customWrappedOperations = { ...mockWrappedOperations, custom: true };

      mockCreateCoordinate.mockReturnValue(customCoordinate as any);
      mockCreateOptions.mockReturnValue(customOptions as any);
      mockCreateOperations.mockReturnValue(customOperations as any);
      mockPrimaryWrapOperations.mockReturnValue(customWrappedOperations as any);

      const keyType = 'custom';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(result.coordinate).toBe(customCoordinate);
      expect(result.options).toBe(customOptions);
      expect(result.operations).toBe(customWrappedOperations);
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

      const keyType = 'error';
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, models, {}, scopes, mockRegistry);
      }).toThrow('Coordinate creation failed');
    });

    it('should propagate errors from createOptions', () => {
      const error = new Error('Options creation failed');
      mockCreateOptions.mockImplementation(() => {
        throw error;
      });

      const keyType = 'error';
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, models, {}, scopes, mockRegistry);
      }).toThrow('Options creation failed');
    });

    it('should propagate errors from createOperations', () => {
      const error = new Error('Operations creation failed');
      mockCreateOperations.mockImplementation(() => {
        throw error;
      });

      const keyType = 'error';
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, models, {}, scopes, mockRegistry);
      }).toThrow('Operations creation failed');
    });

    it('should propagate errors from Primary.wrapOperations', () => {
      const error = new Error('Wrap operations failed');
      mockPrimaryWrapOperations.mockImplementation(() => {
        throw error;
      });

      const keyType = 'error';
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, models, {}, scopes, mockRegistry);
      }).toThrow('Wrap operations failed');
    });

    it('should handle undefined parameters gracefully', () => {
      const keyType = 'undefined';
      const models = [mockModel1];

      // Test with empty libOptions (should use default {})
      const result = createInstance(keyType, models, {}, [], mockRegistry);

      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize']);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(result).toBeDefined();
    });

    it('should handle null models gracefully', () => {
      const keyType = 'null';
      const nullModels = null as any;
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, nullModels, {}, scopes, mockRegistry);
      }).not.toThrow();

      expect(mockCreateOperations).toHaveBeenCalledWith(nullModels, mockCoordinate, mockRegistry, mockOptions);
    });
  });

  describe('parameter validation', () => {
    it('should accept various keyType strings', () => {
      const keyTypes = ['customer', 'order', 'product', 'user', 'item'];

      keyTypes.forEach(keyType => {
        const result = createInstance(keyType as any, [mockModel1], {}, ['test'], mockRegistry);
        expect(result).toBeDefined();
        expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', 'test']);
      });
    });

    it('should handle different scope configurations', () => {
      const keyType = 'test';

      const scopeConfigurations = [
        [],
        ['single'],
        ['multiple', 'scopes'],
        ['production'],
        ['test', 'development', 'staging'],
      ];

      scopeConfigurations.forEach(scopes => {
        createInstance(keyType, [mockModel1], {}, scopes, mockRegistry);
        expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);
      });
    });

    it('should handle various libOptions configurations', () => {
      const keyType = 'test';
      const models = [mockModel1];
      const scopes = ['test'];

      const libOptionsConfigurations = [
        {},
        { hooks: { preCreate: vi.fn() } },
        { validators: { onCreate: vi.fn() } },
        { finders: { byName: vi.fn(), byStatus: vi.fn() } },
        {
          hooks: { preCreate: vi.fn(), postCreate: vi.fn() },
          validators: { onCreate: vi.fn(), onUpdate: vi.fn() },
          finders: { byId: vi.fn() }
        },
      ];

      libOptionsConfigurations.forEach(libOptions => {
        createInstance(keyType, models, libOptions as any, scopes, mockRegistry);
        expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      });
    });
  });

  describe('integration with dependencies', () => {
    it('should pass through all parameters correctly', () => {
      const keyType = 'integration';
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

      createInstance(keyType, models, libOptions as any, scopes, mockRegistry);

      // Verify createCoordinate call
      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);

      // Verify createOptions call
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      // Verify createOperations call
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);

      // Verify Primary.wrapOperations call
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);
    });

    it('should create instance with proper relationships between dependencies', () => {
      const keyType = 'relationship';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      // The coordinate should be created first
      expect(mockCreateCoordinate).toHaveBeenCalledWith([keyType], ['sequelize', ...scopes]);

      // The options should be created
      expect(mockCreateOptions).toHaveBeenCalledWith({});

      // The coordinate and options should be passed to operations creation
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, mockOptions);

      // The operations should be passed to wrapping
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      // The result should contain all parts
      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.options).toBe(mockOptions);
      expect(result.operations).toBe(mockWrappedOperations);
      expect(result.models).toBe(models);
      expect(result.registry).toBe(mockRegistry);
    });

    it('should handle when dependencies return different structures', () => {
      const alternateCoordinate = { alternate: true, kta: [] };
      const alternateOptions = { alternate: true };
      const alternateOperations = { alternate: true };
      const alternateWrappedOperations = { alternateWrapped: true };

      mockCreateCoordinate.mockReturnValue(alternateCoordinate as any);
      mockCreateOptions.mockReturnValue(alternateOptions as any);
      mockCreateOperations.mockReturnValue(alternateOperations as any);
      mockPrimaryWrapOperations.mockReturnValue(alternateWrappedOperations as any);

      const keyType = 'alternate';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(result.coordinate).toBe(alternateCoordinate);
      expect(result.options).toBe(alternateOptions);
      expect(result.operations).toBe(alternateWrappedOperations);
    });
  });
});
