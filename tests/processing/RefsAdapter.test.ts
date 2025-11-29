import { describe, expect, it } from 'vitest';
import {
  addRefsToSequelizeItem,
  buildKeyFromForeignKey,
  createRefsProxy,
  ItemReference,
  removeRefsFromSequelizeItem,
  updateForeignKeysFromRefs
} from '../../src/processing/RefsAdapter';
import { SequelizeReferenceDefinition } from '../../src/processing/ReferenceBuilder';

describe('RefsAdapter', () => {
  describe('buildKeyFromForeignKey', () => {
    it('should build PriKey for primary item reference', () => {
      const refDef: SequelizeReferenceDefinition = {
        column: 'authorId',
        kta: ['user'],
        property: 'author'
      };
      const foreignKeyValue = 'user123';
      const item = { authorId: 'user123' };

      const key = buildKeyFromForeignKey(refDef, foreignKeyValue, item);

      expect(key).toEqual({
        kt: 'user',
        pk: 'user123'
      });
      expect('loc' in key).toBe(false);
    });

    it('should build ComKey for composite item reference with location columns', () => {
      const refDef: SequelizeReferenceDefinition = {
        column: 'stepId',
        kta: ['step', 'phase'],
        property: 'step',
        locationColumns: ['phaseId']
      };
      const foreignKeyValue = 'step123';
      const item = { stepId: 'step123', phaseId: 'phase456' };

      const key = buildKeyFromForeignKey(refDef, foreignKeyValue, item);

      expect(key).toEqual({
        kt: 'step',
        pk: 'step123',
        loc: [{ kt: 'phase', lk: 'phase456' }]
      });
    });

    it('should build ComKey with empty loc array when location columns are missing', () => {
      const refDef: SequelizeReferenceDefinition = {
        column: 'stepId',
        kta: ['step', 'phase'],
        property: 'step',
        locationColumns: ['phaseId']
      };
      const foreignKeyValue = 'step123';
      const item = { stepId: 'step123' }; // phaseId missing

      const key = buildKeyFromForeignKey(refDef, foreignKeyValue, item);

      expect(key).toEqual({
        kt: 'step',
        pk: 'step123',
        loc: []
      });
    });

    it('should build ComKey with empty loc array when locationColumns not provided', () => {
      const refDef: SequelizeReferenceDefinition = {
        column: 'stepId',
        kta: ['step', 'phase'],
        property: 'step'
        // locationColumns not provided
      };
      const foreignKeyValue = 'step123';
      const item = { stepId: 'step123' };

      const key = buildKeyFromForeignKey(refDef, foreignKeyValue, item);

      expect(key).toEqual({
        kt: 'step',
        pk: 'step123',
        loc: []
      });
    });
  });

  describe('addRefsToSequelizeItem', () => {
    it('should add refs structure for single reference', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = addRefsToSequelizeItem(item, refDefs);

      expect(result.refs).toBeDefined();
      expect(result.refs.author).toEqual({
        key: { kt: 'user', pk: 'user123' }
      });
      expect(result.authorId).toBe('user123'); // Original property preserved
      expect(result.title).toBe('My Post');
    });

    it('should add refs structure with populated reference', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123',
        author: {
          key: { kt: 'user', pk: 'user123' },
          name: 'John Doe'
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = addRefsToSequelizeItem(item, refDefs);

      expect(result.refs.author).toEqual({
        key: { kt: 'user', pk: 'user123' },
        item: {
          key: { kt: 'user', pk: 'user123' },
          name: 'John Doe'
        }
      });
    });

    it('should handle multiple references', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123',
        categoryId: 'cat456'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        },
        {
          column: 'categoryId',
          kta: ['category'],
          property: 'category'
        }
      ];

      const result = addRefsToSequelizeItem(item, refDefs);

      expect(result.refs.author).toEqual({
        key: { kt: 'user', pk: 'user123' }
      });
      expect(result.refs.category).toEqual({
        key: { kt: 'category', pk: 'cat456' }
      });
    });

    it('should handle null foreign keys', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: null
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = addRefsToSequelizeItem(item, refDefs);

      expect(result.refs.author).toBeDefined();
      expect(result.refs.author.key.kt).toBe('user');
      expect(result.refs.author.key.pk).toBeNull();
    });

    it('should handle composite item references', () => {
      const item: any = {
        key: { kt: 'task', pk: '1' },
        title: 'My Task',
        stepId: 'step123',
        phaseId: 'phase456'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'stepId',
          kta: ['step', 'phase'],
          property: 'step',
          locationColumns: ['phaseId']
        }
      ];

      const result = addRefsToSequelizeItem(item, refDefs);

      expect(result.refs.step).toEqual({
        key: {
          kt: 'step',
          pk: 'step123',
          loc: [{ kt: 'phase', lk: 'phase456' }]
        }
      });
    });

    it('should preserve all original item properties', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        content: 'Post content',
        authorId: 'user123',
        createdAt: new Date()
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = addRefsToSequelizeItem(item, refDefs);

      expect(result.title).toBe('My Post');
      expect(result.content).toBe('Post content');
      expect(result.createdAt).toBe(item.createdAt);
      expect(result.authorId).toBe('user123');
    });
  });

  describe('removeRefsFromSequelizeItem', () => {
    it('should remove refs structure and preserve foreign key columns', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123',
        refs: {
          author: {
            key: { kt: 'user', pk: 'user123' }
          }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result.refs).toBeUndefined();
      expect(result.authorId).toBe('user123');
      expect(result.title).toBe('My Post');
    });

    it('should update foreign key columns from refs structure', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'old123',
        refs: {
          author: {
            key: { kt: 'user', pk: 'new456' }
          }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result.refs).toBeUndefined();
      expect(result.authorId).toBe('new456'); // Updated from refs
    });

    it('should handle composite item references with location columns', () => {
      const item: any = {
        key: { kt: 'task', pk: '1' },
        title: 'My Task',
        stepId: 'old123',
        phaseId: 'old456',
        refs: {
          step: {
            key: {
              kt: 'step',
              pk: 'new123',
              loc: [{ kt: 'phase', lk: 'new456' }]
            }
          }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'stepId',
          kta: ['step', 'phase'],
          property: 'step',
          locationColumns: ['phaseId']
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result.refs).toBeUndefined();
      expect(result.stepId).toBe('new123');
      expect(result.phaseId).toBe('new456');
    });

    it('should handle null refs by setting foreign key to null', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123',
        refs: {
          author: null
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result.refs).toBeUndefined();
      // If refs.author is explicitly null, foreign key should be set to null
      expect(result.authorId).toBeNull();
    });

    it('should preserve foreign key when refs property is missing', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123'
        // refs.author is missing (not null, just not present)
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result.refs).toBeUndefined();
      // If refs.author is missing (not explicitly null), preserve original foreign key
      expect(result.authorId).toBe('user123');
    });

    it('should preserve populated reference properties', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123',
        author: {
          key: { kt: 'user', pk: 'user123' },
          name: 'John Doe'
        },
        refs: {
          author: {
            key: { kt: 'user', pk: 'user123' },
            item: {
              key: { kt: 'user', pk: 'user123' },
              name: 'John Doe'
            }
          }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result.refs).toBeUndefined();
      expect(result.author).toBeDefined();
      expect(result.author.name).toBe('John Doe');
    });

    it('should handle items without refs structure', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const result = removeRefsFromSequelizeItem(item, refDefs);

      expect(result).toEqual(item);
      expect(result.refs).toBeUndefined();
    });
  });

  describe('updateForeignKeysFromRefs', () => {
    it('should update foreign key columns from refs structure', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'old123'
      };
      const refs: Record<string, ItemReference> = {
        author: {
          key: { kt: 'user', pk: 'new456' }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      updateForeignKeysFromRefs(item, refs, refDefs);

      expect(item.authorId).toBe('new456');
    });

    it('should handle composite item references', () => {
      const item: any = {
        key: { kt: 'task', pk: '1' },
        stepId: 'old123',
        phaseId: 'old456'
      };
      const refs: Record<string, ItemReference> = {
        step: {
          key: {
            kt: 'step',
            pk: 'new123',
            loc: [{ kt: 'phase', lk: 'new456' }]
          }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'stepId',
          kta: ['step', 'phase'],
          property: 'step',
          locationColumns: ['phaseId']
        }
      ];

      updateForeignKeysFromRefs(item, refs, refDefs);

      expect(item.stepId).toBe('new123');
      expect(item.phaseId).toBe('new456');
    });

    it('should update populated reference properties', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        authorId: 'user123'
      };
      const refs: Record<string, ItemReference> = {
        author: {
          key: { kt: 'user', pk: 'user123' },
          item: {
            key: { kt: 'user', pk: 'user123' },
            name: 'John Doe'
          }
        }
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      updateForeignKeysFromRefs(item, refs, refDefs);

      expect(item.author).toBeDefined();
      expect(item.author.name).toBe('John Doe');
    });

    it('should handle null refs by setting foreign key to null', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        authorId: 'user123'
      };
      const refs: Record<string, ItemReference> = {
        author: null as any
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      updateForeignKeysFromRefs(item, refs, refDefs);

      expect(item.authorId).toBeNull();
      expect(item.author).toBeUndefined();
    });
  });

  describe('createRefsProxy', () => {
    it('should create a proxy with dynamic refs property', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        authorId: 'user123'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const proxied = createRefsProxy(item, refDefs);

      expect(proxied.refs).toBeDefined();
      expect(proxied.refs.author).toEqual({
        key: { kt: 'user', pk: 'user123' }
      });
      expect(proxied.title).toBe('My Post');
    });

    it('should rebuild refs structure dynamically', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        authorId: 'user123'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const proxied = createRefsProxy(item, refDefs);
      const refs1 = proxied.refs;

      // Modify the foreign key
      item.authorId = 'user456';
      const refs2 = proxied.refs;

      expect(refs1.author.key.pk).toBe('user123');
      expect(refs2.author.key.pk).toBe('user456');
    });

    it('should preserve all original properties', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        content: 'Post content',
        authorId: 'user123'
      };
      const refDefs: SequelizeReferenceDefinition[] = [
        {
          column: 'authorId',
          kta: ['user'],
          property: 'author'
        }
      ];

      const proxied = createRefsProxy(item, refDefs);

      expect(proxied.title).toBe('My Post');
      expect(proxied.content).toBe('Post content');
      expect(proxied.authorId).toBe('user123');
    });
  });
});

