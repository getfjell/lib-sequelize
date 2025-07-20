import { Definition } from '@/Definition';
import { getCreateOperation } from '@/ops/create';
import { ComKey, cPK, LocKeyArray } from '@fjell/core';
import { ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";
import { buildRelationshipChain, buildRelationshipPath } from '@/util/relationshipUtils';

// Mock the imported modules
vi.mock('@/RowProcessor', () => ({
  processRow: vi.fn().mockImplementation(async (record: any, kta: string[]) => {
    if (!record || typeof record.get !== 'function') {
      // Return a default record if invalid record is passed
      return {
        id: 'mock-id',
        key: { kt: kta[0], pk: 'mock-id' }
      };
    }
    const data = record.get();
    const key = kta.length === 1
      ? { kt: kta[0], pk: data.id }
      : {
        kt: kta[0],
        pk: data.id,
        loc: kta.slice(1).map((kt) => ({ kt, lk: data[`${kt}Id`] || 'mock-id' })).filter(loc => loc.lk)
      };

    return {
      ...data,
      key
    };
  })
}));

vi.mock('@/EventCoordinator', () => ({
  extractEvents: vi.fn((data: any) => ({ ...data })),
  removeEvents: vi.fn((data: any) => ({ ...data }))
}));

vi.mock('@/util/relationshipUtils');

type TestItem = import('@fjell/core').Item<'test'>;
type TestItemOrder = import('@fjell/core').Item<'test', 'order'>;
type TestItemUser = import('@fjell/core').Item<'test', 'user'>;
type TestItemComplex = import('@fjell/core').Item<'test', 'order', 'user'>;

describe('create', () => {
  let mockModel: ModelStatic<any>;
  let mockOrderModel: ModelStatic<any>;
  let mockRegistry: Mocked<Library.Registry>;

  const mockBuildRelationshipPath = vi.mocked(buildRelationshipPath);
  const mockBuildRelationshipChain = vi.mocked(buildRelationshipChain);

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockModel = {
      create: vi.fn(),
      findByPk: vi.fn(),
      findOne: vi.fn(),
      name: 'TestModel',
      primaryKeyAttribute: 'id',
      associations: {},
      getAttributes: vi.fn().mockReturnValue({
        id: {},
        testColumn: {},
        createdAt: {},
        updatedAt: {},
        orderId: {},
        userId: {}
      }),
    } as any;

    mockOrderModel = {
      create: vi.fn(),
      findByPk: vi.fn(),
      findOne: vi.fn(),
      name: 'OrderModel',
      primaryKeyAttribute: 'id',
      associations: {},
      getAttributes: vi.fn().mockReturnValue({
        id: {},
        orderColumn: {},
        createdAt: {},
        updatedAt: {}
      }),
    } as any;

    // Default mock implementations

    mockBuildRelationshipPath.mockImplementation((model: any, keyType: string) => {
      // Return false for invalid key types to trigger proper errors
      if (keyType === 'invalidType' || keyType === 'nonexistent') {
        return { found: false, isDirect: false };
      }
      return { found: true, isDirect: true };
    });

    mockBuildRelationshipChain.mockReturnValue({
      success: true,
      includes: []
    });
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
      constructor: mockModel,
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
      constructor: mockModel,
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
      constructor: mockModel,
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
    ).rejects.toThrow('Location key \'invalidType\' cannot be resolved on model \'TestModel\' or through its relationships.');
  });

  it('should throw error if item attribute does not exist on model', async () => {
    const newItem = {
      invalidColumn: 'test'
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

    await expect(
      getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem)
    ).rejects.toThrow('Invalid attributes for model \'TestModel\': [invalidColumn]');
  });

  it('should handle event extraction and removal', async () => {
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
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem);

    // Events are extracted and removed as part of the operation
  });

  it('should create item with ComKey containing multiple locations', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const key: ComKey<'test', 'order', 'user'> = {
      kt: 'test',
      pk: 'custom-id',
      loc: [
        { kt: 'order', lk: '456' },
        { kt: 'user', lk: '789' }
      ]
    };

    const definitionMock: Mocked<Definition<TestItemComplex, 'test', 'order', 'user'>> = {
      coordinate: {
        kta: ['test', 'order', 'user'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    const mockCreatedItem = {
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: 'custom-id',
        orderId: '456',
        userId: '789',
        testColumn: 'test'
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem, { key });

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      id: 'custom-id',
      testColumn: 'test',
      orderId: '456',
      userId: '789'
    }));
  });

  it('should handle multiple locations with mixed direct and hierarchical relationships', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const locations = [
      { kt: 'order', lk: '456' },
      { kt: 'user', lk: '789' }
    ] as LocKeyArray<'order', 'user'>;

    const definitionMock: Mocked<Definition<TestItemComplex, 'test', 'order', 'user'>> = {
      coordinate: {
        kta: ['test', 'order', 'user'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    // For user locator at index 2 in kta ['test', 'order', 'user'], we need models[2]
    const mockUserModel = {
      findOne: vi.fn().mockResolvedValue({ id: '789' }),
      name: 'UserModel'
    } as any;

    // Mock different relationship types specifically for this test
    mockBuildRelationshipPath.mockImplementation((model: any, keyType: string) => {
      if (keyType === 'order') {
        return { found: true, isDirect: true };  // order is direct
      }
      if (keyType === 'user') {
        return { found: true, isDirect: false }; // user is hierarchical
      }
      return { found: true, isDirect: true };
    });

    mockBuildRelationshipChain.mockReturnValue({
      success: true,
      includes: [{ model: mockOrderModel }]
    });

    const mockCreatedItem = {
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        orderId: '456',
        testColumn: 'test'
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await getCreateOperation([mockModel, mockOrderModel, mockUserModel], definitionMock, mockRegistry)(newItem, { locations });

    expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
      testColumn: 'test',
      orderId: '456'
    }));
    expect(mockUserModel.findOne).toHaveBeenCalledWith({
      where: { id: '789' },
      include: [{ model: mockOrderModel }]
    });
  });

  it('should throw error when hierarchical chain validation fails', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const locations = [{ kt: 'user', lk: '789' }] as LocKeyArray<'user'>;

    const definitionMock: Mocked<Definition<TestItemUser, 'test', 'user'>> = {
      coordinate: {
        kta: ['test', 'user'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    // Create a user model for index 1 in kta ['test', 'user']
    const mockUserModel = {
      findOne: vi.fn().mockResolvedValue(null),
      name: 'UserModel'
    } as any;

    // Override the global mock for this specific test
    mockBuildRelationshipPath.mockImplementation((model: any, keyType: string) => {
      if (keyType === 'user') {
        return { found: true, isDirect: false };
      }
      return { found: true, isDirect: true };
    });

    mockBuildRelationshipChain.mockReturnValue({
      success: true,
      includes: []
    });

    await expect(
      getCreateOperation([mockModel, mockUserModel], definitionMock, mockRegistry)(newItem, { locations })
    ).rejects.toThrow('Referenced user with id 789 does not exist or chain is invalid');
  });

  it('should handle hierarchical chain validation when buildRelationshipChain fails', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const locations = [{ kt: 'user', lk: '789' }] as LocKeyArray<'user'>;

    const definitionMock: Mocked<Definition<TestItemUser, 'test', 'user'>> = {
      coordinate: {
        kta: ['test', 'user'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    // Create a user model for index 1 in kta ['test', 'user']
    const mockUserModel = {
      findByPk: vi.fn().mockResolvedValue({ id: '789' }),
      name: 'UserModel'
    } as any;

    mockBuildRelationshipPath.mockImplementation((model: any, keyType: string) => {
      if (keyType === 'user') {
        return { found: true, isDirect: false };
      }
      return { found: true, isDirect: true };
    });

    mockBuildRelationshipChain.mockReturnValue({
      success: false
    });

    const mockCreatedItem = {
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    // For user locator at index 1 in kta ['test', 'user'], we need models[1]
    await getCreateOperation([mockModel, mockUserModel], definitionMock, mockRegistry)(newItem, { locations });

    expect(mockUserModel.findByPk).toHaveBeenCalledWith('789');
    expect(mockModel.create).toHaveBeenCalled();
  });

  it('should throw error when hierarchical chain validation fails with missing record', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const locations = [{ kt: 'user', lk: '789' }] as LocKeyArray<'user'>;

    const definitionMock: Mocked<Definition<TestItemUser, 'test', 'user'>> = {
      coordinate: {
        kta: ['test', 'user'],
        scopes: []
      },
      options: {
        references: [],
        aggregations: []
      }
    } as any;

    // Create a user model for index 1 in kta ['test', 'user']
    const mockUserModel = {
      findByPk: vi.fn().mockResolvedValue(null),
      name: 'UserModel'
    } as any;

    mockBuildRelationshipPath.mockImplementation((model: any, keyType: string) => {
      if (keyType === 'user') {
        return { found: true, isDirect: false };
      }
      return { found: true, isDirect: true };
    });

    mockBuildRelationshipChain.mockReturnValue({
      success: false
    });

    await expect(
      getCreateOperation([mockModel, mockUserModel], definitionMock, mockRegistry)(newItem, { locations })
    ).rejects.toThrow('Referenced user with id 789 does not exist');
  });

  it('should throw error when locator type not found in kta array', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const locations = [{ kt: 'nonexistent', lk: '789' }] as any;

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

    mockBuildRelationshipPath.mockReturnValue({
      found: true,
      isDirect: false
    });

    await expect(
      getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem, { locations })
    ).rejects.toThrow('Locator type \'nonexistent\' not found in kta array');
  });

  it('should handle multiple models with different locator models', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const locations = [{ kt: 'order', lk: '456' }] as LocKeyArray<'order'>;

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

    // Reset and setup mocks for this specific test
    mockBuildRelationshipPath.mockImplementation((model: any, keyType: string) => {
      if (keyType === 'order') {
        return { found: true, isDirect: false };
      }
      return { found: true, isDirect: true };
    });

    mockBuildRelationshipChain.mockReturnValue({
      success: true,
      includes: []
    });

    // Create a fresh mock for the order model to ensure it's called
    const testOrderModel = {
      findOne: vi.fn().mockResolvedValue({ id: '456' }),
      name: 'OrderModel'
    } as any;

    const mockCreatedItem = {
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await getCreateOperation([mockModel, testOrderModel], definitionMock, mockRegistry)(newItem, { locations });

    expect(testOrderModel.findOne).toHaveBeenCalledWith({
      where: { id: '456' }
    });
  });

  it('should handle ComKey with locations containing invalid relationship', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const key: ComKey<'test', 'invalidType'> = {
      kt: 'test',
      pk: 'custom-id',
      loc: [{ kt: 'invalidType', lk: '456' }]
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

    mockBuildRelationshipPath.mockReturnValue({
      found: false,
      isDirect: false
    });

    await expect(
      getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem, { key })
    ).rejects.toThrow('Composite key locator \'invalidType\' cannot be resolved on model \'TestModel\' or through its relationships.');
  });

  it('should pass references and aggregations to processRow', async () => {
    const newItem = {
      testColumn: 'test'
    };

    const definitionMock: Mocked<Definition<TestItem, 'test'>> = {
      coordinate: {
        kta: ['test'],
        scopes: []
      },
      options: {
        references: [{ type: 'ref1' }],
        aggregations: [{ type: 'agg1' }]
      }
    } as any;

    const mockCreatedItem = {
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem);

    // processRow is called with the created item, kta, references, aggregations, and registry
  });

  it('should validate keys on processed record', async () => {
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
      constructor: mockModel,
      get: vi.fn().mockReturnValue({
        id: '123',
        testColumn: 'test'
      })
    };

    const processedRecord = {
      id: '123',
      testColumn: 'test',
      key: { kt: 'test', pk: '123' }
    };

    mockModel.create = vi.fn().mockResolvedValue(mockCreatedItem);

    const result = await getCreateOperation([mockModel], definitionMock, mockRegistry)(newItem);

    expect(result).toEqual(processedRecord);
  });
});
