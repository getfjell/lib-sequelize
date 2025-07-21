import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item, ItemTypeArray } from '@fjell/core';
import { createInstance, createSequelizeLibrary, type Instance } from '@/contained/SequelizeLibrary';
import { ModelStatic } from 'sequelize';
import type { Registry } from '@/Registry';

// Mock the dependencies
vi.mock('@/Operations');
vi.mock('@/Options');
vi.mock('@/Coordinate');
vi.mock('@fjell/lib', () => ({
  Contained: {
    wrapOperations: vi.fn(),
  },
}));

// Import mocked functions
import { createOperations } from '@/Operations';
import { createOptions } from '@/Options';
import { createCoordinate } from '@/Coordinate';
import { Contained } from '@fjell/lib';

const mockCreateOperations = vi.mocked(createOperations);
const mockCreateOptions = vi.mocked(createOptions);
const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockContainedWrapOperations = vi.mocked(Contained.wrapOperations);

describe('contained/SequelizeLibrary', () => {
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

  interface MultiLevelItem extends Item<'product', 'category', 'brand', 'variant'> {
    id: string;
    name: string;
    categoryId: string;
    brandId: string;
    variantId: string;
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
      scopes: ['sequelize', 'contained'],
      toString: vi.fn().mockReturnValue('test:sequelize,contained'),
    };

    // Mock options
    mockOptions = {
      deleteOnRemove: false,
      references: [],
      aggregations: [],
    };

    // Mock operations
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

    // Mock wrapped operations
    mockWrappedOperations = {
      ...mockOperations,
      wrapped: true,
    };

    // Setup mock returns
    mockCreateCoordinate.mockReturnValue(mockCoordinate);
    mockCreateOptions.mockReturnValue(mockOptions);
    mockCreateOperations.mockReturnValue(mockOperations);
    mockContainedWrapOperations.mockReturnValue(mockWrappedOperations);
  });

  describe('createSequelizeLibrary', () => {
    it('should create a SequelizeLibrary with minimal parameters', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, []);
      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(mockCreateOperations).toHaveBeenCalledWith(mockModels, mockCoordinate, mockRegistry, mockOptions);
      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        registry: mockRegistry,
        operations: mockWrappedOperations,
        options: mockOptions,
        models: mockModels,
      });
    });

    it('should create a SequelizeLibrary with custom options and scopes', () => {
      const keyTypes: ItemTypeArray<'user', 'org'> = ['user', 'org'];
      const libOptions = {
        deleteOnRemove: true,
        references: [{ column: 'org_id', kta: ['organization'], property: 'organization' }],
        aggregations: [{ kta: ['organization'], property: 'orgData', cardinality: 'one' as const }],
      };
      const scopes = ['production', 'api'];

      const result = createSequelizeLibrary<UserItem, 'user', 'org'>(
        keyTypes,
        mockModels,
        libOptions,
        scopes,
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.registry).toBe(mockRegistry);
      expect(result.operations).toBe(mockWrappedOperations);
      expect(result.options).toBe(mockOptions);
      expect(result.models).toBe(mockModels);
    });

    it('should handle multi-level key types', () => {
      const keyTypes: ItemTypeArray<'product', 'category', 'brand', 'variant'> = ['product', 'category', 'brand', 'variant'];
      const scopes = ['ecommerce'];

      const result = createSequelizeLibrary<MultiLevelItem, 'product', 'category', 'brand', 'variant'>(
        keyTypes,
        mockModels,
        {},
        scopes,
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, scopes);
      expect(result).toBeDefined();
      expect(result.models).toBe(mockModels);
    });

    it('should handle empty models array', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const emptyModels: ModelStatic<any>[] = [];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        emptyModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateOperations).toHaveBeenCalledWith(emptyModels, mockCoordinate, mockRegistry, mockOptions);
      expect(result.models).toEqual(emptyModels);
    });

    it('should handle empty scopes parameter', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, []);
      expect(result).toBeDefined();
    });

    it('should handle omitted scopes parameter with undefined', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, []);
      expect(result).toBeDefined();
    });

    it('should pass through all libOptions to createOptions', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
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
        keyTypes,
        mockModels,
        customOptions,
        [],
        mockRegistry
      );

      expect(mockCreateOptions).toHaveBeenCalledWith(customOptions);
    });

    it('should use Contained.wrapOperations instead of Primary.wrapOperations', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockContainedWrapOperations).toHaveBeenCalledWith(mockOperations, mockOptions, mockCoordinate, mockRegistry);
      expect(mockContainedWrapOperations).toHaveBeenCalledTimes(1);
    });

    it('should handle complex reference and aggregation definitions', () => {
      const keyTypes: ItemTypeArray<'order'> = ['order'];
      const complexOptions = {
        deleteOnRemove: false,
        references: [
          { column: 'customer_id', kta: ['customer'], property: 'customer' },
          { column: 'product_id', kta: ['product'], property: 'product' },
          { column: 'vendor_id', kta: ['vendor'], property: 'vendor' },
        ],
        aggregations: [
          { kta: ['orderItem'], property: 'items', cardinality: 'many' as const },
          { kta: ['payment'], property: 'payment', cardinality: 'one' as const },
          { kta: ['shipment'], property: 'shipments', cardinality: 'many' as const },
        ],
      };

      const result = createSequelizeLibrary(
        keyTypes,
        mockModels,
        complexOptions,
        ['ecommerce', 'orders'],
        mockRegistry
      );

      expect(mockCreateOptions).toHaveBeenCalledWith(complexOptions);
      expect(result).toBeDefined();
    });
  });

  describe('legacy exports', () => {
    it('should export createInstance as alias for createSequelizeLibrary', () => {
      expect(createInstance).toBe(createSequelizeLibrary);
    });

    it('should allow Instance type to be used for SequelizeLibrary', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const library: Instance<TestItem, 'test'> = createInstance<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(library).toBeDefined();
      expect(library.models).toBe(mockModels);
      expect(library.coordinate).toBe(mockCoordinate);
      expect(library.registry).toBe(mockRegistry);
      expect(library.operations).toBe(mockWrappedOperations);
      expect(library.options).toBe(mockOptions);
    });

    it('should maintain backward compatibility with Instance interface', () => {
      const keyTypes: ItemTypeArray<'user', 'org'> = ['user', 'org'];

      // Test that Instance type accepts the same parameters as SequelizeLibrary
      const instance: Instance<UserItem, 'user', 'org'> = createInstance<UserItem, 'user', 'org'>(
        keyTypes,
        mockModels,
        { deleteOnRemove: true },
        ['contained'],
        mockRegistry
      );

      expect(instance).toBeDefined();
      expect(instance.models).toBe(mockModels);
    });
  });

  describe('interface conformance', () => {
    it('should return object implementing SequelizeLibrary interface', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
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
      const keyTypes: ItemTypeArray<'product', 'category', 'brand'> = ['product', 'category', 'brand'];

      const result = createSequelizeLibrary(
        keyTypes,
        mockModels,
        {},
        ['multi-level'],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, ['multi-level']);
      expect(result).toBeDefined();
    });

    it('should extend AbstractSequelizeLibrary with models property', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      // Should have all AbstractSequelizeLibrary properties
      expect(result.coordinate).toBeDefined();
      expect(result.registry).toBeDefined();
      expect(result.operations).toBeDefined();
      expect(result.options).toBeDefined();

      // Plus the additional models property specific to contained SequelizeLibrary
      expect(result.models).toBeDefined();
      expect(Array.isArray(result.models)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle when createCoordinate throws an error', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const error = new Error('Coordinate creation failed');
      mockCreateCoordinate.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        createSequelizeLibrary<TestItem, 'test'>(
          keyTypes,
          mockModels,
          {},
          [],
          mockRegistry
        );
      }).toThrow('Coordinate creation failed');
    });

    it('should handle when createOptions throws an error', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const error = new Error('Options creation failed');
      mockCreateOptions.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        createSequelizeLibrary<TestItem, 'test'>(
          keyTypes,
          mockModels,
          {},
          [],
          mockRegistry
        );
      }).toThrow('Options creation failed');
    });

    it('should handle when createOperations throws an error', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const error = new Error('Operations creation failed');
      mockCreateOperations.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        createSequelizeLibrary<TestItem, 'test'>(
          keyTypes,
          mockModels,
          {},
          [],
          mockRegistry
        );
      }).toThrow('Operations creation failed');
    });

    it('should handle when Contained.wrapOperations throws an error', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const error = new Error('Wrapping operations failed');
      mockContainedWrapOperations.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        createSequelizeLibrary<TestItem, 'test'>(
          keyTypes,
          mockModels,
          {},
          [],
          mockRegistry
        );
      }).toThrow('Wrapping operations failed');
    });
  });

  describe('parameter validation and edge cases', () => {
    it('should handle null registry parameter', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        null as any
      );

      expect(mockCreateOperations).toHaveBeenCalledWith(mockModels, mockCoordinate, null, mockOptions);
      expect(result).toBeDefined();
    });

    it('should handle complex nested ItemTypeArray', () => {
      const keyTypes: ItemTypeArray<'enterprise', 'division', 'department', 'team', 'project'> =
        ['enterprise', 'division', 'department', 'team', 'project'];

      const result = createSequelizeLibrary(
        keyTypes,
        mockModels,
        {},
        ['enterprise'],
        mockRegistry
      );

      expect(mockCreateCoordinate).toHaveBeenCalledWith(keyTypes, ['enterprise']);
      expect(result).toBeDefined();
    });

    it('should handle empty options object', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        mockModels,
        {},
        [],
        mockRegistry
      );

      expect(mockCreateOptions).toHaveBeenCalledWith({});
      expect(result).toBeDefined();
    });

    it('should maintain original models reference', () => {
      const keyTypes: ItemTypeArray<'test'> = ['test'];
      const specificModels = [
        { name: 'SpecificModel', tableName: 'specific' } as ModelStatic<any>,
      ];

      const result = createSequelizeLibrary<TestItem, 'test'>(
        keyTypes,
        specificModels,
        {},
        [],
        mockRegistry
      );

      expect(result.models).toBe(specificModels);
      expect(result.models).not.toBe(mockModels);
    });
  });
});
