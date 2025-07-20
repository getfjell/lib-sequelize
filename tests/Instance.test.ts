import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '@fjell/core';
import * as Library from '@fjell/lib';
import { ModelStatic } from 'sequelize';
import { createInstance, Instance, isInstance } from '@/Instance';
import { createOptions } from '@/Options';
import { createOperations } from '@/Operations';
import { createCoordinate } from '@fjell/registry';
import { Registry } from '@/Registry';

// Mock the dependencies
vi.mock('@/Options');
vi.mock('@/Operations');
vi.mock('@fjell/registry');
vi.mock('@fjell/lib');

const mockCreateOptions = vi.mocked(createOptions);
const mockCreateOperations = vi.mocked(createOperations);
const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockLibraryCreateInstance = vi.mocked(Library.createInstance);

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
  const mockRegistry = {
    type: 'lib',
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    list: vi.fn(),
    createInstance: vi.fn(),
    register: vi.fn(),
    instanceTree: {},
  } as unknown as Registry;

  const mockCoordinate = {
    kta: ['test'],
    scopes: ['sequelize', 'test'],
  };

  const mockOptions = {
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

  const mockOperations = {
    all: vi.fn(),
    one: vi.fn(),
    get: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    upsert: vi.fn(),
  };

  const mockLibInstance = {
    coordinate: mockCoordinate,
    registry: mockRegistry,
    operations: mockOperations,
    options: mockOptions,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateCoordinate.mockReturnValue(mockCoordinate as any);
    mockCreateOptions.mockReturnValue(mockOptions as any);
    mockCreateOperations.mockReturnValue(mockOperations as any);
    mockLibraryCreateInstance.mockReturnValue(mockLibInstance as any);
  });

  describe('createInstance', () => {
    it('should create instance with single model and basic options', () => {
      const models = [mockModel1];
      const options = { deleteOnRemove: true };

      const result = createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, options);
      expect(mockLibraryCreateInstance).toHaveBeenCalledWith(mockRegistry, mockCoordinate, mockOperations, options);

      expect(result).toEqual({
        ...mockLibInstance,
        models,
      });
    });

    it('should create instance with multiple models', () => {
      const models = [mockModel1, mockModel2];
      const options = { deleteOnRemove: false };

      const result = createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, options);
      expect(mockLibraryCreateInstance).toHaveBeenCalledWith(mockRegistry, mockCoordinate, mockOperations, options);

      expect(result).toEqual({
        ...mockLibInstance,
        models,
      });
    });

    it('should create instance with empty models array', () => {
      const models: ModelStatic<any>[] = [];
      const options = {};

      const result = createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, options);
      expect(mockLibraryCreateInstance).toHaveBeenCalledWith(mockRegistry, mockCoordinate, mockOperations, options);

      expect(result).toEqual({
        ...mockLibInstance,
        models,
      });
    });

    it('should create instance with complex options', () => {
      const models = [mockModel1];
      const options = {
        deleteOnRemove: true,
        references: [{ column: 'userId', kta: ['user'], property: 'user' }],
        aggregations: [{ kta: ['order'], property: 'orders', cardinality: 'many' as const }],
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
        },
      };

      const result = createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, options);
      expect(mockLibraryCreateInstance).toHaveBeenCalledWith(mockRegistry, mockCoordinate, mockOperations, options);

      expect(result).toEqual({
        ...mockLibInstance,
        models,
      });
    });

    it('should create instance and maintain type safety', () => {
      interface TestItem extends Item<'test'> {
        name: string;
        value: number;
      }

      const models = [mockModel1];
      const options = { deleteOnRemove: true };

      const result: Instance<TestItem, 'test'> = createInstance<TestItem, 'test'>(
        mockRegistry,
        mockCoordinate as any,
        models,
        options as any
      );

      expect(result).toBeDefined();
      expect(result.models).toBe(models);
      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.registry).toBe(mockRegistry);
    });

    it('should create instance with different registry', () => {
      const differentRegistry = {
        type: 'lib',
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        list: vi.fn(),
        createInstance: vi.fn(),
        register: vi.fn(),
        instanceTree: {},
      } as unknown as Registry;

      const models = [mockModel1];
      const options = {};

      const result = createInstance(differentRegistry, mockCoordinate as any, models, options as any);

      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, differentRegistry, options);
      expect(mockLibraryCreateInstance).toHaveBeenCalledWith(differentRegistry, mockCoordinate, mockOperations, options);

      expect(result.registry).toBe(mockLibInstance.registry); // Since we mock the return value
    });

    it('should call createOperations with correct parameters', () => {
      const models = [mockModel1, mockModel2];
      const options = { deleteOnRemove: true };

      createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(mockCreateOperations).toHaveBeenCalledTimes(1);
      expect(mockCreateOperations).toHaveBeenCalledWith(models, mockCoordinate, mockRegistry, options);
    });

    it('should call Library.createInstance with correct parameters', () => {
      const models = [mockModel1];
      const options = {};

      createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(mockLibraryCreateInstance).toHaveBeenCalledTimes(1);
      expect(mockLibraryCreateInstance).toHaveBeenCalledWith(mockRegistry, mockCoordinate, mockOperations, options);
    });

    it('should return instance with models property', () => {
      const models = [mockModel1, mockModel2];
      const options = { deleteOnRemove: false };

      const result = createInstance(mockRegistry, mockCoordinate as any, models, options as any);

      expect(result.models).toBe(models);
      expect(Array.isArray(result.models)).toBe(true);
      expect(result.models.length).toBe(2);
    });
  });

  describe('isInstance', () => {
    it('should return true for valid instance', () => {
      const instance = {
        coordinate: mockCoordinate,
        operations: mockOperations,
        options: mockOptions,
        registry: mockRegistry,
        models: [mockModel1],
      };

      const result = isInstance(instance);

      expect(result).toBe(true);
    });

    it('should return false for instance without models', () => {
      const instance = {
        coordinate: mockCoordinate,
        operations: mockOperations,
        options: mockOptions,
        registry: mockRegistry,
        // Missing models property
      };

      const result = isInstance(instance);

      expect(result).toBe(false);
    });

    it('should return false for instance with non-array models', () => {
      const instance = {
        coordinate: mockCoordinate,
        operations: mockOperations,
        options: mockOptions,
        registry: mockRegistry,
        models: 'not an array',
      };

      const result = isInstance(instance);

      expect(result).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isInstance(null)).toBe(false);
      // eslint-disable-next-line no-undefined
      expect(isInstance(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      const result = isInstance({});

      expect(result).toBe(false);
    });

    it('should return false for instance missing required properties', () => {
      expect(isInstance({ coordinate: mockCoordinate })).toBe(false);
      expect(isInstance({ operations: mockOperations })).toBe(false);
      expect(isInstance({ options: mockOptions })).toBe(false);
      expect(isInstance({ registry: mockRegistry })).toBe(false);
      expect(isInstance({ models: [mockModel1] })).toBe(false);
    });
  });
});
