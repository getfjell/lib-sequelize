import { Definition } from '@/Definition';
import { getAllOperation } from '@/ops/all';
import { Item, ItemQuery, LocKeyArray } from '@fjell/core';
import { ModelStatic, Op } from 'sequelize';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";

type TestItem = import('@fjell/core').Item<'test'>;

describe('all', () => {
  let mockItem: Mocked<TestItem>;
  let mockModel: Mocked<ModelStatic<any>>;
  let mockRegistry: Mocked<Library.Registry>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // @ts-ignore
    mockItem = {
      key: {
        kt: 'test',
        pk: '123'
      },
      testColumn: 'test',
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test',
        deletedAt: '2024-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false
      })
    } as unknown as TestItem;

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockModel = {
      findAll: vi.fn().mockReturnValue([mockItem]),
      associations: {},
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
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    });

    // @ts-ignore
    definitionMock = {
      coordinate: {
        kta: ['test']
      },
      options: {
        deleteOnRemove: false,
        references: [],
        dependencies: []
      }
    } as unknown as Definition<TestItem, 'test'>;

    // @ts-ignore
    mockModel = {
      findAll: vi.fn(),
      associations: {}
    } as any;
  });

  it('should return empty array when no matches found', async () => {
    // @ts-ignore
    mockModel.findAll = vi.fn().mockResolvedValue([]);

    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    });

    const query: ItemQuery = {};
    const result = await getAllOperation([mockModel], definitionMock, mockRegistry)(query, []);

    expect(result).toEqual([]);
    expect(mockModel.findAll).toHaveBeenCalled();
  });

  it('should return matched items', async () => {
    const mockItems = [
      { get: () => ({ id: '1', name: 'Item 1' }) },
      { get: () => ({ id: '2', name: 'Item 2' }) }
    ];
    // @ts-ignore
    mockModel.findAll = vi.fn().mockResolvedValue(mockItems);
    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      name: {}
    });

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

  it('should handle location key constraints', async () => {
    type TestItem = Item<'test', 'order'>;

    const definitionMock: Mocked<Definition<TestItem, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      },
      options: {
        deleteOnRemove: false,
        references: [],
        dependencies: []
      }
    } as any;

    // @ts-ignore
    mockModel.associations = {
      order: {
        foreignKey: 'orderId'
      },
    };
    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    });
    // @ts-ignore
    mockModel.findAll = vi.fn().mockResolvedValue([]);

    const query: ItemQuery = {};
    const locations = [{ kt: 'order', lk: '123' }] as LocKeyArray<'order'>;

    await getAllOperation<
      Item<'test', 'order'>, 'test', 'order'
    >([mockModel], definitionMock, mockRegistry)(query, locations);

    expect(mockModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: {
            [Op.eq]: null
          },
          orderId: {
            [Op.eq]: '123'
          }
        }
      })
    );
  });

  it('should throw error for multiple locations', async () => {
    type TestItem = Item<'test', 'order', 'customer'>;

    const query: ItemQuery = {};
    const locations = [
      { kt: 'order', lk: '123' },
      { kt: 'customer', lk: '456' }
    ] as LocKeyArray<'order', 'customer'>;

    const definitionMock: Mocked<Definition<TestItem, 'test', 'order', 'customer'>> = {
      coordinate: {
        kta: ['test', 'order', 'customer'],
        scopes: []
      },
      options: {
        deleteOnRemove: false,
        references: [],
        dependencies: []
      }
    } as any;

    await expect(
      getAllOperation<
        Item<'test', 'order', 'customer'>, 'test', 'order', 'customer'
      >([mockModel], definitionMock, mockRegistry)(query, locations)
    ).rejects.toThrow('Not implemented for more than one location key');
  });

  it('should throw error for invalid location association', async () => {
    // @ts-ignore
    mockModel.associations = {};
    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    });

    const query: ItemQuery = {};
    const locations = [{ kt: 'invalidType', lk: '123' }] as LocKeyArray<'invalidType'>;

    await expect(
      // @ts-ignore
      getAllOperation<Item<'test'>, 'test'>([mockModel], definitionMock)(query, locations)
    ).rejects.toThrow('Location key type not found in model');
  });
});
