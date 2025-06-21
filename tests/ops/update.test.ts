import { Definition } from '@/Definition';
import { getUpdateOperation } from '@/ops/update';
import { ComKey, Item, PriKey } from '@fjell/core';
import { NotFoundError } from '@fjell/lib';
import { DataTypes, ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";

type TestItem = import('@fjell/core').Item<'test'>;

describe('update', () => {
  let mockModel: Mocked<ModelStatic<any>>;
  let mockItem: Mocked<TestItem>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;
  let mockRegistry: Mocked<Library.Registry>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      get: vi.fn(),
      libTree: vi.fn(),
      register: vi.fn(),
    } as unknown as Mocked<Library.Registry>;

    mockItem = {
      key: { kt: 'test', pk: '1' },
      events: {
        // @ts-ignore
        created: { at: new Date() },
        // @ts-ignore
        updated: { at: new Date() },
        // @ts-ignore
        deleted: { at: null },
      },
      name: 'Test Item',
      status: 'active'
    };

    mockModel = {
      name: 'TestModel',
      findByPk: vi.fn(),
      findOne: vi.fn(),
      primaryKeyAttribute: 'id',
      getAttributes: vi.fn().mockReturnValue({
        id: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false }
      })
    } as any;

    definitionMock = {
      coordinate: {
        kta: ['test'],
        scopes: []
      },
      options: {
        references: {},
        aggregations: {}
      }
    } as any;
  });

  describe('with PriKey', () => {
    it('should update item when found', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '1' };
      const updatedProps = { name: 'Updated Name' };

      const mockResponse = {
        ...mockItem,
        constructor: mockModel,
        save: vi.fn(),
        update: vi.fn().mockImplementation((props) => {
          const updatedItem = { ...mockItem, ...props };
          // Return the mock response itself with updated properties
          Object.assign(mockResponse, updatedItem);
          return mockResponse;
        }),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1', name: 'Updated Name', status: 'active' };
          }
          return mockItem;
        })
      };

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(mockResponse);

      const result = await getUpdateOperation([mockModel], definitionMock, mockRegistry)(key, updatedProps);

      expect(mockModel.findByPk).toHaveBeenCalledWith('1');
      expect(mockResponse.update).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockItem,
        id: '1',
        name: 'Updated Name',
        events: {
          created: { at: null },
          updated: { at: null },
          deleted: { at: null }
        }
      });
    });

    it('should throw NotFoundError when item not found', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '999' };
      const updatedProps = { name: 'Updated Name' };

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(null);

      await expect(
        getUpdateOperation([mockModel], definitionMock, mockRegistry)(
          key,
          updatedProps,
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('with ComKey', () => {
    it('should update item when found', async () => {
      const key: ComKey<'test', 'location'> = {
        kt: 'test', pk: '1',
        loc: [{ kt: 'location', lk: 'loc1' }]
      };
      const updatedProps = { name: 'Updated Name' };

      const mockResponse = {
        ...mockItem,
        constructor: mockModel,
        save: vi.fn(),
        update: vi.fn().mockImplementation((props) => {
          const updatedItem = { ...mockItem, ...props };
          // Return the mock response itself with updated properties
          Object.assign(mockResponse, updatedItem);
          return mockResponse;
        }),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1', name: 'Updated Name', status: 'active' };
          }
          return mockItem;
        })
      };

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(mockResponse);

      const result = await getUpdateOperation([mockModel], definitionMock, mockRegistry)(
        key,
        updatedProps,
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          locationId: 'loc1',
          id: '1'
        }
      });
      expect(mockResponse.update).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockItem,
        id: '1',
        name: 'Updated Name',
        events: {
          created: { at: null },
          updated: { at: null },
          deleted: { at: null }
        }
      });
    });

    it('should throw NotFoundError when item not found', async () => {
      type TestItem = Item<'test', 'location'>;

      const key: ComKey<'test', 'location'> = {
        kt: 'test', pk: '999',
        loc: [{ kt: 'location', lk: 'loc1' }]
      };
      const updatedProps = { name: 'Updated Name' };

      const definitionMock: Mocked<Definition<TestItem, 'test', 'location'>> = {
        coordinate: {
          kta: ['test', 'location'],
          scopes: []
        },
        options: {
          references: {},
          aggregations: {}
        }
      } as any;

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(null);

      await expect(
        getUpdateOperation(
          [mockModel],
          definitionMock,
          mockRegistry
        )(
          key,
          updatedProps,
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
