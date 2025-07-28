import { Item, ItemTypeArray } from '@fjell/core';
import { createDefinition } from '../src/Definition';
import { createCoordinate } from '../src/Coordinate';
import { createOptions } from '../src/Options';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dependencies
vi.mock('../src/Coordinate');
vi.mock('../src/Options');

const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockCreateOptions = vi.mocked(createOptions);

describe('Definition', () => {
  const mockCoordinate = {
    kta: ['test'],
    scopes: ['sequelize', 'test']
  };

  const mockOptions = {
    deleteOnRemove: false,
    references: [],
    aggregations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCoordinate.mockReturnValue(mockCoordinate as any);
    mockCreateOptions.mockReturnValue(mockOptions as any);
  });

  describe('createDefinition', () => {
    it('should create definition with single key type', () => {
      const kta: ItemTypeArray<'customer'> = ['customer'];
      const scopes = ['test'];
      const libOptions = {
        deleteOnRemove: false,
      };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        options: mockOptions,
      });
    });

    it('should create definition with multiple key types', () => {
      const kta: ItemTypeArray<'customer', 'location'> = ['customer', 'location'];
      const scopes = ['test', 'another'];
      const libOptions = {
        deleteOnRemove: true,
      };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        options: mockOptions,
      });
    });

    it('should create definition with minimal options', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes = ['test'];
      const libOptions = {};

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        options: mockOptions,
      });
    });

    it('should create definition with empty scopes array', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes: string[] = [];
      const libOptions = {};

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        options: mockOptions,
      });
    });

    it('should create definition with undefined libOptions', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes = ['test'];

      const result = createDefinition(kta, scopes);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        options: mockOptions,
      });
    });

    it('should create definition with complex key types', () => {
      type ComplexItem = Item<'complex', 'loc1', 'loc2'>;
      const kta: ItemTypeArray<'complex', 'loc1', 'loc2'> = ['complex', 'loc1', 'loc2'];
      const scopes = ['sequelize', 'test'];
      const libOptions = {
        hooks: {
          preCreate: vi.fn(),
          postCreate: vi.fn(),
        },
        validators: {
          onCreate: vi.fn(),
          onUpdate: vi.fn(),
        },
        finders: {
          byStatus: vi.fn(),
          byName: vi.fn(),
        },
        actions: {
          customAction: vi.fn(),
        },
        allActions: {},
        facets: {},
        allFacets: {},
      };

      const result = createDefinition<ComplexItem, 'complex', 'loc1', 'loc2'>(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result).toEqual({
        coordinate: mockCoordinate,
        options: mockOptions,
      });
    });

    it('should handle all different option types', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes = ['test'];
      const libOptions = {
        deleteOnRemove: true,
        references: [{ column: 'test', kta: ['test'], property: 'testProp' }],
        aggregations: [{ kta: ['test'], property: 'testProp', cardinality: 'one' as const }],
      };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(result).toBeDefined();
      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.options).toBe(mockOptions);
    });

    it('should create definition and maintain type safety', () => {
      type TestItem = Item<'test'>;
      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes = ['test'];

      const result = createDefinition<TestItem, 'test'>(kta, scopes);

      expect(result).toBeDefined();
      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.options).toBe(mockOptions);
    });

    it('should log debug information', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes = ['debug'];

      createDefinition(kta, scopes);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledTimes(1);
    });
  });
});
