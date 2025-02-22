import { Definition } from '@/Definition';
import { getAllOperation } from '@/ops/all';
import { Item, ItemQuery, LocKeyArray } from '@fjell/core';
import { ModelStatic, Op } from 'sequelize';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});

describe('all', () => {
  type TestItem = Item<'test'>;

  let mockItem: jest.Mocked<TestItem>;
  let mockModel: jest.Mocked<ModelStatic<any>>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockItem = {
      key: {
        kt: 'test',
        pk: '123'
      },
      testColumn: 'test',
      get: jest.fn().mockReturnValue({
        id: '123',
        testColumn: 'test',
        deletedAt: '2024-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false
      })
    } as unknown as TestItem;
  
    mockModel = {
      findAll: jest.fn().mockReturnValue([mockItem]),
      associations: {},
      getAttributes: jest.fn().mockReturnValue({
        id: {},
        testColumn: {},
        deletedAt: {},
        createdAt: {},
        updatedAt: {},
        isDeleted: {}
      }),
    } as any;

    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    });

    definitionMock = {
      coordinate: {
        kta: ['test']
      }
    } as unknown as Definition<TestItem, 'test'>;

    mockModel = {
      findAll: jest.fn(),
      associations: {}
    } as any;
  });

  it('should return empty array when no matches found', async () => {
    mockModel.findAll = jest.fn().mockResolvedValue([]);
    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    });

    const query: ItemQuery = {};
    const result = await getAllOperation([mockModel], definitionMock)(query, []);

    expect(result).toEqual([]);
    expect(mockModel.findAll).toHaveBeenCalled();
  });

  it('should return matched items', async () => {
    const mockItems = [
      { get: () => ({ id: '1', name: 'Item 1' }) },
      { get: () => ({ id: '2', name: 'Item 2' }) }
    ];
    mockModel.findAll = jest.fn().mockResolvedValue(mockItems);
    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: {},
      name: {}
    });
    
    const query: ItemQuery = {};
    const result = await getAllOperation([mockModel], definitionMock)(query, []);

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

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      },
    } as any;

    // @ts-ignore
    mockModel.associations = {
      order: {
        foreignKey: 'orderId'
      },
    };
    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {},
      createdAt: {},
      updatedAt: {},
      isDeleted: {}
    })
    mockModel.findAll = jest.fn().mockResolvedValue([]);

    const query: ItemQuery = {};
    const locations = [{ kt: 'order', lk: '123' }] as LocKeyArray<'order'>;
    
    await getAllOperation<
      Item<'test', 'order'>, 'test', 'order'
    >([mockModel], definitionMock)(query, locations);

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

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order', 'customer'>> = {
      coordinate: {
        kta: ['test', 'order', 'customer'],
        scopes: []
      },
    } as any;

    await expect(
      getAllOperation<
        Item<'test', 'order', 'customer'>, 'test', 'order', 'customer'
      >([mockModel], definitionMock)(query, locations)
    ).rejects.toThrow('Not implemented for more than one location key');
  });

  it('should throw error for invalid location association', async () => {
    // @ts-ignore
    mockModel.associations = {};

    mockModel.getAttributes = jest.fn().mockReturnValue({
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
