import { describe, expect, it, vi } from 'vitest';
import { createSequelizeLibraryFactory, SequelizeLibraryFactory } from '../src/SequelizeLibraryFactory';
import { createOptions } from '../src/Options';
import { Item } from '@fjell/core';
import { ModelStatic } from 'sequelize';

// Mock Sequelize model
const createMockModel = (name: string): ModelStatic<any> => ({
  name,
  primaryKeyAttribute: 'id',
  associations: {},
  findAll: vi.fn(),
  findByPk: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn()
} as any);

interface TestItem extends Item<'test'> {
  id: string;
  name: string;
}

describe('SequelizeLibraryFactory', () => {
  describe('createSequelizeLibraryFactory', () => {
    it('should create a factory function', () => {
      const models = [createMockModel('TestModel')];
      const options = createOptions<TestItem, 'test'>({});

      const factory = createSequelizeLibraryFactory<TestItem, 'test'>(
        models,
        options
      );

      expect(typeof factory).toBe('function');
    });

    it('should return a function that accepts models and options', () => {
      const models = [createMockModel('TestModel')];
      const options = createOptions<TestItem, 'test'>({});

      const factory = createSequelizeLibraryFactory<TestItem, 'test'>(
        models,
        options
      );

      // The factory should be a function that takes models and options
      expect(factory.length).toBe(2);
    });
  });

  describe('SequelizeLibraryFactory type', () => {
    it('should be a function type', () => {
       
      const factory: SequelizeLibraryFactory<TestItem, 'test'> = (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        models: ModelStatic<any>[],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options: any
      ) => {
        return {} as any;
      };

      expect(typeof factory).toBe('function');
    });
  });
});
