import { addKey, populateKey, removeKey } from '@/KeyMaster';
import { AllItemTypeArrays, Item } from '@fjell/core';

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

describe('KeyMaster', () => {
  describe('removeKey', () => {
    it('should remove key from item', () => {
      const item = {
        id: '123',
        key: { kt: 'test', pk: '123' }
      };
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
    });
  });

  describe('populateKey', () => {
    it('should populate key for single key type', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes = ['customer'] as AllItemTypeArrays<'customer'>;
      const result = populateKey(item, keyTypes);
      expect(result.key).toEqual({ kt: 'customer', pk: '123' });
      expect(result.id).toBeUndefined();
    });

    it('should populate key for two key types', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: '456'
      };
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      const result = populateKey(item, keyTypes);
      expect(result.key).toEqual({
        kt: 'order', pk: '123',
        loc: [{ kt: 'customer', lk: '456' }]
      });
      expect(result.id).toBeUndefined();
      expect(result.customerId).toBeUndefined();
    });

    it('should throw error for more than two key types', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes = ['orderLine', 'order', 'customer'] as AllItemTypeArrays<'orderLine', 'order', 'customer'>;
      expect(() => populateKey(item, keyTypes)).toThrow('Not implemented');
    });
  });

  describe('addKey', () => {
    it('should add key for single key type', () => {
      const item = {
        id: '123',
        name: 'test'
      } as Partial<Item<'customer'>>;
      const keyTypes = ['customer'] as AllItemTypeArrays<'customer'>;
      addKey(item, keyTypes);
      expect(item.key).toEqual({ kt: 'customer', pk: '123' });
    });

    it('should add key for two key types', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: '456'
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      addKey(item, keyTypes);
      expect(item.key).toEqual({
        kt: 'order', pk: '123',
        loc: [{ kt: 'customer', lk: '456' }]
      });
    });

    it('should throw error for two key types', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes = ['orderLine', 'order', 'customer'] as AllItemTypeArrays<'orderLine', 'order', 'customer'>;
      expect(() => addKey(item, keyTypes)).toThrow('Not implemented');
    });

    it('should throw error for three key types', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes =
        ['orderLine', 'order', 'customer', 'org'] as AllItemTypeArrays<'orderLine', 'order', 'customer', 'org'>;
      expect(() => addKey(item, keyTypes)).toThrow('Not implemented');
    });

    it('should throw error for four key types', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes =
        [
          'orderLine',
          'order',
          'customer',
          'org',
          'industry',
        ] as AllItemTypeArrays<'orderLine', 'order', 'customer', 'org', 'industry'>;
      expect(() => addKey(item, keyTypes)).toThrow('Not implemented');
    });

    it('should throw error for five key types', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes =
        [
          'orderLine',
          'order',
          'customer',
          'org',
          'industry',
          'country',
        ] as AllItemTypeArrays<'orderLine', 'order', 'customer', 'org', 'industry', 'country'>;
      expect(() => addKey(item, keyTypes)).toThrow('Not implemented');
    });
  });
});
