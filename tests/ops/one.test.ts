import { getOneOperation } from '@/ops/one';
import { IQFactory, Item, ItemQuery, LocKeyArray } from '@fjell/core';
import { DataTypes, ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { Definition } from '@/Definition';
import * as Library from "@fjell/lib";

type TestItem = import('@fjell/core').Item<'test'>;

describe('one', () => {
  let mockModel: Mocked<ModelStatic<any>>;
  let mockItems: Mocked<TestItem>[];
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;
  let mockRegistry: Mocked<Library.Registry>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockModel = {
      name: 'TestModel',
      // @ts-ignore
      findAll: vi.fn(),
      primaryKeyAttribute: 'id',
      getAttributes: vi.fn().mockReturnValue({
        id: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false },
      }),
    } as any as Mocked<ModelStatic<any>>;

    // @ts-ignore
    mockItems = [
      {
        key: { kt: 'test', pk: '1' },
        events: {
          created: { at: new Date() },
          updated: { at: new Date() },
          deleted: { at: null },
        },
        name: 'Item 1',
        constructor: mockModel,
        get: vi.fn().mockReturnValue({
          id: '1',
          name: 'Item 1',
          status: 'active'
        })
      },
    ] as Mocked<TestItem>[];

    // @ts-ignore
    mockModel.findAll = vi.fn().mockResolvedValue(mockItems);

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
    } as any as Mocked<Definition<TestItem, 'test'>>;
  });

  it('should return first item when results exist', async () => {
    // @ts-ignore
    mockModel.findAll = vi.fn().mockReturnValue(mockItems as Item<'test'>[]);

    const itemQuery: ItemQuery = IQFactory.condition('status', 'active').limit(1).toQuery();

    const result = await getOneOperation([mockModel], definitionMock, mockRegistry)(
      itemQuery,
      [],
    );

    const expectedResult = {
      id: '1',
      name: 'Item 1',
      status: 'active',
      key: {
        kt: 'test',
        pk: '1',
      },
      events: {
        created: { at: null },
        updated: { at: null },
        deleted: { at: null }
      }
    }

    expect(result).toEqual(expectedResult);
  });

  it('should return null when no results exist', async () => {
    // @ts-ignore
    mockModel.findAll = vi.fn().mockReturnValue([] as Item<'test'>[]);

    const itemQuery: ItemQuery = IQFactory.condition('status', 'inactive').limit(1).toQuery();

    const result = await getOneOperation([mockModel], definitionMock, mockRegistry)(
      itemQuery,
    );

    expect(result).toBeNull();
  });

  it('should pass locations array to all()', async () => {
    type TestItem = Item<'test', 'location1', 'location2'>;

    const itemQuery: ItemQuery = IQFactory.condition('status', 'active').limit(1).toQuery();
    const locations = [
      { kt: 'location1', lk: '1' },
      { kt: 'location2', lk: '2' },
    ] as LocKeyArray<'location1', 'location2'>;

    const definitionMock: Mocked<Definition<TestItem, 'test', 'location1', 'location2'>> = {
      coordinate: {
        kta: ['test', 'location1', 'location2'],
        scopes: []
      },
      options: {
        deleteOnRemove: false,
        references: [],
        dependencies: []
      }
    } as any as Mocked<Definition<TestItem, 'test', 'location1', 'location2'>>;

    // Mock model without the associations needed for location keys
    // @ts-ignore
    mockModel.associations = {};
    // @ts-ignore
    mockModel.getAttributes = vi.fn().mockReturnValue({
      id: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
    });

    await expect(
      getOneOperation([mockModel], definitionMock, mockRegistry)(
        itemQuery,
        locations as any,
      )
    ).rejects.toThrow("Location key 'location1' cannot be resolved on model 'TestModel' or through its relationships.");

  });
});
