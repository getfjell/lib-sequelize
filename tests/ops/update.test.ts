import { Definition } from '../../src/Definition';
import { getUpdateOperation } from '../../src/ops/update';
import { ComKey, Item, PriKey } from '@fjell/core';
import { DataTypes, ModelStatic, Op } from 'sequelize';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import * as Library from "@fjell/lib";

// Mock all dependencies
vi.mock('../../src/util/relationshipUtils');
vi.mock('../../src/KeyMaster');
vi.mock('../../src/EventCoordinator');
vi.mock('../../src/RowProcessor');
vi.mock('../../src/util/general');
vi.mock('@fjell/validation', async () => {
  const actual = await vi.importActual('@fjell/validation');
  return {
    ...actual,
    validateKeys: vi.fn()
  };
});

vi.mock('@fjell/core', async () => {
  const actual = await vi.importActual('@fjell/core');
  return {
    ...actual,
    abbrevIK: vi.fn()
  };
});

import { buildRelationshipPath } from '../../src/util/relationshipUtils';
import { removeKey } from '../../src/KeyMaster';
import { extractEvents, removeEvents } from '../../src/EventCoordinator';
import { processRow } from '../../src/RowProcessor';
import { stringifyJSON } from '../../src/util/general';
import { abbrevIK } from '@fjell/core';
import { validateKeys } from '@fjell/validation';

type TestItem = import('@fjell/core').Item<'test'>;

