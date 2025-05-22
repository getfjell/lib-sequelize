import { getGetOperation } from '@/ops/get';
import { ComKey, PriKey } from '@fjell/core';
import { Definition, NotFoundError } from '@fjell/lib';
import { DataTypes, ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

type TestItem = import('@fjell/core').Item<'test'>;
type TestItemOrder = import('@fjell/core').Item<'test', 'order'>;

describe('get', () => {
  let mockModel: ModelStatic<any>;
  let definitionMock: Mocked<Definition<TestItem, 'test', 'order'>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModel = {
      findByPk: vi.fn(),
      findOne: vi.fn(),
    } as any;

    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
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
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock)(key);

    expect(result).toEqual({
      id: '123',
      testColumn: 'test',
      key: { kt: 'test', pk: '123' }
    });
    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
  });

  it('should get item with ComKey', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

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

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(null);

    await expect(
      getGetOperation([mockModel], definitionMock)(key)
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when item not found with ComKey', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(null);

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
