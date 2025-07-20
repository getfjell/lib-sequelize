import { describe, expect, it, vi } from 'vitest';
import { createInstanceFactory, InstanceFactory } from '@/InstanceFactory';
import { ModelStatic } from 'sequelize';
import { Options } from '@/Options';
import { Item } from '@fjell/core';

// Mock dependencies
vi.mock('@/Instance', () => ({
  createInstance: vi.fn().mockReturnValue({
    coordinate: { kta: ['test'], scopes: [] },
    registry: {},
    operations: {},
    options: {},
    models: [],
  }),
}));

vi.mock('@/logger', () => ({
  default: {
    get: vi.fn().mockReturnValue({
      debug: vi.fn(),
    }),
  },
}));

const mockModel = {
  name: 'TestModel',
  tableName: 'test_table',
  primaryKeyAttribute: 'id',
} as unknown as ModelStatic<any>;

describe('InstanceFactory', () => {
  const mockOptions = {
    deleteOnRemove: false,
    references: [],
    aggregations: [],
  } as Options<Item<'test'>, 'test'>;

  describe('createInstanceFactory', () => {
    it('should create a factory function', () => {
      const models = [mockModel];
      const factory = createInstanceFactory(models, mockOptions);

      expect(typeof factory).toBe('function');
    });

    it('should handle empty models array', () => {
      const models: ModelStatic<any>[] = [];
      const factory = createInstanceFactory(models, mockOptions);

      expect(typeof factory).toBe('function');
    });

    it('should handle multiple models', () => {
      const models = [mockModel, mockModel];
      const factory = createInstanceFactory(models, mockOptions);

      expect(typeof factory).toBe('function');
    });

    it('should handle different options', () => {
      const customOptions = {
        deleteOnRemove: true,
        references: [],
        aggregations: [],
      } as Options<Item<'test'>, 'test'>;

      const factory = createInstanceFactory([mockModel], customOptions);

      expect(typeof factory).toBe('function');
    });
  });

  describe('InstanceFactory type', () => {
    it('should define the correct type structure', () => {
      // This is primarily a compile-time test
      // If the types compile correctly, this passes
      type TestFactory = InstanceFactory<Item<'test'>, 'test'>;

      const mockFactory: TestFactory = () => {
        return () => ({} as any);
      };

      expect(typeof mockFactory).toBe('function');
    });
  });
});
