/* eslint-disable no-undefined */
import { getFindOperation } from '@/ops/find';
import { Item, LocKeyArray } from '@fjell/core';
import { Definition } from '@fjell/lib';
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

describe('find', () => {
  type TestItem = Item<'test', 'order'>;

  let mockModel: ModelStatic<any>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test', 'order'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    definitionMock = {
      coordinate: {
        kta: ['test', 'order'],
        scopes: []
      }
    } as any;

    mockModel = {
      findAll: jest.fn(),
      getAttributes: jest.fn().mockReturnValue({
        id: {},
        testColumn: {},
        createdAt: {},
        updatedAt: {}
      }),
    } as any;
  });

  it('should call finder method when finder exists', async () => {
    // @ts-ignore
    const mockFinderMethod = jest.fn().mockResolvedValue([{ id: '123', testColumn: 'test' }]);
    definitionMock.options = {
      finders: {
        // @ts-ignore
        testFinder: mockFinderMethod
      }
    };

    const finderParams = { param1: 'value1' };

    const findOperation = getFindOperation([mockModel], definitionMock);

    const result = await findOperation('testFinder', finderParams);

    expect(mockFinderMethod).toHaveBeenCalledWith(finderParams, undefined);
    expect(result).toEqual([{ id: '123', testColumn: 'test' }]);
  });

  it('should throw error when finder does not exist', async () => {
    definitionMock.options = {
      finders: {
        // @ts-ignore
        otherFinder: jest.fn()
      }
    };

    const findOperation = getFindOperation([mockModel], definitionMock);

    await expect(
      findOperation('nonExistentFinder', {})
    ).rejects.toThrow('No finders found');
  });

  it('should throw error when no finders are defined', async () => {
    definitionMock.options = {};

    const findOperation = getFindOperation([mockModel], definitionMock);

    await expect(
      findOperation('nonExistentFinder', {})
    ).rejects.toThrow('No finders found');
  });

  it('should pass finder parameters correctly', async () => {
    // @ts-ignore
    const mockFinderMethod = jest.fn().mockResolvedValue([]);
    definitionMock.options = {
      finders: {
        // @ts-ignore
        testFinder: mockFinderMethod
      }
    };

    const finderParams = {
      stringParam: 'test',
      numberParam: 123,
      booleanParam: true,
      dateParam: new Date(),
      arrayParam: ['value1', 'value2']
    };

    const findOperation = getFindOperation([mockModel], definitionMock);

    await findOperation('testFinder', finderParams);

    expect(mockFinderMethod).toHaveBeenCalledWith(finderParams, undefined);
  });

  it('should handle locations correctly', async () => {
    // @ts-ignore
    const mockFinderMethod = jest.fn().mockResolvedValue([]);
    definitionMock.options = {
      finders: {
        // @ts-ignore
        testFinder: mockFinderMethod
      }
    };

    const finderParams = {};
    const locations = [{ kt: 'order', lk: '456' }] as LocKeyArray<'order'>;

    const findOperation = getFindOperation([mockModel], definitionMock);
    // @ts-ignore
    await findOperation('testFinder', finderParams, locations);

    expect(mockFinderMethod).toHaveBeenCalledWith(finderParams, locations);
  });
});
