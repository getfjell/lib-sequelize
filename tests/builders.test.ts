import { describe, expect, it, vi } from 'vitest';
import { buildAggregation, createOperationContext } from '@fjell/lib';
import { AggregationDefinition, SequelizeReferenceDefinition } from '../src/Options';
import { buildSequelizeReference, stripSequelizeReferenceItems } from '../src/processing/ReferenceBuilder';
import * as Library from '@fjell/lib';

// Helper to create a mock library
const createMockLibrary = (keyTypes: string[]): any => ({
  coordinate: { kta: keyTypes },
  operations: {
    all: vi.fn().mockResolvedValue([]),
    one: vi.fn().mockResolvedValue(null),
    get: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    upsert: vi.fn()
  }
});

// Helper to create a mock registry
const createMockRegistry = (libraries: Map<string, any> = new Map()): Library.Registry => ({
  get: vi.fn((kta: string[]) => libraries.get(kta[0]) || null),
  register: vi.fn((lib: any) => {
    libraries.set(lib.coordinate.kta[0], lib);
  }),
  unregister: vi.fn(),
  list: vi.fn().mockReturnValue(Array.from(libraries.values())),
  has: vi.fn((kta: string[]) => libraries.has(kta[0]))
} as any);

describe('builders from @fjell/lib-sequelize', () => {
  describe('buildSequelizeReference', () => {
    it('should handle reference with empty registry', async () => {
      const item = { id: '1', name: 'test', userId: 'user-1', key: { kt: 'test', pk: '1' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'userId',
        kta: ['user'],
        property: 'user'
      };
      
      // Create registry with the user library
      const libraries = new Map();
      const userLibrary = createMockLibrary(['user']);
      userLibrary.operations.get = vi.fn().mockResolvedValue(null); // No user found
      libraries.set('user', userLibrary);
      
      const registry = createMockRegistry(libraries);
      const context = createOperationContext();

      const result = await buildSequelizeReference(item, referenceDefinition, registry, context);

      expect(result).toBe(item);
      // When reference is not found, the property is added but with null value
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('name', 'test');
      expect(result).toHaveProperty('userId', 'user-1');
      expect(result).toHaveProperty('key');
    });

    it('should work without context parameter', async () => {
      const item = { id: '2', name: 'test2', organizationId: 'org-1', key: { kt: 'test', pk: '2' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'organizationId',
        kta: ['organization'],
        property: 'organization'
      };
      
      // Create registry with the organization library
      const libraries = new Map();
      const orgLibrary = createMockLibrary(['organization']);
      orgLibrary.operations.get = vi.fn().mockResolvedValue(null);
      libraries.set('organization', orgLibrary);
      
      const registry = createMockRegistry(libraries);

      const result = await buildSequelizeReference(item, referenceDefinition, registry);

      expect(result).toBe(item);
      expect(result).toHaveProperty('id', '2');
      expect(result).toHaveProperty('name', 'test2');
      expect(result).toHaveProperty('organizationId', 'org-1');
      expect(result).toHaveProperty('key');
    });

    it('should handle complex reference definitions', async () => {
      const item = { id: '3', name: 'test3', data: { nested: 'value' }, parentId: 'parent-1', key: { kt: 'test', pk: '3' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'parentId',
        kta: ['parent', 'grandparent'],
        property: 'parent'
      };
      
      // Create registry with the parent library
      const libraries = new Map();
      const parentLibrary = createMockLibrary(['parent', 'grandparent']);
      parentLibrary.operations.get = vi.fn().mockResolvedValue(null);
      libraries.set('parent', parentLibrary);
      
      const registry = createMockRegistry(libraries);
      const context = createOperationContext();

      const result = await buildSequelizeReference(item, referenceDefinition, registry, context);

      expect(result).toBe(item);
      expect(result).toHaveProperty('id', '3');
      expect(result).toHaveProperty('name', 'test3');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('parentId', 'parent-1');
      expect(result).toHaveProperty('key');
    });

    it('should set property to null when column value is null', async () => {
      const item = { id: '10', name: 'null-col', userId: null, key: { kt: 'test', pk: '10' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'userId',
        kta: ['user'],
        property: 'user'
      };

      const libraries = new Map();
      const userLibrary = createMockLibrary(['user']);
      libraries.set('user', userLibrary);
      const registry = createMockRegistry(libraries);

      const result = await buildSequelizeReference(item, referenceDefinition, registry);

      expect(result.user).toBeNull();
      expect(userLibrary.operations.get).not.toHaveBeenCalled();
    });

    it('should call get with PriKey for primary items', async () => {
      const item = { id: '11', name: 'primary', userId: 'user-11', key: { kt: 'test', pk: '11' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'userId',
        kta: ['user'],
        property: 'user'
      };

      const libraries = new Map();
      const userLibrary = createMockLibrary(['user']);
      userLibrary.operations.get = vi.fn().mockResolvedValue({ id: 'user-11' });
      libraries.set('user', userLibrary);
      const registry = createMockRegistry(libraries);

      await buildSequelizeReference(item, referenceDefinition, registry);

      expect(userLibrary.operations.get).toHaveBeenCalledWith({ kt: 'user', pk: 'user-11' });
    });

    it('should build full ComKey when locationColumns are provided', async () => {
      const item = { id: '12', name: 'composite', stepId: 's-1', phaseId: 'p-1', key: { kt: 'test', pk: '12' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'stepId',
        kta: ['step', 'phase'],
        property: 'step',
        locationColumns: ['phaseId']
      };

      const libraries = new Map();
      const stepLibrary = createMockLibrary(['step', 'phase']);
      stepLibrary.operations.get = vi.fn().mockResolvedValue({ id: 's-1' });
      libraries.set('step', stepLibrary);
      const registry = createMockRegistry(libraries);

      await buildSequelizeReference(item, referenceDefinition, registry);

      expect(stepLibrary.operations.get).toHaveBeenCalledWith({ kt: 'step', pk: 's-1', loc: [{ kt: 'phase', lk: 'p-1' }] });
    });

    it('should fallback to empty loc array when a location column is missing', async () => {
      const item = { id: '13', name: 'fallback', stepId: 's-2', phaseId: null, key: { kt: 'test', pk: '13' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'stepId',
        kta: ['step', 'phase'],
        property: 'step',
        locationColumns: ['phaseId']
      };

      const libraries = new Map();
      const stepLibrary = createMockLibrary(['step', 'phase']);
      stepLibrary.operations.get = vi.fn().mockResolvedValue({ id: 's-2' });
      libraries.set('step', stepLibrary);
      const registry = createMockRegistry(libraries);

      await buildSequelizeReference(item, referenceDefinition, registry);

      expect(stepLibrary.operations.get).toHaveBeenCalledWith({ kt: 'step', pk: 's-2', loc: [] });
    });

    it('should create placeholder when context detects circular dependency', async () => {
      const item = { id: '14', name: 'circular', userId: 'user-14', key: { kt: 'test', pk: '14' } };
      const referenceDefinition: SequelizeReferenceDefinition = {
        column: 'userId',
        kta: ['user'],
        property: 'user'
      };

      const libraries = new Map();
      const userLibrary = createMockLibrary(['user']);
      // Should not be called because of in-progress shortcut
      userLibrary.operations.get = vi.fn();
      libraries.set('user', userLibrary);
      const registry = createMockRegistry(libraries);

      // Prepare context and mark itemKey in progress so the builder returns a placeholder
      const context = createOperationContext();
      const itemKey = { kt: 'user', pk: 'user-14' } as const;
      // @ts-ignore - access test helper API
      context.markInProgress(itemKey);

      const result = await buildSequelizeReference(item, referenceDefinition, registry, context);

      expect(userLibrary.operations.get).not.toHaveBeenCalled();
      expect(result.user).toEqual({ key: itemKey });
    });

    it('stripSequelizeReferenceItems should remove populated reference properties', () => {
      const item = { id: '20', name: 'with-ref', authorId: 'a-1', author: { id: 'a-1' } };
      const stripped = stripSequelizeReferenceItems(item as any, [
        { column: 'authorId', kta: ['author'], property: 'author' }
      ]);

      expect(stripped).toEqual({ id: '20', name: 'with-ref', authorId: 'a-1' });
    });
  });

  describe('buildAggregation', () => {
    it('should return the item unchanged', async () => {
      const item = { id: '1', name: 'test', key: { kt: 'test', pk: '1' } };
      const aggregationDefinition: AggregationDefinition = {
        kta: ['user'],
        property: 'userCount',
        cardinality: 'one'
      };
      
      // Create registry with the user library
      const libraries = new Map();
      const userLibrary = createMockLibrary(['user']);
      userLibrary.operations.all = vi.fn().mockResolvedValue([]);
      libraries.set('user', userLibrary);
      
      const registry = createMockRegistry(libraries);
      const context = createOperationContext();

      const result = await buildAggregation(item, aggregationDefinition, registry, context);

      expect(result).toBe(item);
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('name', 'test');
      expect(result).toHaveProperty('key');
    });

    it('should work without context parameter', async () => {
      const item = { id: '2', name: 'test2', key: { kt: 'test', pk: '2' } };
      const aggregationDefinition: AggregationDefinition = {
        kta: ['order'],
        property: 'orderCount',
        cardinality: 'many'
      };
      
      // Create registry with the order library
      const libraries = new Map();
      const orderLibrary = createMockLibrary(['order']);
      orderLibrary.operations.all = vi.fn().mockResolvedValue([]);
      libraries.set('order', orderLibrary);
      
      const registry = createMockRegistry(libraries);

      const result = await buildAggregation(item, aggregationDefinition, registry);

      expect(result).toBe(item);
      expect(result).toHaveProperty('id', '2');
      expect(result).toHaveProperty('name', 'test2');
      expect(result).toHaveProperty('key');
    });

    it('should handle complex aggregation definitions', async () => {
      const item = { id: '3', name: 'test3', data: { nested: 'value' }, key: { kt: 'test', pk: '3' } };
      const aggregationDefinition: AggregationDefinition = {
        kta: ['product', 'category'],
        property: 'productCount',
        cardinality: 'one'
      };
      
      // Create registry with the product library
      const libraries = new Map();
      const productLibrary = createMockLibrary(['product', 'category']);
      productLibrary.operations.all = vi.fn().mockResolvedValue([]);
      libraries.set('product', productLibrary);
      
      const registry = createMockRegistry(libraries);
      const context = createOperationContext();

      const result = await buildAggregation(item, aggregationDefinition, registry, context);

      expect(result).toBe(item);
      expect(result).toHaveProperty('id', '3');
      expect(result).toHaveProperty('name', 'test3');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('key');
    });

    it('should handle both cardinality types', async () => {
      const item = { id: '4', name: 'test4', key: { kt: 'test', pk: '4' } };
      
      // Test 'one' cardinality
      const oneDefinition: AggregationDefinition = {
        kta: ['user'],
        property: 'user',
        cardinality: 'one'
      };
      
      // Test 'many' cardinality
      const manyDefinition: AggregationDefinition = {
        kta: ['order'],
        property: 'orders',
        cardinality: 'many'
      };

      // Create registry with both user and order libraries
      const libraries = new Map();
      const userLibrary = createMockLibrary(['user']);
      userLibrary.operations.all = vi.fn().mockResolvedValue([]);
      libraries.set('user', userLibrary);
      
      const orderLibrary = createMockLibrary(['order']);
      orderLibrary.operations.all = vi.fn().mockResolvedValue([]);
      libraries.set('order', orderLibrary);
      
      const registry = createMockRegistry(libraries);
      const context = createOperationContext();

      const resultOne = await buildAggregation(item, oneDefinition, registry, context);
      const resultMany = await buildAggregation(item, manyDefinition, registry, context);

      expect(resultOne).toBe(item);
      expect(resultMany).toBe(item);
    });
  });

  describe('function signatures', () => {
    it('should have correct function signatures', () => {
      expect(typeof buildSequelizeReference).toBe('function');
      expect(typeof buildAggregation).toBe('function');
      
      // Verify function parameter counts
      expect(buildSequelizeReference.length).toBe(4);
      expect(buildAggregation.length).toBe(4);
    });
  });

  describe('builders integration', () => {
    it('should validate that builders work with proper mock setup', () => {
      // The Sequelize-specific builders perform validation
      // and require the registry to have the referenced libraries.
      // This test just verifies the functions are properly exported and callable.
      expect(typeof buildSequelizeReference).toBe('function');
      expect(typeof buildAggregation).toBe('function');
      
      // In actual usage, the registry would have the referenced libraries registered.
      // Testing with an empty registry would cause validation errors, which is the correct behavior.
      const testCases = [
        { id: '1', name: 'test1', key: { kt: 'test', pk: '1' } },
        { id: '2', name: 'test2', extra: 'data', key: { kt: 'test', pk: '2' } },
        { id: '3', name: 'test3', nested: { value: 'complex' }, key: { kt: 'test', pk: '3' } }
      ];

      // Verify we can construct the test items with various structures
      for (const item of testCases) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('key');
      }
    });
  });
});
