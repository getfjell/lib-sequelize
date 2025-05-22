import { Definition } from '@/Definition';
import { getUpdateOperation } from '@/ops/update';
import { ComKey, Item, PriKey } from '@fjell/core';
import { NotFoundError } from '@fjell/lib';
import { DataTypes, ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

type TestItem = import('@fjell/core').Item<'test'>;

describe('update', () => {
  let mockModel: Mocked<ModelStatic<any>>;
  let mockItem: Mocked<TestItem>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    vi.clearAllMocks();

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
      findByPk: vi.fn(),
      findOne: vi.fn(),
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
      }
    } as any;
  });

  describe('with PriKey', () => {
    it('should update item when found', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '1' };
      const updatedProps = { name: 'Updated Name' };

      const mockResponse = {
        ...mockItem,
        save: vi.fn(),
        get: vi.fn().mockReturnValue({ ...mockItem, name: 'Updated Name' })
      };

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(mockResponse);

      const result = await getUpdateOperation([mockModel], definitionMock)(key, updatedProps);

      expect(mockModel.findByPk).toHaveBeenCalledWith('1');
      expect(mockResponse.save).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Name');
    });

    it('should throw NotFoundError when item not found', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '999' };
      const updatedProps = { name: 'Updated Name' };

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(null);

      await expect(
        getUpdateOperation([mockModel], definitionMock)(
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
        save: vi.fn(),
        get: vi.fn().mockReturnValue({ ...mockItem, name: 'Updated Name' })
      };

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(mockResponse);

      const result = await getUpdateOperation([mockModel], definitionMock)(
        key,
        updatedProps,
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          locationId: 'loc1',
          id: '1'
        }
      });
      expect(mockResponse.save).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Name');
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
        }
      } as any;

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(null);

      await expect(
        getUpdateOperation(
          [mockModel],
          definitionMock,
        )(
          key,
          updatedProps,
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