describe('update', () => {
  let mockModel: Mocked<ModelStatic<any>>;
  let mockItem: Mocked<TestItem>;
  let definitionMock: Mocked<Definition<TestItem, 'test'>>;
  let mockRegistry: Mocked<Library.Registry>;

  // Mocked functions
  const mockBuildRelationshipPath = buildRelationshipPath as any;
  const mockRemoveKey = removeKey as any;
  const mockExtractEvents = extractEvents as any;
  const mockRemoveEvents = removeEvents as any;
  const mockProcessRow = processRow as any;
  const mockStringifyJSON = stringifyJSON as any;
  const mockValidateKeys = validateKeys as any;
  const mockAbbrevIK = abbrevIK as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    mockAbbrevIK.mockReturnValue('test:1');
    mockStringifyJSON.mockImplementation((obj: any) => JSON.stringify(obj));
    mockRemoveKey.mockImplementation((item: any) => ({ ...item }));
    mockExtractEvents.mockImplementation((item: any) => ({ ...item }));
    mockRemoveEvents.mockImplementation((item: any) => ({ ...item }));
    mockValidateKeys.mockImplementation((item: any) => item);
    mockProcessRow.mockImplementation(async (response: any) => ({
      ...response.get({ plain: true }),
      key: { kt: 'test', pk: response.id }
    }));

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

      await getUpdateOperation([mockModel], definitionMock, mockRegistry)(key, updatedProps);

      expect(mockModel.findByPk).toHaveBeenCalledWith('1');
      expect(mockResponse.update).toHaveBeenCalled();
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
      ).rejects.toThrow('Cannot update: test not found');
    });

    it('should process transformation pipeline correctly', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '1' };
      const updatedProps = { name: 'Updated Name', key: { kt: 'test', pk: '1' } } as any;

      const transformedProps = { name: 'Updated Name' };
      mockRemoveKey.mockReturnValue(transformedProps);
      mockExtractEvents.mockReturnValue(transformedProps);
      mockRemoveEvents.mockReturnValue(transformedProps);

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1', name: 'Updated Name' };
          }
          return { id: '1', name: 'Updated Name' };
        })
      };

      const finalResult = { key: { kt: 'test', pk: '1' }, name: 'Updated Name' };
      mockProcessRow.mockResolvedValue(finalResult);
      mockValidateKeys.mockReturnValue(finalResult);

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(mockResponse);

      const result = await getUpdateOperation([mockModel], definitionMock, mockRegistry)(key, updatedProps);

      expect(mockRemoveKey).toHaveBeenCalledWith(updatedProps);
      expect(mockExtractEvents).toHaveBeenCalledWith(transformedProps);
      expect(mockRemoveEvents).toHaveBeenCalledWith(transformedProps);
      expect(mockProcessRow).toHaveBeenCalled();
      expect(mockValidateKeys).toHaveBeenCalled();
      expect(result).toEqual(finalResult);
    });
  });

  describe('with ComKey', () => {
    it('should update item when found with direct foreign key', async () => {
      const key: ComKey<'test', 'location'> = {
        kt: 'test', pk: '1',
        loc: [{ kt: 'location', lk: 'loc1' }]
      };
      const updatedProps = { name: 'Updated Name' };

      // Create a composite definition for this test
      const compositeDefinition: Definition<Item<'test', 'location'>, 'test', 'location'> = {
        coordinate: {
          kta: ['test', 'location'],
          scopes: []
        },
        options: {
          references: {},
          aggregations: {}
        }
      } as any;

      // Mock buildRelationshipPath to return direct foreign key
      mockBuildRelationshipPath.mockReturnValue({
        found: true,
        isDirect: true
      });

      // Mock model with locationId as a direct foreign key field
      // @ts-ignore
      mockModel.getAttributes = vi.fn().mockReturnValue({
        id: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false },
        locationId: { type: DataTypes.STRING, allowNull: false }
      });

      const mockResponse = {
        ...mockItem,
        constructor: mockModel,
        save: vi.fn(),
        update: vi.fn().mockImplementation((props) => {
          const updatedItem = { ...mockItem, ...props };
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

      await getUpdateOperation([mockModel], compositeDefinition, mockRegistry)(
        key,
        updatedProps,
      );

      expect(mockBuildRelationshipPath).toHaveBeenCalledWith(mockModel, 'location', ['test', 'location'], true);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          locationId: 'loc1',
          id: '1'
        }
      });
      expect(mockResponse.update).toHaveBeenCalled();
    });

    it('should update item with hierarchical relationship', async () => {
      const key: ComKey<'test', 'location'> = {
        kt: 'test', pk: '1',
        loc: [{ kt: 'location', lk: 'loc1' }]
      };
      const updatedProps = { name: 'Updated Name' };

      // Create a composite definition for this test
      const compositeDefinition: Definition<Item<'test', 'location'>, 'test', 'location'> = {
        coordinate: {
          kta: ['test', 'location'],
          scopes: []
        },
        options: {
          references: {},
          aggregations: {}
        }
      } as any;

      // Mock buildRelationshipPath to return hierarchical relationship
      mockBuildRelationshipPath.mockReturnValue({
        found: true,
        isDirect: false,
        path: '$location.id$',
        includes: [{ model: 'LocationModel', as: 'location' }]
      });

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1', name: 'Updated Name' };
          }
          return { id: '1', name: 'Updated Name' };
        })
      };

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(mockResponse);

      await getUpdateOperation([mockModel], compositeDefinition, mockRegistry)(key, updatedProps);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          id: '1',
          '$location.id$': { [Op.eq]: 'loc1' }
        },
        include: [{ model: 'LocationModel', as: 'location' }]
      });
    });

    it('should handle multiple location keys', async () => {
      type MultiLocItem = Item<'test', 'location' | 'category'>;
      const key: ComKey<'test', 'location' | 'category'> = {
        kt: 'test', pk: '1',
        loc: [
          { kt: 'location', lk: 'loc1' },
          { kt: 'category', lk: 'cat1' }
        ]
      } as any;
      const updatedProps = { name: 'Updated Name' };

      const multiLocDefinition: Definition<MultiLocItem, 'test', 'location' | 'category'> = {
        coordinate: {
          kta: ['test', 'location', 'category'],
          scopes: []
        },
        options: {
          references: {},
          aggregations: {}
        }
      } as any;

      // Mock different relationship types for each locator
      mockBuildRelationshipPath
        .mockReturnValueOnce({ found: true, isDirect: true })
        .mockReturnValueOnce({
          found: true,
          isDirect: false,
          path: '$category.id$',
          includes: [{ model: 'CategoryModel', as: 'category' }]
        });

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1', name: 'Updated Name' };
          }
          return { id: '1', name: 'Updated Name' };
        })
      };

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(mockResponse);

      await getUpdateOperation([mockModel], multiLocDefinition, mockRegistry)(key, updatedProps);

      expect(mockBuildRelationshipPath).toHaveBeenCalledTimes(2);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          id: '1',
          locationId: 'loc1',
          '$category.id$': { [Op.eq]: 'cat1' }
        },
        include: [{ model: 'CategoryModel', as: 'category' }]
      });
    });

    it('should throw error when composite key locator cannot be resolved', async () => {
      const key: ComKey<'test', 'location'> = {
        kt: 'test', pk: '1',
        loc: [{ kt: 'location', lk: 'loc1' }]
      };
      const updatedProps = { name: 'Updated Name' };

      // Create a composite definition for this test
      const compositeDefinition: Definition<Item<'test', 'location'>, 'test', 'location'> = {
        coordinate: {
          kta: ['test', 'location'],
          scopes: []
        },
        options: {
          references: {},
          aggregations: {}
        }
      } as any;

      // Mock buildRelationshipPath to return not found
      mockBuildRelationshipPath.mockReturnValue({ found: false });

      await expect(
        getUpdateOperation([mockModel], compositeDefinition, mockRegistry)(key, updatedProps)
      ).rejects.toThrow(`Composite key locator 'location' cannot be resolved on model '${mockModel.name}' or through its relationships.`);

      expect(mockBuildRelationshipPath).toHaveBeenCalledWith(mockModel, 'location', ['test', 'location'], true);
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

      mockBuildRelationshipPath.mockReturnValue({ found: true, isDirect: true });

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
      ).rejects.toThrow('Cannot update: test not found');
    });
  });

  describe('mergeIncludes function', () => {
    it('should merge includes without duplicates', async () => {
      // Since mergeIncludes is not exported, we test it indirectly through the update operation
      const key: ComKey<'test', 'location' | 'category'> = {
        kt: 'test', pk: '1',
        loc: [
          { kt: 'location', lk: 'loc1' },
          { kt: 'category', lk: 'cat1' }
        ]
      } as any;

      // Mock both locators to return includes with overlapping entries
      mockBuildRelationshipPath
        .mockReturnValueOnce({
          found: true,
          isDirect: false,
          path: '$location.id$',
          includes: [
            { model: 'LocationModel', as: 'location' },
            { model: 'SharedModel', as: 'shared' }
          ]
        })
        .mockReturnValueOnce({
          found: true,
          isDirect: false,
          path: '$category.id$',
          includes: [
            { model: 'CategoryModel', as: 'category' },
            { model: 'SharedModel', as: 'shared' } // Duplicate
          ]
        });

      const multiLocDefinition: Definition<any, 'test', 'location' | 'category'> = {
        coordinate: { kta: ['test', 'location', 'category'], scopes: [] },
        options: { references: {}, aggregations: {} }
      } as any;

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1' };
          }
          return { id: '1' };
        })
      };

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(mockResponse);

      await getUpdateOperation([mockModel], multiLocDefinition, mockRegistry)(key, {});

      // Verify that findOne was called with merged includes (no duplicates)
      const callArgs = mockModel.findOne.mock.calls[0]?.[0];
      expect(callArgs?.include).toHaveLength(3); // No duplicates
      expect(callArgs?.include).toContainEqual({ model: 'LocationModel', as: 'location' });
      expect(callArgs?.include).toContainEqual({ model: 'CategoryModel', as: 'category' });
      expect(callArgs?.include).toContainEqual({ model: 'SharedModel', as: 'shared' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty update properties', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '1' };
      const updatedProps = {};

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1' };
          }
          return { id: '1' };
        })
      };

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(mockResponse);

      await getUpdateOperation([mockModel], definitionMock, mockRegistry)(key, updatedProps);

      expect(mockResponse.update).toHaveBeenCalled();
      expect(mockRemoveKey).toHaveBeenCalledWith({});
    });

    it('should handle item with complex nested properties', async () => {
      const key: PriKey<'test'> = { kt: 'test', pk: '1' };
      const complexProps = {
        name: 'Updated Name',
        metadata: { tags: ['tag1', 'tag2'], priority: 'high' },
        settings: { enabled: true, config: { theme: 'dark' } }
      };

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1' };
          }
          return { id: '1' };
        })
      };

      // @ts-ignore
      mockModel.findByPk.mockResolvedValue(mockResponse);

      await getUpdateOperation([mockModel], definitionMock, mockRegistry)(key, complexProps);

      expect(mockRemoveKey).toHaveBeenCalledWith(complexProps);
      expect(mockExtractEvents).toHaveBeenCalled();
      expect(mockRemoveEvents).toHaveBeenCalled();
    });

    it('should handle ComKey with no includes needed', async () => {
      const key: ComKey<'test', 'location'> = {
        kt: 'test', pk: '1',
        loc: [{ kt: 'location', lk: 'loc1' }]
      };

      // Create a composite definition for this test
      const compositeDefinition: Definition<Item<'test', 'location'>, 'test', 'location'> = {
        coordinate: {
          kta: ['test', 'location'],
          scopes: []
        },
        options: {
          references: {},
          aggregations: {}
        }
      } as any;

      // Mock to return direct relationship with no includes
      mockBuildRelationshipPath.mockReturnValue({ found: true, isDirect: true });

      const mockResponse = {
        id: '1',
        update: vi.fn().mockImplementation(() => mockResponse),
        get: vi.fn().mockImplementation((options) => {
          if (options?.plain) {
            return { id: '1' };
          }
          return { id: '1' };
        })
      };

      // @ts-ignore
      mockModel.findOne.mockResolvedValue(mockResponse);

      await getUpdateOperation([mockModel], compositeDefinition, mockRegistry)(key, {});

      const callArgs = mockModel.findOne.mock.calls[0]?.[0];
      expect(callArgs?.include).toBeUndefined();
    });
  });
});
