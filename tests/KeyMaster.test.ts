import { addKey, removeKey } from '../src/KeyMaster';
import { AllItemTypeArrays, Item } from '@fjell/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { Model, ModelStatic } from 'sequelize';

describe('KeyMaster', () => {
  let itemModel: Model<any, any>;
  let orderModel: Model<any, any>;
  let itemModelStatic: ModelStatic<any>;
  let orderModelStatic: ModelStatic<any>;
  let orderLineModelStatic: ModelStatic<any>;

  const createMockModelStatic = (name: string, attributes: Record<string, any> = {}, associations: Record<string, any> = {}, primaryKey: string = 'id'): ModelStatic<any> => {
    // Add default primary key attribute
    const allAttributes = {
      [primaryKey]: { primaryKey: true, type: 'INTEGER' },
      ...attributes
    };

    return {
      name,
      primaryKeyAttribute: primaryKey,
      getAttributes: () => allAttributes,
      associations
    } as unknown as ModelStatic<any>;
  };

  const createMockModel = (modelStatic: ModelStatic<any>): Model<any, any> => {
    return {
      constructor: modelStatic,
      get: () => {
        // Mock implementation for get method
        return {};
      }
    } as unknown as Model<any, any>;
  };

  const createMockAssociation = (target: ModelStatic<any>) => ({
    target
  });

  beforeEach(() => {
    // Create mock ModelStatic instances first
    itemModelStatic = createMockModelStatic('Item');
    const customerModelStatic = createMockModelStatic('Customer');
    orderLineModelStatic = createMockModelStatic('OrderLine');

    // Order model with foreign key attributes
    orderModelStatic = createMockModelStatic('Order', {
      customerId: { type: 'INTEGER', allowNull: false },
      itemId: { type: 'INTEGER', allowNull: true }
    }, {
      item: createMockAssociation(itemModelStatic),
      customer: createMockAssociation(customerModelStatic),
      orderLine: createMockAssociation(orderLineModelStatic)
    });

    // Create mock Model instances that reference the ModelStatic
    itemModel = createMockModel(itemModelStatic);
    orderModel = createMockModel(orderModelStatic);
  });

  describe('removeKey', () => {
    it('should remove key from item', () => {
      const item = {
        id: '123',
        name: 'test',
        key: { kt: 'test', pk: '123' }
      };
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
      expect(result.id).toBe('123');
      expect(result.name).toBe('test');
    });

    it('should handle item without key gracefully', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
      expect(result.id).toBe('123');
      expect(result.name).toBe('test');
    });

    it('should remove complex key structure', () => {
      const item = {
        id: '123',
        name: 'test',
        key: {
          kt: 'order',
          pk: '123',
          loc: [{ kt: 'customer', lk: '456' }]
        }
      };
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
      expect(result.id).toBe('123');
      expect(result.name).toBe('test');
    });

    it('should return the same item reference after modification', () => {
      const item = {
        id: '123',
        key: { kt: 'test', pk: '123' }
      };
      const result = removeKey(item);
      expect(result).toBe(item);
    });

    it('should handle empty item', () => {
      const item = {};
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
      expect(result).toBe(item);
    });
  });

  describe('addKey', () => {
    it('should add key for single key type', () => {
      const item = {
        id: '123',
        name: 'test'
      } as Partial<Item<'customer'>>;
      const keyTypes = ['customer'] as AllItemTypeArrays<'customer'>;
      const result = addKey(itemModel, item, keyTypes);
      expect(result.key).toEqual({ kt: 'customer', pk: '123' });
      expect(result.id).toBe('123');
      expect(result.name).toBe('test');
    });

    it('should add key for single key type with custom primary key', () => {
      const customPkModelStatic = createMockModelStatic('CustomModel', {}, {}, 'uuid');
      const customPkModel = createMockModel(customPkModelStatic);

      const item = {
        uuid: 'abc-123',
        name: 'test'
      } as Partial<Item<'custom'>>;
      const keyTypes = ['custom'] as AllItemTypeArrays<'custom'>;
      const result = addKey(customPkModel, item, keyTypes);
      expect(result.key).toEqual({ kt: 'custom', pk: 'abc-123' });
    });

    it('should add key for two key types with direct foreign key', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: '456'
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      const result = addKey(orderModel, item, keyTypes);
      expect(result.key).toEqual({
        kt: 'order', pk: '123',
        loc: [{ kt: 'customer', lk: '456' }]
      });
    });

    it('should add key for two key types with loaded relationship object (but use direct foreign key when available)', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: '456', // Direct foreign key takes precedence
        customer: { id: '999', name: 'Customer Name' }
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      const result = addKey(orderModel, item, keyTypes);
      expect(result.key).toEqual({
        kt: 'order', pk: '123',
        loc: [{ kt: 'customer', lk: '456' }] // Uses direct foreign key, not relationship object
      });
    });

    it('should use direct foreign key field when available (not relationship object)', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: '999', // This takes precedence
        customer: { id: '456', name: 'Customer Name' }
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      const result = addKey(orderModel, item, keyTypes);
      expect(result.key).toEqual({
        kt: 'order', pk: '123',
        loc: [{ kt: 'customer', lk: '999' }] // Uses direct foreign key
      });
    });

    it('should handle multiple location keys', () => {
      // Create a more complex model with multiple associations and foreign keys
      const complexModelStatic = createMockModelStatic('ComplexModel', {
        customerId: { type: 'INTEGER', allowNull: false },
        itemId: { type: 'INTEGER', allowNull: false }
      }, {
        customer: createMockAssociation(createMockModelStatic('Customer')),
        item: createMockAssociation(createMockModelStatic('Item'))
      });
      const complexModel = createMockModel(complexModelStatic);

      const item = {
        id: '123',
        customerId: '456',
        itemId: '789'
      } as any;
      const keyTypes = ['complex', 'customer', 'item'] as any;
      const result = addKey(complexModel, item, keyTypes);
      expect(result.key).toEqual({
        kt: 'complex', pk: '123',
        loc: [
          { kt: 'customer', lk: '456' },
          { kt: 'item', lk: '789' }
        ]
      });
    });

    it('should throw error when direct foreign key field is missing', () => {
      const item = {
        id: '123',
        name: 'test'
        // Missing customerId
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Direct foreign key field 'customerId' is missing or null in item");
    });

    it('should throw error when direct foreign key field is null', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: null
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Direct foreign key field 'customerId' is missing or null in item");
    });

    it('should throw error when relationship object has no id (but direct field is checked first)', () => {
      const item = {
        id: '123',
        name: 'test',
        customer: { name: 'Customer Name' } // Missing id
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Direct foreign key field 'customerId' is missing or null in item");
    });

    it('should throw error when neither relationship object nor foreign key is available', () => {
      const item = {
        id: '123',
        name: 'test'
        // No customer object or customerId
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Direct foreign key field 'customerId' is missing or null in item");
    });

    it('should throw error for three key types due to missing association', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes = ['orderLine', 'order', 'customer'] as AllItemTypeArrays<'orderLine', 'order', 'customer'>;
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Location key 'order' cannot be resolved on model 'Order' or through its relationships.");
    });

    it('should throw error for four key types due to missing association', () => {
      const item = {
        id: '123',
        name: 'test'
      };
      const keyTypes =
        ['orderLine', 'order', 'customer', 'org'] as AllItemTypeArrays<'orderLine', 'order', 'customer', 'org'>;
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Location key 'order' cannot be resolved on model 'Order' or through its relationships.");
    });

    it('should throw error for five key types due to missing association', () => {
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
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Location key 'order' cannot be resolved on model 'Order' or through its relationships.");
    });

    it('should throw error for six key types due to missing association', () => {
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
      expect(() => addKey(orderModel, item, keyTypes)).toThrow("Location key 'order' cannot be resolved on model 'Order' or through its relationships.");
    });

    it('should handle items with existing keys by overwriting them', () => {
      const item = {
        id: '123',
        name: 'test',
        key: { kt: 'old', pk: 'old-pk' }
      } as any; // Using 'any' to test overwriting invalid key structure
      const keyTypes = ['customer'] as AllItemTypeArrays<'customer'>;
      const result = addKey(itemModel, item, keyTypes);
      expect(result.key).toEqual({ kt: 'customer', pk: '123' });
    });

    it('should handle zero-value ids', () => {
      const item = {
        id: 0,
        name: 'test'
      } as Partial<Item<'customer'>>;
      const keyTypes = ['customer'] as AllItemTypeArrays<'customer'>;
      const result = addKey(itemModel, item, keyTypes);
      expect(result.key).toEqual({ kt: 'customer', pk: 0 });
    });

    it('should handle string ids', () => {
      const item = {
        id: 'string-id-123',
        name: 'test'
      } as Partial<Item<'customer'>>;
      const keyTypes = ['customer'] as AllItemTypeArrays<'customer'>;
      const result = addKey(itemModel, item, keyTypes);
      expect(result.key).toEqual({ kt: 'customer', pk: 'string-id-123' });
    });

    it('should handle zero-value foreign key ids', () => {
      const item = {
        id: '123',
        name: 'test',
        customerId: 0, // Zero value foreign key
        customer: { id: 999, name: 'Customer Name' }
      } as Partial<Item<'order', 'customer'>>;
      const keyTypes = ['order', 'customer'] as AllItemTypeArrays<'order', 'customer'>;
      const result = addKey(orderModel, item, keyTypes);
      expect(result.key).toEqual({
        kt: 'order', pk: '123',
        loc: [{ kt: 'customer', lk: 0 }] // Uses the zero-value foreign key
      });
    });

    it('should use relationship object when no direct foreign key field exists', () => {
      // Create a model without direct foreign key attributes
      const noFkModelStatic = createMockModelStatic('NoFkModel', {}, {
        customer: createMockAssociation(createMockModelStatic('Customer'))
      });
      const noFkModel = createMockModel(noFkModelStatic);

      const item = {
        id: '123',
        name: 'test',
        customer: { id: '456', name: 'Customer Name' }
      } as any;
      const keyTypes = ['noFk', 'customer'] as any;
      const result = addKey(noFkModel, item, keyTypes);
      expect(result.key).toEqual({
        kt: 'noFk', pk: '123',
        loc: [{ kt: 'customer', lk: '456' }] // Uses relationship object
      });
    });

    it('should throw error when relationship traversal fails', () => {
      // Create a model without direct foreign key attributes
      const noFkModelStatic = createMockModelStatic('NoFkModel', {}, {
        customer: createMockAssociation(createMockModelStatic('Customer'))
      });
      const noFkModel = createMockModel(noFkModelStatic);

      const item = {
        id: '123',
        name: 'test'
        // No customer object or customerId field
      } as any;
      const keyTypes = ['noFk', 'customer'] as any;
      expect(() => addKey(noFkModel, item, keyTypes)).toThrow("Unable to extract location key for 'customer'. Neither the relationship object nor direct foreign key is available.");
    });
  });
});
