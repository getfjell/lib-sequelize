import { Definition } from '../../src/Definition';
import { getRemoveOperation } from '../../src/ops/remove';
import { ComKey, Item, PriKey } from '@fjell/core';
import { ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";

// Mock the logger
vi.mock('../../src/logger', () => ({
  default: {
    get: () => ({
      default: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    })
  }
}));

// Mock the relationship utils
vi.mock('../../src/util/relationshipUtils', () => ({
  buildRelationshipPath: vi.fn()
}));

// Mock other dependencies
vi.mock('../../src/EventCoordinator', () => ({
  populateEvents: vi.fn().mockImplementation((item) => item)
}));

vi.mock('../../src/KeyMaster', () => ({
  addKey: vi.fn().mockImplementation((dbItem, item, kta) => {
    // Reconstruct key based on kta and item data
    const key: any = { kt: kta[0], pk: item.id || dbItem.id };

    // Add locators if this is a composite key (more than one kt in kta)
    if (kta.length > 1) {
      key.loc = [];
      for (let i = 1; i < kta.length; i++) {
        const locatorKt = kta[i];
        const locatorId = item[`${locatorKt}Id`] || dbItem[`${locatorKt}Id`];
        if (locatorId) {
          key.loc.push({ kt: locatorKt, lk: locatorId });
        }
      }
    }

    return { ...item, key };
  })
}));

type TestItem = import('@fjell/core').Item<'test'>;

describe('remove', () => {
  let mockModel: Mocked<ModelStatic<any>>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;
  let mockRegistry: Mocked<Library.Registry>;
  let mockBuildRelationshipPath: any;

  beforeEach(async () => {
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
      getAttributes: vi.fn().mockReturnValue({
        id: {},
        testColumn: {},
        deletedAt: {},
        createdAt: {},
        updatedAt: {},
        isDeleted: {},
        orderId: {}
      }),
    } as any;

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    definitionMock = {
      coordinate: {
        kta: ['test'],
        scopes: []
      },
      options: {}
    } as any;

    // Mock buildRelationshipPath
    const { buildRelationshipPath } = await import('../../src/util/relationshipUtils');
    mockBuildRelationshipPath = vi.mocked(buildRelationshipPath);
    mockBuildRelationshipPath.mockReturnValue({
      found: true,
      path: null,
      includes: null
    });
  });

  it('should soft delete item with PriKey when deletedAt exists', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

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
      constructor: mockModel,
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
      },
      options: {}
    } as any;

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

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
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    definitionMock.options = {
      ...definitionMock.options,
      deleteOnRemove: true,
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

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
      ...definitionMock.options,
      deleteOnRemove: false,
    };

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      constructor: mockModel,
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
      getRemoveOperation([mockModel], definitionMock, mockRegistry)(key)
    ).rejects.toThrow('No deletedAt or isDeleted attribute found in model, and deleteOnRemove is not set');
  });

  it('should throw error for invalid key', async () => {
    const invalidKey = { kt: 'test' } as any;

    await expect(
      getRemoveOperation([mockModel], definitionMock, mockRegistry)(invalidKey)
    ).rejects.toThrow('Key for Remove is not a valid ItemKey');
  });

  // NEW TEST CASES FOR IMPROVED COVERAGE

  it('should throw error when item not found with PriKey', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(null);

    await expect(
      getRemoveOperation([mockModel], definitionMock, mockRegistry)(key)
    ).rejects.toThrow(/Item not found for key - test:123 - .* - remove/);
  });

  it('should throw error when item not found with ComKey', async () => {
    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const definitionMock: Mocked<Definition<Item<'test', 'order'>, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      },
      options: {}
    } as any;

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(null);

    await expect(
      getRemoveOperation([mockModel], definitionMock, mockRegistry)(key)
    ).rejects.toThrow(/Item not found for key - test:123:order:456 - .* - remove/);
  });

  it('should throw error when composite key locator cannot be resolved', async () => {
    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'invalidRelation', lk: '456' }]
    } as ComKey<'test', 'invalidRelation'>;

    const definitionMock: Mocked<Definition<Item<'test', 'invalidRelation'>, 'test', 'invalidRelation'>> = {
      coordinate: {
        kta: ['test', 'invalidRelation'],
        scopes: []
      },
      options: {}
    } as any;

    // Mock buildRelationshipPath to return not found
    mockBuildRelationshipPath.mockReturnValue({
      found: false,
      path: null,
      includes: null
    });

    await expect(
      getRemoveOperation([mockModel], definitionMock, mockRegistry)(key)
    ).rejects.toThrow('Composite key locator \'invalidRelation\' cannot be resolved on model \'TestModel\' or through its relationships.');
  });

  it('should handle composite key with relationship path and includes', async () => {
    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;

    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    const definitionMock: Mocked<Definition<Item<'test', 'order'>, 'test', 'order'>> = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      },
      options: {}
    } as any;

    // Mock buildRelationshipPath to return relationship path with includes
    mockBuildRelationshipPath.mockReturnValue({
      found: true,
      path: 'order.id',
      includes: [{ model: 'Order', as: 'order' }]
    });

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: {
        id: '123',
        'order.id': '456'
      },
      include: [{ model: 'Order', as: 'order' }]
    });
    expect(result).toBeTruthy();
  });

  it('should handle composite key with multiple locators', async () => {
    const key = {
      kt: 'test', pk: '123',
      loc: [
        { kt: 'order', lk: '456' },
        { kt: 'customer', lk: '789' }
      ]
    } as ComKey<'test', 'order', 'customer'>;

    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        customerId: '789',
        testColumn: 'test'
      }),
      id: '123'
    };

    const definitionMock: Mocked<Definition<Item<'test', 'order', 'customer'>, 'test', 'order', 'customer'>> = {
      coordinate: {
        kta: ['test', 'order', 'customer'],
        scopes: []
      },
      options: {}
    } as any;

    // Mock buildRelationshipPath for multiple calls
    mockBuildRelationshipPath
      .mockReturnValueOnce({
        found: true,
        path: null,
        includes: null
      })
      .mockReturnValueOnce({
        found: true,
        path: null,
        includes: null
      });

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: {
        id: '123',
        orderId: '456',
        customerId: '789'
      }
    });
    expect(result).toBeTruthy();
  });

  it('should soft delete when only isDeleted attribute exists', async () => {
    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {},
      isDeleted: {}
      // No deletedAt
    });

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test',
        isDeleted: true
      }),
      id: '123',
      isDeleted: false
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockItem.isDeleted).toBe(true);
    expect(mockItem.save).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('should soft delete when only deletedAt attribute exists', async () => {
    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: {},
      testColumn: {},
      deletedAt: {}
      // No isDeleted
    });

    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123',
      deletedAt: null
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockItem.deletedAt).toBeInstanceOf(Date);
    expect(mockItem.save).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('should set both isDeleted and deletedAt when both attributes exist', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123',
      isDeleted: false,
      deletedAt: null
    };

    // @ts-ignore
    mockModel.findByPk = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockItem.isDeleted).toBe(true);
    expect(mockItem.deletedAt).toBeInstanceOf(Date);
    expect(mockItem.save).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('should handle composite key with mixed relationship paths and direct fields', async () => {
    const key = {
      kt: 'test', pk: '123',
      loc: [
        { kt: 'order', lk: '456' },
        { kt: 'customer', lk: '789' }
      ]
    } as ComKey<'test', 'order', 'customer'>;

    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        customerId: '789',
        testColumn: 'test'
      }),
      id: '123'
    };

    const definitionMock: Mocked<Definition<Item<'test', 'order', 'customer'>, 'test', 'order', 'customer'>> = {
      coordinate: {
        kta: ['test', 'order', 'customer'],
        scopes: []
      },
      options: {}
    } as any;

    // Mock buildRelationshipPath for different scenarios
    mockBuildRelationshipPath
      .mockReturnValueOnce({
        found: true,
        path: 'order.id',
        includes: [{ model: 'Order', as: 'order' }]
      })
      .mockReturnValueOnce({
        found: true,
        path: null,
        includes: null
      });

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: {
        id: '123',
        'order.id': '456',
        customerId: '789'
      },
      include: [{ model: 'Order', as: 'order' }]
    });
    expect(result).toBeTruthy();
  });

  it('should handle composite key with multiple includes', async () => {
    const key = {
      kt: 'test', pk: '123',
      loc: [
        { kt: 'order', lk: '456' },
        { kt: 'customer', lk: '789' }
      ]
    } as ComKey<'test', 'order', 'customer'>;

    const mockItem = {
      save: vi.fn(),
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      }),
      id: '123'
    };

    const definitionMock: Mocked<Definition<Item<'test', 'order', 'customer'>, 'test', 'order', 'customer'>> = {
      coordinate: {
        kta: ['test', 'order', 'customer'],
        scopes: []
      },
      options: {}
    } as any;

    // Mock buildRelationshipPath to return different includes
    mockBuildRelationshipPath
      .mockReturnValueOnce({
        found: true,
        path: 'order.id',
        includes: [{ model: 'Order', as: 'order' }]
      })
      .mockReturnValueOnce({
        found: true,
        path: 'customer.id',
        includes: [{ model: 'Customer', as: 'customer' }]
      });

    // @ts-ignore
    mockModel.findOne = vi.fn().mockResolvedValue(mockItem);

    const result = await getRemoveOperation([mockModel], definitionMock, mockRegistry)(key);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      where: {
        id: '123',
        'order.id': '456',
        'customer.id': '789'
      },
      include: [
        { model: 'Order', as: 'order' },
        { model: 'Customer', as: 'customer' }
      ]
    });
    expect(result).toBeTruthy();
  });

});
