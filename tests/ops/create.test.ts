import { Definition } from '@/Definition';
import { getCreateOperation } from '@/ops/create';
import { cPK, Item, LocKeyArray } from '@fjell/core';
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

describe('create', () => {
  type TestItem = Item<'test'>;

  let mockModel: ModelStatic<any>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      getAttributes: jest.fn().mockReturnValue({
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

    const definitionMock: jest.Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;

    const mockCreatedItem = {
      get: jest.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.create = jest.fn().mockResolvedValue(mockCreatedItem);

    await expect(
      getCreateOperation([mockModel], definitionMock)(newItem)
    ).rejects.toThrow('Not implemented');

  });

  it('should create item with ComKey using location', async () => {
    type TestItem = Item<'test', 'order'>;

    const definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>> = {
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
      get: jest.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.create = jest.fn().mockResolvedValue(mockCreatedItem);

    await expect(
      getCreateOperation([mockModel], definitionMock)(newItem, { locations: location })
    ).rejects.toThrow('Not implemented');

  });

  it('should create item with specified ID', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const mockCreatedItem = {
      get: jest.fn().mockReturnValue({
        id: 'custom-id',
        testColumn: 'test'
      })
    };

    const key = cPK('custom-id', 'test');

    const definitionMock: jest.Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      }
    } as any;

    // @ts-ignore
    mockModel.create = jest.fn().mockResolvedValue(mockCreatedItem);

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
