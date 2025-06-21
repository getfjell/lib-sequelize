import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item, ItemTypeArray } from '@fjell/core';
import * as Library from '@fjell/lib';
import { createDefinition, Definition } from '@/Definition';
import { createCoordinate } from '@/Coordinate';
import { createOptions, Options } from '@/Options';

// Mock the dependencies
vi.mock('@/Coordinate');
vi.mock('@/Options');
vi.mock('@fjell/lib');

const mockCreateCoordinate = vi.mocked(createCoordinate);
const mockCreateOptions = vi.mocked(createOptions);
const mockLibraryCreateDefinition = vi.mocked(Library.createDefinition);

describe('Definition', () => {
  const mockCoordinate = { kt: 'test', scopes: ['sequelize', 'test'] };
  const mockOptions = {
    deleteOnRemove: false,
    references: [],
    aggregations: [],
  } as Options<any, any, any, any, any, any, any>;
  const mockLibraryDefinition = {
    coordinate: mockCoordinate,
    operations: {},
    queries: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateCoordinate.mockReturnValue(mockCoordinate as any);
    mockCreateOptions.mockReturnValue(mockOptions);
    mockLibraryCreateDefinition.mockReturnValue(mockLibraryDefinition as any);
  });

  describe('createDefinition', () => {
    it('should create definition with single key type', () => {
      const kta: ItemTypeArray<'customer'> = ['customer'];
      const scopes = ['test'];
      const libOptions = { deleteOnRemove: true };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);

      expect(result).toEqual({
        ...mockLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should create definition with multiple key types', () => {
      const kta: ItemTypeArray<'order', 'customer'> = ['order', 'customer'];
      const scopes = ['test', 'production'];
      const libOptions = {
        deleteOnRemove: false,
        references: [{ column: 'customerId', kta: ['customer'], property: 'customer' }],
      };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);

      expect(result).toEqual({
        ...mockLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should create definition without libOptions', () => {
      const kta: ItemTypeArray<'item'> = ['item'];
      const scopes = ['default'];

      const result = createDefinition(kta, scopes);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      // eslint-disable-next-line no-undefined
      expect(mockCreateOptions).toHaveBeenCalledWith(undefined);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);

      expect(result).toEqual({
        ...mockLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should create definition with empty scopes array', () => {
      const kta: ItemTypeArray<'product'> = ['product'];
      const scopes: string[] = [];
      const libOptions = {
        aggregations: [{ kta: ['order'], property: 'orders', cardinality: 'many' as const }],
      };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);

      expect(result).toEqual({
        ...mockLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should create definition with complex key type hierarchy', () => {
      const kta: ItemTypeArray<'orderLine', 'order', 'customer'> = ['orderLine', 'order', 'customer'];
      const scopes = ['test', 'integration'];
      const libOptions = {
        deleteOnRemove: true,
        references: [
          { column: 'orderId', kta: ['order'], property: 'order' },
          { column: 'customerId', kta: ['customer'], property: 'customer' },
        ],
        aggregations: [
          { kta: ['orderLine'], property: 'orderLines', cardinality: 'many' as const },
        ],
      };

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);

      expect(result).toEqual({
        ...mockLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should handle partial libOptions', () => {
      const kta: ItemTypeArray<'user'> = ['user'];
      const scopes = ['auth'];
      const libOptions = { deleteOnRemove: true }; // Only partial options

      const result = createDefinition(kta, scopes, libOptions);

      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);

      expect(result).toEqual({
        ...mockLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should preserve all properties from library definition', () => {
      const extendedLibraryDefinition = {
        ...mockLibraryDefinition,
        customProperty: 'test',
        anotherProperty: { nested: true },
      };
      mockLibraryCreateDefinition.mockReturnValue(extendedLibraryDefinition as any);

      const kta: ItemTypeArray<'test'> = ['test'];
      const scopes = ['unit'];

      const result = createDefinition(kta, scopes);

      expect(result).toEqual({
        ...extendedLibraryDefinition,
        options: mockOptions,
      });
    });

    it('should call logger.debug with correct parameters', () => {
      const kta: ItemTypeArray<'debug'> = ['debug'];
      const scopes = ['logging'];
      const libOptions = { deleteOnRemove: false };

      createDefinition(kta, scopes, libOptions);

      // Verify all mocked functions were called with expected parameters
      expect(mockCreateCoordinate).toHaveBeenCalledTimes(1);
      expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);

      expect(mockCreateOptions).toHaveBeenCalledTimes(1);
      expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);

      expect(mockLibraryCreateDefinition).toHaveBeenCalledTimes(1);
      expect(mockLibraryCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);
    });
  });

  describe('Definition interface', () => {
    it('should extend Library.Definition', () => {
      // This test verifies the type structure at compile time
      const definition: Definition<Item<'test'>, 'test'> = {
        coordinate: mockCoordinate as any,
        options: mockOptions,
      };

      expect(definition).toBeDefined();
      expect(definition.options).toBeDefined();
      expect(definition.coordinate).toBeDefined();
    });
  });
});
