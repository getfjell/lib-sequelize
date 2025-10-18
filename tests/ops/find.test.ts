import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

// Mock @fjell/lib before other imports
vi.mock('@fjell/lib', async () => {
  const actual = await vi.importActual('@fjell/lib');
  return {
    ...actual,
    contextManager: {
      getCurrentContext: vi.fn().mockReturnValue(undefined),
      withContext: vi.fn().mockImplementation((ctx, fn) => fn())
    },
    createOperationContext: actual.createOperationContext
  };
});

import { getFindOperation } from '../../src/ops/find';
import { Item, LocKeyArray } from '@fjell/core';
import { Definition } from '../../src/Definition';
import { ModelStatic } from 'sequelize';
import * as Library from "@fjell/lib";

type TestItem = Item<'test', 'order'>;

describe('find', () => {
  let mockModel: ModelStatic<any>;
  let mockRegistry: Mocked<Library.Registry>;
  let definitionMock: Mocked<Definition<TestItem, 'test', 'order'>>;

  beforeEach(() => {
    vi.clearAllMocks();
    definitionMock = {
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

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockModel = {
      name: 'TestModel',
      findAll: vi.fn(),
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
        createdAt: {},
        updatedAt: {},
        orderId: {}
      }),
    } as any;
  });

  it('should call finder method when finder exists', async () => {
    // @ts-ignore
    const mockFinderMethod = vi.fn().mockResolvedValue([{ id: '123', testColumn: 'test', orderId: '2324', constructor: mockModel, get: vi.fn().mockReturnThis() }]);
    definitionMock.options = {
      finders: {
        // @ts-ignore
        testFinder: mockFinderMethod
      },
      ...definitionMock.options
    };

    const finderParams = { param1: 'value1' };

    const findOperation = getFindOperation([mockModel], definitionMock, mockRegistry);

    const result = await findOperation('testFinder', finderParams);

    expect(mockFinderMethod).toHaveBeenCalledWith(finderParams, []);
    expect(result).toEqual([expect.objectContaining({
      id: '123',
      testColumn: 'test',
      orderId: '2324',
      key: expect.objectContaining({
        kt: 'test',
        pk: '123',
        loc: expect.arrayContaining([expect.objectContaining({
          kt: 'order',
          lk: '2324'
        })])
      })
    })]);
  });

  it('should throw error when finder does not exist', async () => {
    definitionMock.options = {
      finders: {
        // @ts-ignore
        otherFinder: vi.fn()
      },
      ...definitionMock.options
    };

    const findOperation = getFindOperation([mockModel], definitionMock, mockRegistry);

    await expect(
      findOperation('nonExistentFinder', {})
    ).rejects.toThrow('No finders found');
  });

  it('should throw error when no finders are defined', async () => {
    definitionMock.options = {
      ...definitionMock.options
    };

    const findOperation = getFindOperation([mockModel], definitionMock, mockRegistry);

    await expect(
      findOperation('nonExistentFinder', {})
    ).rejects.toThrow('No finders found');
  });

  it('should pass finder parameters correctly', async () => {
    // @ts-ignore
    const mockFinderMethod = vi.fn().mockResolvedValue([]);
    definitionMock.options = {
      finders: {
        // @ts-ignore
        testFinder: mockFinderMethod
      },
      ...definitionMock.options
    };

    const finderParams = {
      stringParam: 'test',
      numberParam: 123,
      booleanParam: true,
      dateParam: new Date(),
      arrayParam: ['value1', 'value2']
    };

    const findOperation = getFindOperation([mockModel], definitionMock, mockRegistry);

    await findOperation('testFinder', finderParams);

    expect(mockFinderMethod).toHaveBeenCalledWith(finderParams, []);
  });

  it('should handle locations correctly', async () => {
    // @ts-ignore
    const mockFinderMethod = vi.fn().mockResolvedValue([]);
    definitionMock.options = {
      finders: {
        // @ts-ignore
        testFinder: mockFinderMethod
      },
      ...definitionMock.options
    };

    const finderParams = {};
    const locations = [{ kt: 'order', lk: '456' }] as LocKeyArray<'order'>;

    const findOperation = getFindOperation([mockModel], definitionMock, mockRegistry);
    // @ts-ignore
    await findOperation('testFinder', finderParams, locations);

    expect(mockFinderMethod).toHaveBeenCalledWith(finderParams, locations);
  });
});
