import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '@fjell/core';
import { createSequelizeLibrary } from '../../src/primary/SequelizeLibrary';
import { ModelStatic } from 'sequelize';
import type { Registry } from '../../src/Registry';

// Mock the dependencies
vi.mock('../../src/Operations');
vi.mock('../../src/Options');
vi.mock('../../src/Coordinate');
vi.mock('@fjell/lib', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Primary: {
      ...actual.Primary,
      wrapOperations: vi.fn(),
    },
  };
});

// Import mocked functions
import { createOperations } from '../../src/Operations';
import { createOptions } from '../../src/Options';
import { createCoordinate } from '../../src/Coordinate';
import { Primary } from '@fjell/lib';

const mockCreateOperations = vi.mocked(createOperations);
const mockCreateOptions = vi.mocked(createOptions);
const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockPrimaryWrapOperations = vi.mocked(Primary.wrapOperations);

describe('SequelizeLibrary', () => {
  // Test interfaces
  interface TestItem extends Item<'test'> {
    id: string;
    name: string;
  }

  interface UserItem extends Item<'user', 'org'> {
    id: string;
    email: string;
    organizationId: string;
  }

  // Mock dependencies
  let mockRegistry: Registry;
  let mockModels: ModelStatic<any>[];
  let mockCoordinate: any;
  let mockOptions: any;
  let mockOperations: any;
  let mockWrappedOperations: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock registry
    mockRegistry = {
      type: 'lib',
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    } as unknown as Registry;

    // Mock models
    mockModels = [
      { name: 'TestModel', tableName: 'tests' } as ModelStatic<any>,
      { name: 'UserModel', tableName: 'users' } as ModelStatic<any>,
    ];

    // Mock coordinate
    mockCoordinate = {
      kta: ['test'],
      scopes: ['sequelize', 'test'],
      toString: vi.fn().mockReturnValue('test:sequelize,test'),
    };

    // Mock options
    mockOptions = {
      deleteOnRemove: false,
      references: [],
      aggregations: [],
    };

    // Mock operations (basic operations from createOperations)
    mockOperations = {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
      all: vi.fn(),
      one: vi.fn(),
      upsert: vi.fn(),
    };

    // Mock wrapped operations (includes all operations added by Primary.wrapOperations)
    mockWrappedOperations = {
      ...mockOperations,
      findOne: vi.fn(),
      action: vi.fn(),
      facet: vi.fn(),
      allAction: vi.fn(),
      allFacet: vi.fn(),
    };

    // Setup mock returns
    mockCreateCoordinate.mockReturnValue(mockCoordinate);
    mockCreateOptions.mockReturnValue(mockOptions);
    mockCreateOperations.mockReturnValue(mockOperations);
    mockPrimaryWrapOperations.mockReturnValue(mockWrappedOperations);
  });

  describe('createSequelizeLibrary', () => {
    it('should create a SequelizeLibrary with minimal parameters', () => {
      const keyType = 'test';

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyType,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(['test'], []);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(mockCreateOperations).toHaveBeenCalledWith(mockModels, mockCoordinate, mockRegistry, mockOptions);
      expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models: mockModels,
      });
    });

    it('should create a SequelizeLibrary with custom options and scopes', () => {
      const keyType = 'user';
      const libOptions = {
        deleteOnRemove: true,
        references: [{ column: 'org_id', kta: ['organization'], property: 'organization' }],
        aggregations: [{ kta: ['organization'], property: 'orgData', cardinality: 'one' as const }],
      };
      const scopes = ['production', 'api'];

      const result = createSequelizeLibrary<UserItem, 'user'>(
        keyType,
        mockModels,
        libOptions,
        scopes,
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(['user'], scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.registry).toBe(mockRegistry);
      expect(result.operations).toBe(mockWrappedOperations);
      expect(result.options).toBe(mockOptions);
      expect(result.models).toBe(mockModels);
    });

    it('should handle empty models array', () => {
      const keyType = 'test';
      const emptyModels: ModelStatic<any>[] = [];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyType,
        emptyModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateOperations).toHaveBeenCalledWith(emptyModels, mockCoordinate, mockRegistry, mockOptions);
      expect(result.models).toEqual(emptyModels);
    });

    it('should handle omitted scopes parameter', () => {
      const keyType = 'test';

      // Test with scopes parameter omitted entirely (using defaults)
      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyType,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(['test'], []);
      expect(result).toBeDefined();
    });

    it('should pass through all libOptions to createOptions', () => {
      const keyType = 'test';
      const customOptions = {
        deleteOnRemove: true,
        references: [
          { column: 'parent_id', kta: ['parent'], property: 'parent' },
          { column: 'owner_id', kta: ['user'], property: 'owner' },
        ],
        aggregations: [
          { kta: ['child'], property: 'children', cardinality: 'many' as const },
        ],
        customProperty: 'customValue',
      };

      createSequelizeLibrary<TestItem, 'test'>(
        keyType,
        mockModels,
        customOptions,
        [],
        mockRegistry
      );

      expect(mockCreateOptions).toHaveBeenCalledWith(customOptions);
    });
  });

  describe('interface conformance', () => {
    it('should return object implementing SequelizeLibrary interface', () => {
      const keyType = 'test';

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyType,
        mockModels,
        {},
        [],
        mockRegistry
      );

      // Check all required interface properties
      expect(result).toHaveProperty('coordinate');
      expect(result).toHaveProperty('registry');
      expect(result).toHaveProperty('operations');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('models');

      // Check that models is the specific property added by SequelizeLibrary
      expect(Array.isArray(result.models)).toBe(true);
      expect(result.models).toBe(mockModels);
    });

    it('should maintain type safety with multi-level key types', () => {
      const keyType = 'user';
      const result = createSequelizeLibrary<UserItem, 'user'>(
        keyType,
        mockModels,
        {},
        ['organization'],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(['user'], ['organization']);
      expect(result).toBeDefined();
    });

    it('should have all required operations methods', () => {
      const keyType = 'test';
      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyType,
        mockModels,
        {},
        [],
        mockRegistry
      );

      // Verify all basic CRUD operations exist
      const basicOperations = ['get', 'create', 'update', 'remove', 'find', 'findOne', 'all', 'one', 'upsert'];
      basicOperations.forEach(opName => {
        expect(result.operations).toHaveProperty(opName);
        expect(typeof result.operations[opName as keyof typeof result.operations]).toBe('function');
      });

      // Verify all extended operations exist (added by Primary.wrapOperations)
      const extendedOperations = ['action', 'facet', 'allAction', 'allFacet'];
      extendedOperations.forEach(opName => {
        expect(result.operations).toHaveProperty(opName);
        expect(typeof result.operations[opName as keyof typeof result.operations]).toBe('function');
      });

      // Verify total count matches expected (13 operations total)
      expect(Object.keys(result.operations)).toHaveLength(13);
    });
  });
});
