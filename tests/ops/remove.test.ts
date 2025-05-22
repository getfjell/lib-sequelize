import { Definition } from '@/Definition';
import { getRemoveOperation } from '@/ops/remove';
import { ComKey, Item, PriKey } from '@fjell/core';
import { ModelStatic } from 'sequelize';
import { jest } from '@jest/globals';

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

describe('remove', () => {
  type TestItem = Item<'test'>;

  let mockModel: jest.Mocked<ModelStatic<any>>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    mockModel = {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      getAttributes: jest.fn().mockReturnValue({
        id: {},
        testColumn: {},
        deletedAt: {},
        createdAt: {},
        updatedAt: {},
        isDeleted: {}
      }),
    } as any;

    definitionMock = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;
  });

  it('should soft delete item with PriKey when deletedAt exists', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      save: jest.fn(),
      get: jest.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    // @ts-ignore
    mockModel.findByPk = jest.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock)(key);

    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
    expect(mockItem.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      key: {
        kt: 'test',
        pk: '123'
      }
    });
  });

  it('should soft delete item with ComKey when isDeleted exists', async () => {
    type TestItem = Item<'test', 'order'>;

    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const mockItem = {
      save: jest.fn(),
      get: jest.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      }),
      id: '123',
      orderId: '456'
    };

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    // @ts-ignore
    mockModel.findOne = jest.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock)(key);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: {
        id: '123',
        orderId: '456'
      }
    });
    expect(mockItem.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      key: {
        kt: 'test', pk: '123',
        loc: [{ kt: 'order', lk: '456' }]
      }
    });
  });

  it('should hard delete when deleteOnRemove is true and no soft delete fields exist', async () => {
    // @ts-ignore
    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: {},
      testColumn: {}
    });

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      destroy: jest.fn(),
      get: jest.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    definitionMock.options = {
      deleteOnRemove: true
    };

    // @ts-ignore
    mockModel.findByPk = jest.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock)(key);

    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
    expect(mockItem.destroy).toHaveBeenCalled();
    expect(result).toMatchObject({
      key: {
        kt: 'test',
        pk: '123'
      }
    });
  });

  it('should throw error when no soft delete fields and deleteOnRemove false', async () => {
    // @ts-ignore
    mockModel.getAttributes = jest.fn().mockReturnValue({
      id: {},
      testColumn: {}
    });

    definitionMock.options = {
      deleteOnRemove: false
    };

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      get: jest.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    // @ts-ignore
    mockModel.findByPk = jest.fn().mockResolvedValue(mockItem);

    // @ts-ignore
    await expect(
      getRemoveOperation([mockModel], definitionMock)(key)
    ).rejects.toThrow('No deletedAt or isDeleted attribute found in model, and deleteOnRemove is not set');
  });

  it('should throw error for invalid key', async () => {
    const invalidKey = { kt: 'test' } as any;

    await expect(
      getRemoveOperation([mockModel], definitionMock)(invalidKey)
    ).rejects.toThrow('Key for Remove is not a valid ItemKey');
  });
});
