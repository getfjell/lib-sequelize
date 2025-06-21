import { ModelStatic } from 'sequelize';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRelationshipChain,
  buildRelationshipPath,
  RelationshipChainResult,
  RelationshipPathResult
} from '@/util/relationshipUtils';

// Mock Sequelize models for testing
const createMockModel = (name: string, attributes: Record<string, any> = {}, associations: Record<string, any> = {}): ModelStatic<any> => {
  return {
    name,
    getAttributes: () => attributes,
    associations
  } as unknown as ModelStatic<any>;
};

const createMockAssociation = (target: ModelStatic<any>) => ({
  target
});

describe('relationshipUtils', () => {
  describe('buildRelationshipChain', () => {
    let baseModel: ModelStatic<any>;
    let customerModel: ModelStatic<any>;
    let orderModel: ModelStatic<any>;
    let itemModel: ModelStatic<any>;

    beforeEach(() => {
      // Create mock models
      itemModel = createMockModel('Item');
      orderModel = createMockModel('Order', {}, {
        item: createMockAssociation(itemModel)
      });
      customerModel = createMockModel('Customer', {}, {
        order: createMockAssociation(orderModel)
      });
      baseModel = createMockModel('Base', {}, {
        customer: createMockAssociation(customerModel)
      });
    });

    it('should build relationship chain successfully for valid associations', () => {
      const kta = ['base', 'customer', 'order', 'item'];
      const result: RelationshipChainResult = buildRelationshipChain(baseModel, kta, 0, 2);

      expect(result.success).toBe(true);
      expect(result.path).toBe('$customer.order.orderId$');
      expect(result.includes).toHaveLength(1);
      expect(result.includes![0]).toEqual({
        model: customerModel,
        as: 'customer',
        required: true,
        include: [{
          model: orderModel,
          as: 'order',
          required: true
        }]
      });
    });

    it('should build relationship chain for single level association', () => {
      const kta = ['base', 'customer'];
      const result: RelationshipChainResult = buildRelationshipChain(baseModel, kta, 0, 1);

      expect(result.success).toBe(true);
      expect(result.path).toBe('$customer.customerId$');
      expect(result.includes).toHaveLength(1);
      expect(result.includes![0]).toEqual({
        model: customerModel,
        as: 'customer',
        required: true
      });
    });

    it('should fail when association does not exist', () => {
      const kta = ['base', 'nonexistent'];
      const result: RelationshipChainResult = buildRelationshipChain(baseModel, kta, 0, 1);

      expect(result.success).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should fail when model has no associations', () => {
      const modelWithoutAssociations = createMockModel('NoAssoc');
      const kta = ['base', 'customer'];
      const result: RelationshipChainResult = buildRelationshipChain(modelWithoutAssociations, kta, 0, 1);

      expect(result.success).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should build deep relationship chain', () => {
      const kta = ['base', 'customer', 'order', 'item'];
      const result: RelationshipChainResult = buildRelationshipChain(baseModel, kta, 0, 3);

      expect(result.success).toBe(true);
      expect(result.path).toBe('$customer.order.item.itemId$');
      expect(result.includes).toHaveLength(1);

      // Check the nested structure
      const topLevel = result.includes![0];
      expect(topLevel.model).toBe(customerModel);
      expect(topLevel.as).toBe('customer');
      expect(topLevel.required).toBe(true);

      const secondLevel = topLevel.include[0];
      expect(secondLevel.model).toBe(orderModel);
      expect(secondLevel.as).toBe('order');
      expect(secondLevel.required).toBe(true);

      const thirdLevel = secondLevel.include[0];
      expect(thirdLevel.model).toBe(itemModel);
      expect(thirdLevel.as).toBe('item');
      expect(thirdLevel.required).toBe(true);
    });

    it('should handle different currentIndex and targetIndex values', () => {
      const kta = ['base', 'customer', 'order'];
      const result: RelationshipChainResult = buildRelationshipChain(customerModel, kta, 1, 2);

      expect(result.success).toBe(true);
      expect(result.path).toBe('$order.orderId$');
      expect(result.includes).toHaveLength(1);
      expect(result.includes![0]).toEqual({
        model: orderModel,
        as: 'order',
        required: true
      });
    });
  });

  describe('buildRelationshipPath', () => {
    let targetModel: ModelStatic<any>;
    let customerModel: ModelStatic<any>;
    let orderModel: ModelStatic<any>;

    beforeEach(() => {
      orderModel = createMockModel('Order');
      customerModel = createMockModel('Customer', {}, {
        order: createMockAssociation(orderModel)
      });

      targetModel = createMockModel('Target', {
        customerId: { type: 'INTEGER' }, // Direct field exists
        directFieldId: { type: 'INTEGER' }
      }, {
        customer: createMockAssociation(customerModel)
      });
    });

    it('should find direct field and return isDirect: true when includeIsDirect is true', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'customer',
        ['target', 'customer'],
        true
      );

      expect(result.found).toBe(true);
      expect(result.isDirect).toBe(true);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should find direct field and not include isDirect when includeIsDirect is false', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'customer',
        ['target', 'customer'],
        false
      );

      expect(result.found).toBe(true);
      expect(result.isDirect).toBeUndefined();
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should find direct field with default includeIsDirect parameter', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'directField',
        ['target', 'directField']
      );

      expect(result.found).toBe(true);
      expect(result.isDirect).toBeUndefined();
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should find relationship path when direct field does not exist', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'order',
        ['target', 'customer', 'order'],
        true
      );

      expect(result.found).toBe(true);
      expect(result.isDirect).toBe(false);
      expect(result.path).toBe('$customer.order.orderId$');
      expect(result.includes).toHaveLength(1);
      expect(result.includes![0]).toEqual({
        model: customerModel,
        as: 'customer',
        required: true,
        include: [{
          model: orderModel,
          as: 'order',
          required: true
        }]
      });
    });

    it('should return not found when locator type is not in kta array', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'nonexistent',
        ['target', 'customer'],
        true
      );

      expect(result.found).toBe(false);
      expect(result.isDirect).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should return not found when target index is invalid (less than or equal to current)', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'target', // This would be at index 0, which is <= currentIndex (0)
        ['target', 'customer'],
        true
      );

      expect(result.found).toBe(false);
      expect(result.isDirect).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should return not found when relationship chain building fails', () => {
      // Create a model without the required association
      const modelWithoutAssoc = createMockModel('NoAssoc', {});

      const result: RelationshipPathResult = buildRelationshipPath(
        modelWithoutAssoc,
        'customer',
        ['target', 'customer'],
        true
      );

      expect(result.found).toBe(false);
      expect(result.isDirect).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });

    it('should handle single level relationship path', () => {
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'customer',
        ['target', 'customer'],
        false
      );

      // This should find the direct customerId field
      expect(result.found).toBe(true);
      expect(result.isDirect).toBeUndefined();
    });

    it('should prioritize direct field over relationship path', () => {
      // Even if customer exists in associations and kta, direct field takes precedence
      const result: RelationshipPathResult = buildRelationshipPath(
        targetModel,
        'customer',
        ['target', 'customer', 'order'],
        true
      );

      expect(result.found).toBe(true);
      expect(result.isDirect).toBe(true);
      expect(result.path).toBeUndefined();
      expect(result.includes).toBeUndefined();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty kta array', () => {
      const model = createMockModel('Test');
      const result = buildRelationshipPath(model, 'test', [], true);

      expect(result.found).toBe(false);
      expect(result.isDirect).toBe(false);
    });

    it('should handle null/undefined model attributes', () => {
      const modelWithNullAttribs = {
        name: 'Test',
        getAttributes: () => null,
        associations: {}
      } as unknown as ModelStatic<any>;

      const result = buildRelationshipPath(modelWithNullAttribs, 'test', ['base', 'test'], true);
      expect(result.found).toBe(false);
      expect(result.isDirect).toBe(false);
    });

    it('should handle model with null associations', () => {
      const modelWithNullAssoc = createMockModel('Test', {}, null as any);
      const kta = ['base', 'test'];
      const chainResult = buildRelationshipChain(modelWithNullAssoc, kta, 0, 1);

      expect(chainResult.success).toBe(false);
    });
  });
});
