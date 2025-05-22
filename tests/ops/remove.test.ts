import { Definition } from '@/Definition';
import { getRemoveOperation } from '@/ops/remove';
import { ComKey, Item, PriKey } from '@fjell/core';
import { ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

type TestItem = import('@fjell/core').Item<'test'>;

describe('remove', () => {
  let mockModel: Mocked<ModelStatic<any>>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    mockModel = {
      findByPk: vi.fn(),
      findOne: vi.fn(),
      getAttributes: vi.fn().mockReturnValue({
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
      save: vi.fn(),
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

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
      save: vi.fn(),
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      }),
      id: '123',
      orderId: '456'
    };

    const definitionMock: Mocked<Definition<TestItem, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

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
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {}
    });

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      destroy: vi.fn(),
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    definitionMock.options = {
      deleteOnRemove: true
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

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
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {}
    });

    definitionMock.options = {
      deleteOnRemove: false
    };

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

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
