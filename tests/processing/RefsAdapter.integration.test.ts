import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { Item, PriKey } from '@fjell/core';
import { DataTypes, ModelStatic } from 'sequelize';
import * as Library from '@fjell/lib';

// Mock @fjell/lib before other imports
vi.mock('@fjell/lib', async () => {
  const actual = await vi.importActual('@fjell/lib');
  return {
    ...actual,
    contextManager: {
      getCurrentContext: vi.fn().mockReturnValue(undefined),
      withContext: vi.fn().mockImplementation((ctx, fn) => fn())
    },
    createOperationContext: actual.createOperationContext,
    buildAggregation: vi.fn().mockImplementation(async (item) => item)
  };
});

import { getGetOperation } from '../../src/ops/get';
import { getCreateOperation } from '../../src/ops/create';
import { getUpdateOperation } from '../../src/ops/update';
import { getRemoveOperation } from '../../src/ops/remove';
import { getAllOperation } from '../../src/ops/all';
import { Definition } from '../../src/Definition';
import { SequelizeReferenceDefinition } from '../../src/processing/ReferenceBuilder';

type PostItem = Item<'post'> & {
  title: string;
  authorId?: string | null;
  author?: UserItem | null;
  refs?: {
    author?: {
      key: PriKey<'user'>;
      item?: UserItem;
    };
  };
};

type UserItem = Item<'user'> & {
  name: string;
};

