import { describe, expect, it, vi } from 'vitest';
import { createSequelizeLibrary, isSequelizeLibrary } from '../src/SequelizeLibrary';
import { createRegistry } from '@fjell/registry';
import { createCoordinate } from '../src/Coordinate';
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

describe('SequelizeLibrary', () => {
  describe('createSequelizeLibrary', () => {
    it('should create a SequelizeLibrary with models', () => {
      const registry = createRegistry();
      const coordinate = createCoordinate(['test']);
      const models = [createMockModel('TestModel')];
      const options = createOptions<TestItem, 'test'>({});

      const library = createSequelizeLibrary<TestItem, 'test'>(
        registry,
        coordinate,
        models,
        options
      );

      expect(library).toBeDefined();
      expect(library.models).toEqual(models);
      expect(library.coordinate).toBe(coordinate);
      expect(library.registry).toBe(registry);
      expect(library.options).toBe(options);
    });

    it('should create library with multiple models', () => {
      const registry = createRegistry();
      const coordinate = createCoordinate(['test']);
      const models = [
        createMockModel('TestModel'),
        createMockModel('RelatedModel')
      ];
      const options = createOptions<TestItem, 'test'>({});

      const library = createSequelizeLibrary<TestItem, 'test'>(
        registry,
        coordinate,
        models,
        options
      );

      expect(library.models).toHaveLength(2);
      expect(library.models[0].name).toBe('TestModel');
      expect(library.models[1].name).toBe('RelatedModel');
    });
  });

  describe('isSequelizeLibrary', () => {
    it('should return true for valid SequelizeLibrary', () => {
      const registry = createRegistry();
      const coordinate = createCoordinate(['test']);
      const models = [createMockModel('TestModel')];
      const options = createOptions<TestItem, 'test'>({});

      const library = createSequelizeLibrary<TestItem, 'test'>(
        registry,
        coordinate,
        models,
        options
      );

      expect(isSequelizeLibrary(library)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isSequelizeLibrary(null)).toBe(false);
      expect(isSequelizeLibrary(undefined)).toBe(false);
      expect(isSequelizeLibrary({})).toBe(false);
      expect(isSequelizeLibrary({ models: [] })).toBe(false);
      expect(isSequelizeLibrary({ models: [], coordinate: {} })).toBe(false);
    });
  });
});
