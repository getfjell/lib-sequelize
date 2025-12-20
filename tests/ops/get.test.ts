import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

// Mock @fjell/lib before other imports
vi.mock('@fjell/lib', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    contextManager: {
      getCurrentContext: vi.fn().mockReturnValue(undefined),
      withContext: vi.fn().mockImplementation((_ctx, fn) => fn())
    },
    createOperationContext: actual.createOperationContext || vi.fn().mockReturnValue({
      markInProgress: vi.fn(),
      markComplete: vi.fn(),
      isInProgress: vi.fn(),
      getCached: vi.fn(),
      setCached: vi.fn(),
      isCached: vi.fn(),
    })
  };
});

import { getGetOperation } from '../../src/ops/get';
import { ComKey, PriKey } from "@fjell/types";
import { DataTypes, ModelStatic } from 'sequelize';
import { Definition } from '../../src/Definition';
import * as Library from "@fjell/lib";

type TestItem = import('@fjell/core').Item<'test'>;
type TestItemOrder = import('@fjell/core').Item<'test', 'order'>;

describe('get', () => {
  let mockModel: ModelStatic<any>;
  let mockRegistry: Mocked<Library.Registry>;
  let definitionMock: Mocked<Definition<TestItem, 'test', 'order'>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModel = {
      name: 'TestModel',
      findByPk: vi.fn(),
      findOne: vi.fn(),
      primaryKeyAttribute: 'id',
      associations: {
        order: {
          target: {
            name: 'Order',
            getAttributes: () => ({ id: {} })
          }
        }
      },
    } as any;

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: { type: DataTypes.STRING, allowNull: false },
      testColumn: { type: DataTypes.STRING, allowNull: false }
    });

    definitionMock = {
      coordinate: {
        kta: ['test'],
        scopes: []
      },
      options: {
        deleteOnRemove: false,
        references: [],
        dependencies: []
      }
    } as any;
  });

  it('should get item with PriKey', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      id: '123',
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(result).toEqual({
      id: '123',
      testColumn: 'test',
      key: { kt: 'test', pk: '123' },
      events: {
        created: { at: null },
        updated: { at: null },
        deleted: { at: null }
      }
    });
    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
  });

  it('should get item with ComKey', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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

    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const mockItem = {
      id: '123',
      orderId: '456',
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(result).toEqual({
      id: '123',
      orderId: '456',
      testColumn: 'test',
      key: { kt: 'test', pk: '123', loc: [{ kt: 'order', lk: '456' }] },
      events: {
        created: { at: null },
        updated: { at: null },
        deleted: { at: null }
      }
    });
    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: {
        id: '123',
        '$order.id$': '456'
      },
      include: [{
        model: mockModel.associations.order.target,
        as: 'order',
        required: true
      }]
    });
  });

  it('should throw NotFoundError when item not found with PriKey', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(null);

    await expect(
      getGetOperation([mockModel], definitionMock, mockRegistry)(key)
    ).rejects.toThrow('test not found');
  });

  it('should get item with full ComKey when location columns provided', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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

    // Full ComKey with location context
    const key = {
      kt: 'test',
      pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const mockItem = {
      id: '123',
      orderId: '456',
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock, mockRegistry)(key);

    // Should use findOne with where clause for full ComKey
    expect(mockModel.findOne).toHaveBeenCalled();
    expect(result.key).toEqual({ kt: 'test', pk: '123', loc: [{ kt: 'order', lk: '456' }] });
  });

  it('should get item with empty loc ComKey using findByPk', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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

    // Empty loc array means "find by primary key across all locations"
    const key = {
      kt: 'test',
      pk: '123',
      loc: []
    } as ComKey<'test', 'order'>;

    const mockItem = {
      id: '123',
      orderId: '456',
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock, mockRegistry)(key);

    // Should use findByPk for empty loc array
    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
    expect(result).toEqual({
      id: '123',
      orderId: '456',
      testColumn: 'test',
      key: { kt: 'test', pk: '123', loc: [{ kt: 'order', lk: '456' }] },
      events: {
        created: { at: null },
        updated: { at: null },
        deleted: { at: null }
      }
    });
  });

  it('should get item with full ComKey when location columns provided', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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

    // Full ComKey with location context
    const key = {
      kt: 'test',
      pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const mockItem = {
      id: '123',
      orderId: '456',
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock, mockRegistry)(key);

    // Should use findOne with where clause for full ComKey
    expect(mockModel.findOne).toHaveBeenCalled();
    expect(result.key).toEqual({ kt: 'test', pk: '123', loc: [{ kt: 'order', lk: '456' }] });
  });

  it('should get item with empty loc ComKey using findByPk', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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

    // Empty loc array means "find by primary key across all locations"
    const key = {
      kt: 'test',
      pk: '123',
      loc: []
    } as ComKey<'test', 'order'>;

    const mockItem = {
      id: '123',
      orderId: '456',
      testColumn: 'test',
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getGetOperation([mockModel], definitionMock, mockRegistry)(key);

    // Should use findByPk for empty loc array
    expect(mockModel.findByPk).toHaveBeenCalledWith('123');
    expect(result).toEqual({
      id: '123',
      orderId: '456',
      testColumn: 'test',
      key: { kt: 'test', pk: '123', loc: [{ kt: 'order', lk: '456' }] },
      events: {
        created: { at: null },
        updated: { at: null },
        deleted: { at: null }
      }
    });
  });

  it('should throw NotFoundError when item not found with ComKey', async () => {
    const definitionMock: Mocked<Definition<TestItemOrder, 'test', 'order'>> = {
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

    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(null);

    await expect(
      getGetOperation([mockModel], definitionMock, mockRegistry)(key)
    ).rejects.toThrow('test not found');
  });

  it('should throw error for invalid key', async () => {
    const invalidKey = { invalid: 'key' };

    await expect(
      // @ts-ignore - Testing invalid key
      getGetOperation([mockModel], definitionMock, mockRegistry)(invalidKey)
    ).rejects.toThrow('Invalid key structure');
  });
});
