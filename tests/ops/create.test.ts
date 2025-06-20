import { Definition } from '@/Definition';
import { getCreateOperation } from '@/ops/create';
import { cPK, LocKeyArray } from '@fjell/core';
import { ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";

type TestItem = import('@fjell/core').Item<'test'>;
type TestItemOrder = import('@fjell/core').Item<'test', 'order'>;

describe('create', () => {
  let mockModel: ModelStatic<any>;
  let mockRegistry: Mocked<Library.Registry>;

  beforeEach(() => {
    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockModel = {
      create: vi.fn(),
      name: 'TestModel',
      getAttributes: vi.fn().mockReturnValue({
        id: {},
        testColumn: {},
        createdAt: {},
        updatedAt: {},
        orderId: {}
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
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    const mockCreatedItem = {
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    const result = await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem);

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      testColumn: 'test'
    }));
    expect(result.key).toEqual(expect.objectContaining({
      kt: 'test',
      pk: expect.any(String)
    }));
    expect(result.testColumn).toBe('test');
  });

  it('should create item with ComKey using location', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
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
        testColumn: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    const result = await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem, { locations: location });

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      testColumn: 'test',
      orderId: '456'
    }));
    expect(result.key).toEqual({
      kt: 'test',
      pk: expect.any(String),
      loc: [{ kt: 'order', lk: '456' }]
    });
  });

  it('should create item with specified ID', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const mockCreatedItem = {
      get: vi.fn().mockReturnValue({
        id: 'custom-id',
        testColumn: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };

    const key = cPK('custom-id', 'test');

    const definitionMock: Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    const result = await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem, { key });

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      testColumn: 'test',
      id: 'custom-id'
    }));
    expect(result.key).toEqual({
      kt: 'test',
      pk: 'custom-id'
    });
  });

  it('should throw error if location key type not found in model', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const location = [{ kt: 'invalidType', lk: '456' }] as any;

    const definitionMock: Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    await expect(
      getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem, { locations: location })
    ).rejects.toThrow('Foreign key field \'invalidTypeId\' does not exist on model TestModel');
  });
});
