import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReference } from '@/ReferenceBuilder';
import { ReferenceDefinition } from '@/Options';
import { PriKey } from '@fjell/core';
import * as Library from '@fjell/lib';

// Mock the @fjell/lib module
vi.mock('@fjell/lib');

describe('ReferenceBuilder', () => {
  describe('buildReference', () => {
    let mockRegistry: Library.Registry;
    let mockLibraryInstance: Library.Instance<any, any, any, any, any, any, any>;
    let mockGet: ReturnType<typeof vi.fn>;
    let mockRegistryGet: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockGet = vi.fn();
      mockRegistryGet = vi.fn();

      mockLibraryInstance = {
        operations: {
          get: mockGet
        }
      } as any;

      mockRegistry = {
        get: mockRegistryGet
      } as any;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should throw error when referenceDefinition has more than one key type', async () => {
      // Arrange
      const item = { userId: 123 };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['User', 'Profile'], // More than one key type
        column: 'userId',
        property: 'user'
      };

      // Act & Assert
      await expect(buildReference(item, referenceDefinition, mockRegistry))
        .rejects
        .toThrow("The ReferenceBuilder doesn't work with more than one key type yet");
    });

    it('should throw error when registry is not provided', async () => {
      // Arrange
      const item = { userId: 123 };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['User'],
        column: 'userId',
        property: 'user'
      };

      // Act & Assert
      await expect(buildReference(item, referenceDefinition, null as any))
        .rejects
        .toThrow("This model definition has a reference definition, but the registry is not present");
    });

    it('should throw error when library instance is not found in registry', async () => {
      // Arrange
      const item = { userId: 123 };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['User'],
        column: 'userId',
        property: 'user'
      };

      mockRegistryGet.mockReturnValue(null);

      // Act & Assert
      await expect(buildReference(item, referenceDefinition, mockRegistry))
        .rejects
        .toThrow("This model definition has a reference definition, but the dependency is not present");

      expect(mockRegistryGet).toHaveBeenCalledWith(['User']);
    });

    it('should successfully build reference and populate item property', async () => {
      // Arrange
      const item = { userId: 123, name: 'Test Item' };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['User'],
        column: 'userId',
        property: 'user'
      };

      const referencedUser = { id: 123, name: 'John Doe', email: 'john@example.com' };

      mockRegistryGet.mockReturnValue(mockLibraryInstance);
      mockGet.mockResolvedValue(referencedUser);

      // Act
      const result = await buildReference(item, referenceDefinition, mockRegistry);

      // Assert
      expect(mockRegistryGet).toHaveBeenCalledWith(['User']);

      const expectedPriKey: PriKey<string> = {
        kt: 'User',
        pk: 123 as any
      };
      expect(mockGet).toHaveBeenCalledWith(expectedPriKey);

      expect(result).toBe(item); // Should return the same item object
      expect(result.user).toEqual(referencedUser); // Should have the referenced user populated
      expect(result.userId).toBe(123); // Original properties should remain
      expect(result.name).toBe('Test Item');
    });

    it('should handle string column values correctly', async () => {
      // Arrange
      const item = { categoryId: 'electronics', productName: 'Laptop' };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['Category'],
        column: 'categoryId',
        property: 'category'
      };

      const referencedCategory = { id: 'electronics', name: 'Electronics', description: 'Electronic products' };

      mockRegistryGet.mockReturnValue(mockLibraryInstance);
      mockGet.mockResolvedValue(referencedCategory);

      // Act
      const result = await buildReference(item, referenceDefinition, mockRegistry);

      // Assert
      const expectedPriKey: PriKey<string> = {
        kt: 'Category',
        pk: 'electronics'
      };
      expect(mockGet).toHaveBeenCalledWith(expectedPriKey);
      expect(result.category).toEqual(referencedCategory);
    });

    it('should handle null column values', async () => {
      // Arrange
      const item = { userId: null, name: 'Test Item' };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['User'],
        column: 'userId',
        property: 'user'
      };

      const referencedUser = null; // Assuming the library returns null for null key

      mockRegistryGet.mockReturnValue(mockLibraryInstance);
      mockGet.mockResolvedValue(referencedUser);

      // Act
      const result = await buildReference(item, referenceDefinition, mockRegistry);

      expect(result.user).toBeNull();
    });

    it('should handle library operations get method rejection', async () => {
      // Arrange
      const item = { userId: 123 };
      const referenceDefinition: ReferenceDefinition = {
        kta: ['User'],
        column: 'userId',
        property: 'user'
      };

      mockRegistryGet.mockReturnValue(mockLibraryInstance);
      mockGet.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(buildReference(item, referenceDefinition, mockRegistry))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should not modify original item object structure except for adding reference property', async () => {
      // Arrange
      const originalItem = {
        userId: 456,
        name: 'Original Item',
        metadata: { version: 1 },
        tags: ['tag1', 'tag2']
      };
      const item = { ...originalItem }; // Make a copy to verify immutability of other properties

      const referenceDefinition: ReferenceDefinition = {
        kta: ['User'],
        column: 'userId',
        property: 'user'
      };

      const referencedUser = { id: 456, name: 'Jane Doe' };

      mockRegistryGet.mockReturnValue(mockLibraryInstance);
      mockGet.mockResolvedValue(referencedUser);

      // Act
      const result = await buildReference(item, referenceDefinition, mockRegistry);

      // Assert
      expect(result.userId).toBe(originalItem.userId);
      expect(result.name).toBe(originalItem.name);
      expect(result.metadata).toEqual(originalItem.metadata);
      expect(result.tags).toEqual(originalItem.tags);
      expect(result.user).toEqual(referencedUser); // Only new property added
    });
  });
});
