 
import { Definition } from '../../src/Definition';
import { getAllOperation } from '../../src/ops/all';
import { Item, ItemQuery, LocKeyArray } from '@fjell/core';
import { ModelStatic, Op } from 'sequelize';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";
// Mocking dependencies
vi.mock('../../src/QueryBuilder', () => ({
  buildQuery: vi.fn()
}));

vi.mock('../../src/util/relationshipUtils', () => ({
  buildRelationshipPath: vi.fn()
}));

vi.mock('../../src/RowProcessor', () => ({
  processRow: vi.fn(),
  contextManager: {
    getCurrentContext: vi.fn(),
    withContext: vi.fn()
  }
}));

vi.mock('@fjell/core', async () => {
  const actual = await vi.importActual('@fjell/core');
  return {
    ...actual,
    validateKeys: vi.fn()
  };
});

vi.mock('@fjell/lib', async () => {
  const actual = await vi.importActual('@fjell/lib');
  return {
    ...actual,
    contextManager: {
      getCurrentContext: vi.fn()
    }
  };
});

vi.mock('../../src/util/general', () => ({
  stringifyJSON: vi.fn()
}));

import { buildQuery } from '../../src/QueryBuilder';
import { buildRelationshipPath } from '../../src/util/relationshipUtils';
import { processRow } from '../../src/RowProcessor';
import { validateKeys } from '@fjell/core';
import { contextManager } from '../../src/RowProcessor';
import { stringifyJSON } from '../../src/util/general';

type TestItem = import('@fjell/core').Item<'test'>;

