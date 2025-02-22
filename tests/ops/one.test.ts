import { getOneOperation } from '@/ops/one';
import { IQFactory, Item, ItemQuery, LocKeyArray } from '@fjell/core';
import { Definition } from '@fjell/lib';
import { DataTypes, ModelStatic } from 'sequelize';

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

describe('one', () => {
  type TestItem = Item<'test'>;

  let mockModel: jest.Mocked<ModelStatic<any>>;
  let mockItems: jest.Mocked<TestItem>[];
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;
    
  beforeEach(() => {
    jest.clearAllMocks();
  
    mockItems = [
      {
        key: { kt: 'test', pk: '1' },
        events: {
          created: { at: new Date() },
          updated: { at: new Date() },
          deleted: { at: null },
        },
        name: 'Item 1',
        get: jest.fn().mockReturnValue({
          id: '1',
          name: 'Item 1',
          status: 'active'
        })
      },
    ] as TestItem[];

    mockModel = {
      findAll: jest.fn().mockResolvedValue(mockItems),
      getAttributes: jest.fn().mockReturnValue({
        id: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false },
      }),
    } as any;

    definitionMock = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;
  });

  it('should return first item when results exist', async () => {
    mockModel.findAll = jest.fn().mockReturnValue(mockItems as Item<'test'>[]);

    const itemQuery: ItemQuery = IQFactory.condition('status', 'active').limit(1).toQuery();

    const result = await getOneOperation([mockModel], definitionMock)(
      itemQuery,
      [],
    );

    const expectedResult = {
      id: '1',
      name: 'Item 1',
      status: 'active',
      key: {
        kt: 'test',
        pk: '1',
      }
    }

    expect(result).toEqual(expectedResult);
  });

  it('should return null when no results exist', async () => {
    mockModel.findAll = jest.fn().mockReturnValue([] as Item<'test'>[]);

    const itemQuery: ItemQuery = IQFactory.condition('status', 'inactive').limit(1).toQuery();

    const result = await getOneOperation([mockModel], definitionMock)(
      itemQuery,
    );

    expect(result).toBeNull();
  });

  it('should pass locations array to all()', async () => {
    type TestItem = Item<'test', 'location1', 'location2'>;

    const itemQuery: ItemQuery = IQFactory.condition('status', 'active').limit(1).toQuery();
    const locations = [
      {kt: 'location1', lk: '1' },
      {kt: 'location2', lk: '2' },
    ] as LocKeyArray<'location1','location2'>;

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'location1', 'location2'>> = {
      coordinate: {
        kta: ['test', 'location1', 'location2'],
        scopes: []
      }
    } as any;

    await expect(
      getOneOperation([mockModel], definitionMock)(
        itemQuery,
        locations,
      )
    ).rejects.toThrow('Not implemented for more than one location key');
    
  });
});