describe('RefsAdapter Integration', () => {
  let mockPostModel: ModelStatic<any>;
  let mockRegistry: Mocked<Library.Registry>;
  let definitionMock: Definition<PostItem, 'post'>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPostModel = {
      name: 'PostModel',
      findByPk: vi.fn(),
      findOne: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      associations: {},
      primaryKeyAttribute: 'id',
      getAttributes: vi.fn().mockReturnValue({
        id: { type: DataTypes.STRING },
        title: { type: DataTypes.STRING },
        authorId: { type: DataTypes.STRING },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE },
        deletedAt: { type: DataTypes.DATE }
      })
    } as any;

    mockRegistry = {
      get: vi.fn().mockImplementation((kta: string[]) => {
        if (kta[0] === 'user') {
          return {
            operations: {
              get: vi.fn().mockResolvedValue({
                key: { kt: 'user', pk: 'user123' },
                name: 'John Doe'
              } as UserItem)
            }
          };
        }
        return null;
      }),
      libTree: vi.fn(),
      register: vi.fn()
    } as unknown as Mocked<Library.Registry>;

    const references: SequelizeReferenceDefinition[] = [
      {
        column: 'authorId',
        kta: ['user'],
        property: 'author'
      }
    ];

    definitionMock = {
      coordinate: {
        kta: ['post'],
        scopes: []
      },
      options: {
        deleteOnRemove: false,
        references,
        dependencies: []
      }
    } as any;
  });

  describe('get operation', () => {
    it('should automatically wrap returned item with refs structure', async () => {
      const mockItem = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123'
        })
      };

      mockPostModel.findByPk = vi.fn().mockResolvedValue(mockItem);

      const getOp = getGetOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await getOp({ kt: 'post', pk: 'post123' });

      expect(result.refs).toBeDefined();
      expect(result.refs?.author).toBeDefined();
      expect(result.refs?.author?.key).toEqual({ kt: 'user', pk: 'user123' });
      expect(result.authorId).toBe('user123'); // Original property preserved
    });

    it('should include populated reference in refs structure', async () => {
      const mockItem = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        author: {
          key: { kt: 'user', pk: 'user123' },
          name: 'John Doe'
        },
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123',
          author: {
            key: { kt: 'user', pk: 'user123' },
            name: 'John Doe'
          }
        })
      };

      mockPostModel.findByPk = vi.fn().mockResolvedValue(mockItem);

      const getOp = getGetOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await getOp({ kt: 'post', pk: 'post123' });

      expect(result.refs?.author?.item).toBeDefined();
      expect(result.refs?.author?.item?.name).toBe('John Doe');
    });

    it('should handle null foreign keys', async () => {
      const mockItem = {
        id: 'post123',
        title: 'My Post',
        authorId: null,
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: null
        })
      };

      mockPostModel.findByPk = vi.fn().mockResolvedValue(mockItem);

      const getOp = getGetOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await getOp({ kt: 'post', pk: 'post123' });

      expect(result.refs?.author).toBeDefined();
      expect(result.refs?.author?.key.pk).toBeNull();
    });
  });

  describe('create operation', () => {
    it('should automatically unwrap refs structure before creating', async () => {
      const itemWithRefs: Partial<PostItem> = {
        title: 'My Post',
        refs: {
          author: {
            key: { kt: 'user', pk: 'user123' }
          }
        }
      };

      const mockCreated = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123'
        })
      };

      mockPostModel.create = vi.fn().mockResolvedValue(mockCreated);

      const createOp = getCreateOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await createOp(itemWithRefs, { key: { kt: 'post', pk: 'post123' } });

      // Verify that create was called with unwrapped data (authorId, not refs)
      const createCall = mockPostModel.create as any;
      expect(createCall).toHaveBeenCalled();
      const createArgs = createCall.mock.calls[0][0];
      expect(createArgs).toMatchObject({
        title: 'My Post',
        authorId: 'user123'
      });
      expect(createArgs.refs).toBeUndefined();

      // Verify result has refs structure
      expect(result.refs).toBeDefined();
      expect(result.refs?.author?.key.pk).toBe('user123');
    });

    it('should handle items without refs structure', async () => {
      const itemWithoutRefs: Partial<PostItem> = {
        title: 'My Post',
        authorId: 'user123'
      };

      const mockCreated = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123'
        })
      };

      mockPostModel.create = vi.fn().mockResolvedValue(mockCreated);

      const createOp = getCreateOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await createOp(itemWithoutRefs, { key: { kt: 'post', pk: 'post123' } });

      const createCall = mockPostModel.create as any;
      expect(createCall).toHaveBeenCalled();
      const createArgs = createCall.mock.calls[0][0];
      expect(createArgs).toMatchObject({
        title: 'My Post',
        authorId: 'user123'
      });
      expect(createArgs.refs).toBeUndefined();

      expect(result.refs).toBeDefined();
    });
  });

  describe('update operation', () => {
    it('should automatically unwrap refs structure before updating', async () => {
      const itemWithRefs: Partial<PostItem> = {
        title: 'Updated Post',
        refs: {
          author: {
            key: { kt: 'user', pk: 'user456' }
          }
        }
      };

      const mockExisting = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        update: vi.fn().mockResolvedValue({
          id: 'post123',
          title: 'Updated Post',
          authorId: 'user456',
          constructor: mockPostModel,
          get: vi.fn().mockReturnValue({
            id: 'post123',
            title: 'Updated Post',
            authorId: 'user456'
          })
        }),
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123'
        })
      };

      mockPostModel.findByPk = vi.fn().mockResolvedValue(mockExisting);

      const updateOp = getUpdateOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await updateOp({ kt: 'post', pk: 'post123' }, itemWithRefs);

      // Verify that update was called with unwrapped data
      const updateCall = mockExisting.update as any;
      expect(updateCall).toHaveBeenCalled();
      const updateArgs = updateCall.mock.calls[0][0];
      expect(updateArgs).toMatchObject({
        title: 'Updated Post',
        authorId: 'user456'
      });
      expect(updateArgs.refs).toBeUndefined();

      // Verify result has refs structure
      expect(result.refs).toBeDefined();
      expect(result.refs?.author?.key.pk).toBe('user456');
    });

    it('should update foreign key from refs structure', async () => {
      const itemWithRefs: Partial<PostItem> = {
        refs: {
          author: {
            key: { kt: 'user', pk: 'newuser789' }
          }
        }
      };

      const mockExisting = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        update: vi.fn().mockResolvedValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'newuser789',
          constructor: mockPostModel,
          get: vi.fn().mockReturnValue({
            id: 'post123',
            title: 'My Post',
            authorId: 'newuser789'
          })
        }),
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123'
        })
      };

      mockPostModel.findByPk = vi.fn().mockResolvedValue(mockExisting);

      const updateOp = getUpdateOperation([mockPostModel], definitionMock, mockRegistry);
      await updateOp({ kt: 'post', pk: 'post123' }, itemWithRefs);

      const updateCall = mockExisting.update as any;
      expect(updateCall).toHaveBeenCalled();
      const updateArgs = updateCall.mock.calls[0][0];
      expect(updateArgs).toMatchObject({
        authorId: 'newuser789'
      });
      expect(updateArgs.refs).toBeUndefined();
    });
  });

  describe('remove operation', () => {
    it('should automatically wrap returned item with refs structure', async () => {
      const mockItem = {
        id: 'post123',
        title: 'My Post',
        authorId: 'user123',
        isDeleted: false,
        deletedAt: null,
        save: vi.fn().mockResolvedValue(undefined),
        constructor: mockPostModel,
        get: vi.fn().mockReturnValue({
          id: 'post123',
          title: 'My Post',
          authorId: 'user123'
        })
      };

      mockPostModel.findByPk = vi.fn().mockResolvedValue(mockItem);
      mockPostModel.getAttributes = vi.fn().mockReturnValue({
        isDeleted: { type: DataTypes.BOOLEAN },
        deletedAt: { type: DataTypes.DATE }
      });

      const removeOp = getRemoveOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await removeOp({ kt: 'post', pk: 'post123' });

      expect(result.refs).toBeDefined();
      expect(result.refs?.author?.key.pk).toBe('user123');
    });
  });

  describe('all operation', () => {
    it('should automatically wrap all returned items with refs structure', async () => {
      const mockItems = [
        {
          id: 'post1',
          title: 'Post 1',
          authorId: 'user123',
          constructor: mockPostModel,
          get: vi.fn().mockReturnValue({
            id: 'post1',
            title: 'Post 1',
            authorId: 'user123'
          })
        },
        {
          id: 'post2',
          title: 'Post 2',
          authorId: 'user456',
          constructor: mockPostModel,
          get: vi.fn().mockReturnValue({
            id: 'post2',
            title: 'Post 2',
            authorId: 'user456'
          })
        }
      ];

      mockPostModel.findAll = vi.fn().mockResolvedValue(mockItems);
      mockPostModel.count = vi.fn().mockResolvedValue(2);

      const allOp = getAllOperation([mockPostModel], definitionMock, mockRegistry);
      const result = await allOp({}, [], {});

      expect(result.items).toHaveLength(2);
      expect(result.items[0].refs).toBeDefined();
      expect(result.items[0].refs?.author?.key.pk).toBe('user123');
      expect(result.items[1].refs).toBeDefined();
      expect(result.items[1].refs?.author?.key.pk).toBe('user456');
    });
  });
});