describe('all', () => {
  let mockItem: Mocked<TestItem>;
  let mockModel: Mocked<ModelStatic<any>>;
  let mockRegistry: Mocked<Library.Registry>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (buildQuery as any).mockReturnValue({ where: { deletedAt: { [Op.eq]: null } }, include: [] });
    (buildRelationshipPath as any).mockReturnValue({ found: false, isDirect: false });
    (processRow as any).mockImplementation((row: any) => row.get());
    (validateKeys as any).mockImplementation((item: any) => item);
    (contextManager.getCurrentContext as any).mockReturnValue({});
    (stringifyJSON as any).mockImplementation((obj: any) => JSON.stringify(obj));

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockModel = {
      name: 'TestModel',
      findAll: vi.fn(),
      associations: {},
      primaryKeyAttribute: 'id',
      getAttributes: vi.fn().mockReturnValue({
        id: {},
        testColumn: {},
        deletedAt: {},
        createdAt: {},
        updatedAt: {},
        isDeleted: {}
      }),
    } as any;

    // @ts-ignore
    mockItem = {
      key: {
        kt: 'test',
        pk: '123'
      },
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test',
        deletedAt: '2024-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false
      })
    } as unknown as TestItem;

    mockModel.findAll = vi.fn().mockReturnValue([mockItem]);

    // @ts-ignore
    definitionMock = {
      coordinate: {
        kta: ['test']
      },
      options: {
        deleteOnRemove: false,
        references: [],
        dependencies: [],
        aggregations: []
      }
    } as unknown as Definition<TestItem, 'test'>;
  });

  describe('basic functionality', () => {
    it('should return empty array when no matches found', async () => {
      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};
      const result = await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(result).toEqual([]);
      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should return matched items', async () => {
      const mockItems = [
        {
          id: '1',
          constructor: mockModel,
          get: () => ({ id: '1', name: 'Item 1' })
        },
        {
          id: '2',
          constructor: mockModel,
          get: () => ({ id: '2', name: 'Item 2' })
        }
      ];

      mockModel.findAll = vi.fn().mockResolvedValue(mockItems);
      (validateKeys as any).mockImplementation((item: any) => ({
        key: { kt: 'test', pk: item.id },
        ...item
      }));

      const query: ItemQuery = {};
      const result = await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        key: { kt: 'test', pk: '1' },
        id: '1',
        name: 'Item 1'
      });
      expect(result[1]).toMatchObject({
        key: { kt: 'test', pk: '2' },
        id: '2',
        name: 'Item 2'
      });
    });
  });

  describe('location key handling', () => {
    it('should handle single direct location key constraint', async () => {
      type TestItem = Item<'test', 'order'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'order'>> = {
        coordinate: {
          kta: ['test', 'order'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: true,
        path: 'orderId'
      });

      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};
      const locations = [{ kt: 'order', lk: '123' }] as LocKeyArray<'order'>;

      await getAllOperation<Item<'test', 'order'>, 'test', 'order'>([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(buildQuery).toHaveBeenCalledWith(query, mockModel);
    });

    it('should handle hierarchical location keys with includes', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false,
        path: 'category.id',
        includes: [{ model: mockModel, as: 'category' }]
      });

      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};
      const locations = [{ kt: 'category', lk: 'electronics' }] as LocKeyArray<'category'>;

      await getAllOperation<Item<'test', 'category'>, 'test', 'category'>([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should throw error for unresolvable location key', async () => {
      type TestItem = Item<'test', 'invalidType'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'invalidType'>> = {
        coordinate: {
          kta: ['test', 'invalidType'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({ found: false });

      const query: ItemQuery = {};
      const locations = [{ kt: 'invalidType', lk: '123' }] as any;

      await expect(
        getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations)
      ).rejects.toThrow("Location key 'invalidType' cannot be resolved on model 'TestModel' or through its relationships.");
    });
  });

  describe('location key validation', () => {
    let testDefinitionMock: Mocked<Definition<Item<'test', 'test'>, 'test', 'test'>>;

    beforeEach(() => {
      testDefinitionMock = {
        coordinate: {
          kta: ['test', 'test'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: true,
        path: 'testId'
      });
    });

    it('should throw error for undefined location key value', async () => {
      const query: ItemQuery = {};
      const locations = [{ kt: 'test', lk: undefined }] as any;

      await expect(
        getAllOperation([mockModel], testDefinitionMock, mockRegistry)(query, locations)
      ).rejects.toThrow("Location key 'test' has invalid lk value:");
    });

    it('should throw error for null location key value', async () => {
      const query: ItemQuery = {};
      const locations = [{ kt: 'test', lk: null }] as any;

      await expect(
        getAllOperation([mockModel], testDefinitionMock, mockRegistry)(query, locations)
      ).rejects.toThrow("Location key 'test' has invalid lk value:");
    });

    it('should throw error for empty string location key value', async () => {
      const query: ItemQuery = {};
      const locations = [{ kt: 'test', lk: '' }] as any;

      await expect(
        getAllOperation([mockModel], testDefinitionMock, mockRegistry)(query, locations)
      ).rejects.toThrow("Location key 'test' has invalid lk value:");
    });

    it('should throw error for empty object location key value', async () => {
      const query: ItemQuery = {};
      const locations = [{ kt: 'test', lk: {} }] as any;

      await expect(
        getAllOperation([mockModel], testDefinitionMock, mockRegistry)(query, locations)
      ).rejects.toThrow("Location key 'test' has invalid lk value:");
    });

    it('should throw error for hierarchical location key with invalid value', async () => {
      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false,
        path: 'test.id'
      });

      const query: ItemQuery = {};
      const locations = [{ kt: 'test', lk: null }] as any;

      await expect(
        getAllOperation([mockModel], testDefinitionMock, mockRegistry)(query, locations)
      ).rejects.toThrow("Hierarchical location key 'test' has invalid lk value:");
    });
  });

  describe('conflict resolution', () => {
    it('should skip direct location constraint when field already constrained by itemQuery', async () => {
      type TestItem = Item<'test', 'order'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'order'>> = {
        coordinate: {
          kta: ['test', 'order'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: true,
        path: 'orderId'
      });

      (buildQuery as any).mockReturnValue({
        where: {
          deletedAt: { [Op.eq]: null },
          orderId: { [Op.eq]: 'existing-value' }
        },
        include: []
      });

      const query: ItemQuery = { orderId: 'existing-value' } as any;
      const locations = [{ kt: 'order', lk: '123' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should skip hierarchical location constraint when field already constrained by itemQuery', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false,
        path: 'category.id'
      });

      (buildQuery as any).mockReturnValue({
        where: {
          deletedAt: { [Op.eq]: null },
          'category.id': { [Op.eq]: 'existing-category' }
        },
        include: []
      });

      const query: ItemQuery = {};
      const locations = [{ kt: 'category', lk: 'electronics' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });
  });

  describe('include merging', () => {
    it('should merge includes from multiple hierarchical locations', async () => {
      type TestItem = Item<'test', 'category', 'brand'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category', 'brand'>> = {
        coordinate: {
          kta: ['test', 'category', 'brand'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any)
        .mockReturnValueOnce({
          found: true,
          isDirect: false,
          path: 'category.id',
          includes: [{ model: mockModel, as: 'category' }]
        })
        .mockReturnValueOnce({
          found: true,
          isDirect: false,
          path: 'brand.id',
          includes: [{ model: mockModel, as: 'brand' }]
        });

      (buildQuery as any).mockReturnValue({
        where: { deletedAt: { [Op.eq]: null } },
        include: [{ model: mockModel, as: 'existing' }]
      });

      const query: ItemQuery = {};
      const locations = [
        { kt: 'category', lk: 'electronics' },
        { kt: 'brand', lk: 'samsung' }
      ] as LocKeyArray<'category', 'brand'>;

      await getAllOperation<Item<'test', 'category', 'brand'>, 'test', 'category', 'brand'>(
        [mockModel], definitionMock, mockRegistry
      )(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle existing includes when merging', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false,
        path: 'category.id',
        includes: [{ model: mockModel, as: 'category', include: [{ model: mockModel, as: 'subcategory' }] }]
      });

      (buildQuery as any).mockReturnValue({
        where: { deletedAt: { [Op.eq]: null } },
        include: [{ model: mockModel, as: 'category', include: [{ model: mockModel, as: 'existing' }] }]
      });

      const query: ItemQuery = {};
      const locations = [{ kt: 'category', lk: 'electronics' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle merging includes when existing include has no include property', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false,
        path: 'category.id',
        includes: [{ model: mockModel, as: 'category', include: [{ model: mockModel, as: 'subcategory' }] }]
      });

      (buildQuery as any).mockReturnValue({
        where: { deletedAt: { [Op.eq]: null } },
        include: [{ model: mockModel, as: 'category' }] // No include property on existing
      });

      const query: ItemQuery = {};
      const locations = [{ kt: 'category', lk: 'electronics' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle hierarchical location without includes', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false,
        path: 'category.name'
        // No includes property
      });

      const query: ItemQuery = {};
      const locations = [{ kt: 'category', lk: 'electronics' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle hierarchical location found but without path', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: false
        // No path property
      });

      const query: ItemQuery = {};
      const locations = [{ kt: 'category', lk: 'electronics' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
    });
  });

  describe('mixed location types', () => {
    it('should handle combination of direct and hierarchical location keys', async () => {
      type TestItem = Item<'test', 'order', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'order', 'category'>> = {
        coordinate: {
          kta: ['test', 'order', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any)
        .mockReturnValueOnce({ found: true, isDirect: true, path: 'orderId' })
        .mockReturnValueOnce({
          found: true,
          isDirect: false,
          path: 'category.id',
          includes: [{ model: mockModel, as: 'category' }]
        });

      const query: ItemQuery = {};
      const locations = [
        { kt: 'order', lk: '123' },
        { kt: 'category', lk: 'electronics' }
      ] as LocKeyArray<'order', 'category'>;

      await getAllOperation<Item<'test', 'order', 'category'>, 'test', 'order', 'category'>(
        [mockModel], definitionMock, mockRegistry
      )(query, locations);

      expect(mockModel.findAll).toHaveBeenCalled();
      // buildRelationshipPath should be called once for each location key
      expect(buildRelationshipPath).toHaveBeenCalledWith(mockModel, 'order', ['test', 'order', 'category'], true);
      expect(buildRelationshipPath).toHaveBeenCalledWith(mockModel, 'category', ['test', 'order', 'category'], true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle JSON.stringify errors in trace logging', async () => {
      (stringifyJSON as any).mockImplementation(() => {
        throw new Error('Cannot stringify');
      });

      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle cases with no locations parameter', async () => {
      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};

      const result = await getAllOperation([mockModel], definitionMock, mockRegistry)(query);

      expect(result).toEqual([]);
      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle cases with undefined locations', async () => {
      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};

      const result = await getAllOperation([mockModel], definitionMock, mockRegistry)(query, undefined);

      expect(result).toEqual([]);
      expect(mockModel.findAll).toHaveBeenCalled();
    });

    it('should handle empty where clause from buildQuery', async () => {
      (buildQuery as any).mockReturnValue({ include: [] });

      mockModel.findAll = vi.fn().mockResolvedValue([]);

      const query: ItemQuery = {};

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(mockModel.findAll).toHaveBeenCalled();
    });
  });

  describe('references and aggregations processing', () => {
    it('should process references and aggregations through processRow', async () => {
      const mockReferences = [{ type: 'belongsTo', target: 'User' }];
      const mockAggregations = [{ field: 'count', operation: 'sum' }];

      definitionMock.options.references = mockReferences as any;
      definitionMock.options.aggregations = mockAggregations as any;

      const mockContext = { userId: '123' };
      (contextManager.getCurrentContext as any).mockReturnValue(mockContext);

      const mockProcessedItem = { id: '1', processed: true };
      (processRow as any).mockResolvedValue(mockProcessedItem);
      (validateKeys as any).mockReturnValue(mockProcessedItem);

      mockModel.findAll = vi.fn().mockResolvedValue([mockItem]);

      const query: ItemQuery = {};
      const result = await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(processRow).toHaveBeenCalledWith(
        mockItem,
        definitionMock.coordinate.kta,
        mockReferences,
        mockAggregations,
        mockRegistry,
        mockContext
      );
      expect(validateKeys).toHaveBeenCalledWith(mockProcessedItem, definitionMock.coordinate.kta);
      expect(result).toEqual([mockProcessedItem]);
    });

    it('should handle multiple items with references and aggregations', async () => {
      const mockItems = [mockItem, { ...mockItem, id: '2' }];
      mockModel.findAll = vi.fn().mockResolvedValue(mockItems);

      (processRow as any).mockResolvedValue({ processed: true });
      (validateKeys as any).mockImplementation((item: any) => item);

      const query: ItemQuery = {};
      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(processRow).toHaveBeenCalledTimes(2);
      expect(validateKeys).toHaveBeenCalledTimes(2);
    });
  });

  describe('context management', () => {
    it('should use current context from contextManager', async () => {
      const mockContext = { requestId: 'req-123', userId: 'user-456' };
      (contextManager.getCurrentContext as any).mockReturnValue(mockContext);

      mockModel.findAll = vi.fn().mockResolvedValue([mockItem]);

      const query: ItemQuery = {};
      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

      expect(contextManager.getCurrentContext).toHaveBeenCalled();
      expect(processRow).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        mockContext
      );
    });
  });

  describe('multiple complex scenarios', () => {
    it('should handle multiple location keys with some unresolvable', async () => {
      type TestItem = Item<'test', 'order', 'invalid'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'order', 'invalid'>> = {
        coordinate: {
          kta: ['test', 'order', 'invalid'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any)
        .mockReturnValueOnce({ found: true, isDirect: true })
        .mockReturnValueOnce({ found: false });

      const query: ItemQuery = {};
      const locations = [
        { kt: 'order', lk: '123' },
        { kt: 'invalid', lk: '456' }
      ] as LocKeyArray<'order', 'invalid'>;

      await expect(
        getAllOperation<Item<'test', 'order', 'invalid'>, 'test', 'order', 'invalid'>(
          [mockModel], definitionMock, mockRegistry
        )(query, locations)
      ).rejects.toThrow("Location key 'invalid' cannot be resolved");
    });

    it('should handle complex itemQuery with multiple constraints and locations', async () => {
      type TestItem = Item<'test', 'category'>;
      const definitionMock: Mocked<Definition<TestItem, 'test', 'category'>> = {
        coordinate: {
          kta: ['test', 'category'],
          scopes: []
        },
        options: {
          deleteOnRemove: false,
          references: [],
          dependencies: [],
          aggregations: []
        }
      } as any;

      (buildRelationshipPath as any).mockReturnValue({
        found: true,
        isDirect: true,
        path: 'categoryId'
      });

      (buildQuery as any).mockReturnValue({
        where: {
          deletedAt: { [Op.eq]: null },
          name: { [Op.like]: '%test%' },
          status: { [Op.eq]: 'active' }
        },
        include: [],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      const query: ItemQuery = {
        name: { [Op.like]: '%test%' },
        status: 'active'
      } as any;
      const locations = [{ kt: 'category', lk: 'electronics' }] as any;

      await getAllOperation([mockModel], definitionMock, mockRegistry)(query, locations);

      expect(buildQuery).toHaveBeenCalledWith(query, mockModel);
      expect(mockModel.findAll).toHaveBeenCalled();
    });
  });
});
