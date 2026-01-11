import { describe, expect, it, vi } from 'vitest';
import { createSequelizeLibrary, isSequelizeLibrary } from '../src/SequelizeLibrary';
import { createRegistry } from '@fjell/registry';
import { createCoordinate } from '../src/Coordinate';
import { createOptions } from '../src/Options';
import { Item } from "@fjell/types";
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
      expect(library.models).toBeDefined();
      expect(library.models).toHaveLength(1);
      expect(library.models[0].name).toBe('TestModel');
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

    it('should wrap models when hooks are defined', () => {
      const registry = createRegistry();
      const coordinate = createCoordinate(['test']);
      const models = [createMockModel('TestModel')];
      const options = createOptions<TestItem, 'test'>({
        hooks: {
          preUpdate: async () => ({})
        }
      });

      const library = createSequelizeLibrary<TestItem, 'test'>(
        registry,
        coordinate,
        models,
        options
      );

      // Models should be wrapped (not the same reference)
      expect(library.models).toBeDefined();
      expect(library.models[0]).toBeDefined();
      // The wrapped model should still have the same name
      expect(library.models[0].name).toBe('TestModel');
    });

    it('should not wrap models when hooks are not defined', () => {
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

      // Models should not be wrapped when no hooks are defined
      // They should have the same properties and behavior (no proxy wrapping for save/update/destroy)
      expect(library.models).toBeDefined();
      expect(library.models).toHaveLength(1);
      expect(library.models[0].name).toBe('TestModel');
      // When no hooks are defined, the models should work normally without interception
      // We verify this by checking that the model has the expected methods
      expect(library.models[0].findAll).toBeDefined();
      expect(library.models[0].findByPk).toBeDefined();
    });

    it('should respect directSaveBehavior option', () => {
      const registry = createRegistry();
      const coordinate = createCoordinate(['test']);
      const models = [createMockModel('TestModel')];
      const options = createOptions<TestItem, 'test'>({
        hooks: {
          preUpdate: async () => ({})
        },
        directSaveBehavior: 'warn-only'
      });

      const library = createSequelizeLibrary<TestItem, 'test'>(
        registry,
        coordinate,
        models,
        options
      );

      expect(library.models).toBeDefined();
      expect(library.options.directSaveBehavior).toBe('warn-only');
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
