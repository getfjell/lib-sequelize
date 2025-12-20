import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item, PriKey } from "@fjell/types";
import { NotFoundError } from "@fjell/core";

// Mock the logger
vi.mock('../src/logger', () => {
  const mockLogger = {
    get: vi.fn().mockReturnThis(),
    debug: vi.fn(),
    error: vi.fn(),
    default: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    trace: vi.fn(),
  };
  return {
    default: mockLogger,
  };
});

interface TestItem extends Item<'test'> {
  id: string;
  name: string;
}

describe('upsert operation', () => {
  let mockGet: any;
  let mockCreate: any;
  let mockUpdate: any;
  let getUpsertOperation: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Import after mocks are set up
    const module = await import('../src/ops/upsert');
    getUpsertOperation = module.getUpsertOperation;
    
    const getModule = await import('../src/ops/get');
    const createModule = await import('../src/ops/create');
    const updateModule = await import('../src/ops/update');
    
    // Mock the operation functions
    mockGet = vi.spyOn(getModule, 'getGetOperation').mockReturnValue(vi.fn());
    mockCreate = vi.spyOn(createModule, 'getCreateOperation').mockReturnValue(vi.fn());
    mockUpdate = vi.spyOn(updateModule, 'getUpdateOperation').mockReturnValue(vi.fn());
  });

  it('should create upsert operation function', () => {
    const upsert = getUpsertOperation(
      [],
      { coordinate: { kta: ['test'], scopes: ['sequelize'] }, options: {} },
      {} as any
    );
    expect(typeof upsert).toBe('function');
  });

  it('should create item when get throws NotFoundError', async () => {
    const key: PriKey<'test'> = { kt: 'test', pk: '1' };
    const itemProps: Partial<TestItem> = { name: 'new item' };
    const createdItem: TestItem = {
      key,
      id: '1',
      name: 'new item'
    } as TestItem;
    const updatedItem: TestItem = {
      key,
      id: '1',
      name: 'new item updated'
    } as TestItem;

    const getMock = vi.fn().mockRejectedValue(new NotFoundError('Not found', 'test', key));
    const createMock = vi.fn().mockResolvedValue(createdItem);
    const updateMock = vi.fn().mockResolvedValue(updatedItem);

    mockGet.mockReturnValue(getMock);
    mockCreate.mockReturnValue(createMock);
    mockUpdate.mockReturnValue(updateMock);

    const upsert = getUpsertOperation(
      [],
      { coordinate: { kta: ['test'], scopes: ['sequelize'] }, options: {} },
      {} as any
    );

    const result = await upsert(key, itemProps);

    expect(getMock).toHaveBeenCalledWith(key);
    expect(createMock).toHaveBeenCalledWith(itemProps, { key });
    expect(updateMock).toHaveBeenCalledWith(key, itemProps, undefined);
    expect(result).toBe(updatedItem);
  });

  it('should update item when get succeeds', async () => {
    const key: PriKey<'test'> = { kt: 'test', pk: '1' };
    const itemProps: Partial<TestItem> = { name: 'updated name' };
    const existingItem: TestItem = {
      key,
      id: '1',
      name: 'existing item'
    } as TestItem;
    const updatedItem: TestItem = {
      key,
      id: '1',
      name: 'updated name'
    } as TestItem;

    const getMock = vi.fn().mockResolvedValue(existingItem);
    const createMock = vi.fn();
    const updateMock = vi.fn().mockResolvedValue(updatedItem);

    mockGet.mockReturnValue(getMock);
    mockCreate.mockReturnValue(createMock);
    mockUpdate.mockReturnValue(updateMock);

    const upsert = getUpsertOperation(
      [],
      { coordinate: { kta: ['test'], scopes: ['sequelize'] }, options: {} },
      {} as any
    );

    const result = await upsert(key, itemProps);

    expect(getMock).toHaveBeenCalledWith(key);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(key, itemProps, undefined);
    expect(result).toBe(updatedItem);
  });

  it('should rethrow non-NotFoundError errors', async () => {
    const key: PriKey<'test'> = { kt: 'test', pk: '1' };
    const itemProps: Partial<TestItem> = { name: 'new item' };

    const getMock = vi.fn().mockRejectedValue(new Error('Database connection failed'));
    const createMock = vi.fn();
    const updateMock = vi.fn();

    mockGet.mockReturnValue(getMock);
    mockCreate.mockReturnValue(createMock);
    mockUpdate.mockReturnValue(updateMock);

    const upsert = getUpsertOperation(
      [],
      { coordinate: { kta: ['test'], scopes: ['sequelize'] }, options: {} },
      {} as any
    );

    await expect(upsert(key, itemProps)).rejects.toThrow('Database connection failed');
    expect(getMock).toHaveBeenCalledWith(key);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
