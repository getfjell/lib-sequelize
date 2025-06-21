import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '@fjell/core';
import * as Library from '@fjell/lib';
import { Primary } from '@fjell/lib';
import { ModelStatic } from 'sequelize';
import { createInstance, Instance } from '@/primary/Instance';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';

// Mock the dependencies
vi.mock('@/Definition');
vi.mock('@/Operations');
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

const mockCreateDefinition = vi.mocked(createDefinition);
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
  const mockDefinition = {
    coordinate: {
      kta: ['customer'],
      scopes: ['test']
    },
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
    register: vi.fn(),
    find: vi.fn(),
    libTree: vi.fn(),
  } as unknown as Library.Registry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateDefinition.mockReturnValue(mockDefinition as any);
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

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
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

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with default libOptions when not provided', () => {
      const keyType = 'product';
      const models = [mockModel1];
      const scopes = ['default'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, {});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
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

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should create instance with empty models array', () => {
      const keyType = 'test';
      const models: ModelStatic<any>[] = [];
      const libOptions = {};
      const scopes = ['test'];

      const result = createInstance(keyType, models, libOptions, scopes, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models: [],
        registry: mockRegistry,
      });
    });

    it('should create instance with minimal parameters (default values)', () => {
      const keyType = 'minimal';
      const models = [mockModel1];

      const result = createInstance(keyType, models, {}, [], mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], [], {});
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
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

      expect(mockCreateDefinition).toHaveBeenCalledTimes(1);
      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);

      expect(mockCreateOperations).toHaveBeenCalledTimes(1);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);

      expect(mockPrimaryWrapOperations).toHaveBeenCalledTimes(1);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);
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

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, differentRegistry);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, differentRegistry);
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

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);
      expect(result).toEqual({
        definition: mockDefinition,
        operations: mockWrappedOperations,
        models,
        registry: mockRegistry,
      });
    });

    it('should convert single keyType to array for createDefinition', () => {
      const keyType = 'single';
      const models = [mockModel1];
      const scopes = ['test'];

      createInstance(keyType, models, {}, scopes, mockRegistry);

      // Verify that the single keyType is wrapped in an array
      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, {});
    });

    it('should handle string key types correctly', () => {
      const stringKeyTypes = ['order', 'customer', 'product'];

      for (const keyType of stringKeyTypes) {
        createInstance(keyType as any, [mockModel1], {}, ['test'], mockRegistry);
        expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], ['test'], {});
      }
    });

    it('should maintain correct execution order', () => {
      const executionOrder: string[] = [];

      mockCreateDefinition.mockImplementation(() => {
        executionOrder.push('createDefinition');
        return mockDefinition as any;
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

      expect(executionOrder).toEqual(['createDefinition', 'createOperations', 'wrapOperations']);
    });

    it('should handle dependency return values correctly', () => {
      const customDefinition = { ...mockDefinition, custom: true };
      const customOperations = { ...mockOperations, custom: true };
      const customWrappedOperations = { ...mockWrappedOperations, custom: true };

      mockCreateDefinition.mockReturnValue(customDefinition as any);
      mockCreateOperations.mockReturnValue(customOperations as any);
      mockPrimaryWrapOperations.mockReturnValue(customWrappedOperations as any);

      const keyType = 'custom';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(result.definition).toBe(customDefinition);
      expect(result.operations).toBe(customWrappedOperations);
    });
  });

  describe('Instance interface', () => {
    it('should extend AbstractSequelizeInstance and include models property', () => {
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

    it('should maintain type safety with generic parameters', () => {
      const instance: Instance<Item<'typed'>, 'typed'> = {
        definition: mockDefinition as any,
        operations: mockWrappedOperations as any,
        models: [mockModel1],
        registry: mockRegistry,
      };

      expect(instance).toBeDefined();
      expect(instance.models).toEqual([mockModel1]);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from createDefinition', () => {
      const error = new Error('Definition creation failed');
      mockCreateDefinition.mockImplementation(() => {
        throw error;
      });

      const keyType = 'error';
      const models = [mockModel1];
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, models, {}, scopes, mockRegistry);
      }).toThrow('Definition creation failed');
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

      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], [], {});
      expect(result).toBeDefined();
    });

    it('should handle null models gracefully', () => {
      const keyType = 'null';
      const nullModels = null as any;
      const scopes = ['test'];

      expect(() => {
        createInstance(keyType, nullModels, {}, scopes, mockRegistry);
      }).not.toThrow();

      expect(mockCreateOperations).toHaveBeenCalledWith(nullModels, mockDefinition, mockRegistry);
    });
  });

  describe('parameter validation', () => {
    it('should accept various keyType strings', () => {
      const keyTypes = ['customer', 'order', 'product', 'user', 'item'];

      keyTypes.forEach(keyType => {
        const result = createInstance(keyType as any, [mockModel1], {}, ['test'], mockRegistry);
        expect(result).toBeDefined();
        expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], ['test'], {});
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
        expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, {});
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
        expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);
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

      // Verify createDefinition call
      expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, libOptions);

      // Verify createOperations call
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);

      // Verify Primary.wrapOperations call
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);
    });

    it('should create instance with proper relationships between dependencies', () => {
      const keyType = 'relationship';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      // The definition should be passed to operations creation
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockDefinition, mockRegistry);

      // The operations should be passed to wrapping
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockDefinition, mockRegistry);

      // The result should contain all parts
      expect(result.definition).toBe(mockDefinition);
      expect(result.operations).toBe(mockWrappedOperations);
      expect(result.models).toBe(models);
      expect(result.registry).toBe(mockRegistry);
    });

    it('should handle when dependencies return different structures', () => {
      const alternateDefinition = { alternate: true, coordinate: { kta: [] } };
      const alternateOperations = { alternate: true };
      const alternateWrappedOperations = { alternateWrapped: true };

      mockCreateDefinition.mockReturnValue(alternateDefinition as any);
      mockCreateOperations.mockReturnValue(alternateOperations as any);
      mockPrimaryWrapOperations.mockReturnValue(alternateWrappedOperations as any);

      const keyType = 'alternate';
      const models = [mockModel1];
      const scopes = ['test'];

      const result = createInstance(keyType, models, {}, scopes, mockRegistry);

      expect(result.definition).toBe(alternateDefinition);
      expect(result.operations).toBe(alternateWrappedOperations);
    });
  });
});
