import { Definition } from '@/Definition';
import { getCreateOperation } from '@/ops/create';
import { cPK, LocKeyArray } from '@fjell/core';
import { ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

type TestItem = import('@fjell/core').Item<'test'>;
type TestItemOrder = import('@fjell/core').Item<'test', 'order'>;

describe('create', () => {
  let mockModel: ModelStatic<any>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      getAttributes: vi.fn().mockReturnValue({
        id: {},
        testColumn: {},
        createdAt: {},
        updatedAt: {}
      }),
    } as any;
  });

  it('should create item with PriKey', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const definitionMock: Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;

    const mockCreatedItem = {
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await expect(
      getCreateOperation([mockModel], definitionMock)(newItem)
    ).rejects.toThrow('Not implemented');

  });

  it('should create item with ComKey using location', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    const newItem = {
      testColumn: 'test'
    };

    const location = [{ kt: 'order', lk: '456' }] as LocKeyArray<'order'>;

    const mockCreatedItem = {
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await expect(
      getCreateOperation([mockModel], definitionMock)(newItem, { locations: location })
    ).rejects.toThrow('Not implemented');

  });

  it('should create item with specified ID', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const mockCreatedItem = {
      get: vi.fn().mockReturnValue({
        id: 'custom-id',
        testColumn: 'test'
      })
    };

    const key = cPK('custom-id', 'test');

    const definitionMock: Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;

    // @ts-ignore
    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await expect(
      getCreateOperation([mockModel], definitionMock)(newItem, { key })
    ).rejects.toThrow('Not implemented');
  });

  it('should throw error if location key type not found in model', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const location = [{ kt: 'invalidType', lk: '456' }] as LocKeyArray<'invalidType'>;

    await expect(
      // @ts-ignore
      getCreateOperation([mockModel], definitionMock)(newItem, { locations: location })
    ).rejects.toThrow('Not implemented');
  });
});
