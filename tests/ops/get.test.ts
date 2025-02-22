import { getGetOperation } from '@/ops/get';
import { ComKey, Item, PriKey } from '@fjell/core';
import { Definition, NotFoundError } from '@fjell/lib';
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

describe('get', () => {
  type TestItem = Item<'test'>;

  let mockModel: ModelStatic<any>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>>;
  
  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = {
      findByPk: jest.fn(),
      findOne: jest.fn(),
    } as any;
    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: { type: DataTypes.STRING, allowNull: false },
      testColumn: { type: DataTypes.STRING, allowNull: false }
    });
 
    definitionMock = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;
  });

  it('should get item with PriKey', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      id: '123',
      testColumn: 'test',
      get: jest.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    mockModel.findByPk = jest.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock)(key);

    expect(result).toEqual({
      id: '123',
      testColumn: 'test',
      key: { kt: 'test', pk: '123' }
    });
    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
  });

  it('should get item with ComKey', async () => {
    type TestItem = Item<'test', 'order'>;

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const mockItem = {
      id: '123',
      orderId: '456',
      testColumn: 'test',
      get: jest.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    mockModel.findOne = jest.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock)(key);

    expect(result).toEqual({
      id: '123',
      orderId: '456',
      testColumn: 'test',
      key: { kt: 'test', pk: '123', loc: [{ kt: 'order', lk: '456' }] }
    });
    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: { id: '123', orderId: '456' }
    });
  });

  it('should throw NotFoundError when item not found with PriKey', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;

    mockModel.findByPk = jest.fn().mockResolvedValue(null);
  
    await expect(
      getGetOperation([mockModel], definitionMock)(key)
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when item not found with ComKey', async () => {
    type TestItem = Item<'test', 'order'>;

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    mockModel.findOne = jest.fn().mockResolvedValue(null);

    await expect(
      getGetOperation([mockModel], definitionMock)(key)
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw error for invalid key', async () => {
    const invalidKey = { invalid: 'key' };
  
    await expect(
      // @ts-ignore - Testing invalid key
      getGetOperation([mockModel], definitionMock)(invalidKey)
    ).rejects.toThrow('Key for Get is not a valid ItemKey');
  });
});
