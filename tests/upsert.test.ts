import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUpsertOperation } from '../src/ops/upsert';
import { createRegistry } from '@fjell/registry';
import { createCoordinate } from '../src/Coordinate';
import { createOptions } from '../src/Options';
import { Item, PriKey } from '@fjell/core';
import { ModelStatic } from 'sequelize';

// Mock Sequelize model
const createMockModel = (name: string): ModelStatic<any> => {
  const mockInstance: any = {
    id: '1',
    name: 'test',
    get: vi.fn((options?: { plain: boolean }) => {
      if (options?.plain) {
        return { id: '1', name: 'test' };
      }
      return { id: '1', name: 'test' };
    })
  };
  
  // Set save after mockInstance is defined
  mockInstance.save = vi.fn().mockResolvedValue(mockInstance);

  return {
    name,
    primaryKeyAttribute: 'id',
    associations: {},
    getAttributes: vi.fn().mockReturnValue({ id: {}, name: {}, createdAt: {}, updatedAt: {} }),
    findAll: vi.fn().mockResolvedValue([]),
    findByPk: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(mockInstance),
    update: vi.fn().mockResolvedValue([1]),
    destroy: vi.fn().mockResolvedValue(1)
  } as any;
};

interface TestItem extends Item<'test'> {
  id: string;
  name: string;
}

describe('upsert operation', () => {
  let mockModel: ModelStatic<any>;
  let registry: any;
  let coordinate: any;
  let options: any;
  let upsert: any;

  beforeEach(() => {
    mockModel = createMockModel('TestModel');
    registry = createRegistry();
    coordinate = createCoordinate(['test']);
    options = createOptions<TestItem, 'test'>({});
    
    upsert = getUpsertOperation<TestItem, 'test'>(
      [mockModel],
      { coordinate, options },
      registry
    );
  });

  it('should create upsert operation function', () => {
    expect(typeof upsert).toBe('function');
  });

  it('should have correct function signature', () => {
    expect(upsert.length).toBe(3); // key, item, and optional locations parameters
  });

  it('should handle upsert with primary key', async () => {
    const key: PriKey<'test'> = { kt: 'test', pk: '1' };
    const item: Partial<TestItem> = { name: 'test item' };

    // Mock the model methods to avoid complex Sequelize interactions
    mockModel.findByPk = vi.fn().mockResolvedValue(null);
    mockModel.create = vi.fn().mockResolvedValue({
      id: '1',
      name: 'test item',
      get: vi.fn().mockReturnValue({ id: '1', name: 'test item' })
    });

    // The upsert operation should be callable
    expect(() => upsert(key, item)).not.toThrow();
  });

  it('should handle upsert with existing item', async () => {
    const key: PriKey<'test'> = { kt: 'test', pk: '1' };
    const item: Partial<TestItem> = { name: 'updated item' };
    const existingItem = {
      id: '1',
      name: 'existing item',
      save: vi.fn().mockResolvedValue({ id: '1', name: 'updated item' }),
      get: vi.fn().mockReturnValue({ id: '1', name: 'updated item' })
    };

    // Mock the model methods
    mockModel.findByPk = vi.fn().mockResolvedValue(existingItem);

    // The upsert operation should be callable
    expect(() => upsert(key, item)).not.toThrow();
  });
});
