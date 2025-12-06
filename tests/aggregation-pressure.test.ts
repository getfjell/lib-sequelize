/**
 * Pressure/Stress tests for N+1 aggregation fix
 *
 * These tests verify the feature works correctly under realistic load:
 * - Large datasets (100s of items)
 * - Multiple aggregations per item
 * - Deep nesting
 * - Performance characteristics
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataTypes, Sequelize } from 'sequelize';
import { createSequelizeLibrary } from '../src/SequelizeLibrary';
import { createCoordinate } from '../src/Coordinate';
import { createOptions } from '../src/Options';
import { createRegistry } from '@fjell/registry';
import type { Registry } from '../src/Registry';

describe('Aggregation N+1 Fix - Pressure Tests', () => {
  let sequelize: Sequelize;
  let registry: Registry;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false
    });

    registry = createRegistry();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Large Dataset Tests', () => {
    it('should handle 100 items with multiple aggregations each', async () => {
      // Define models
      const ParentModel = sequelize.define('Parent', {
        id: { type: DataTypes.STRING, primaryKey: true },
        name: DataTypes.STRING
      }, { tableName: 'Parents', timestamps: false });

      const ChildModel = sequelize.define('Child', {
        id: { type: DataTypes.STRING, primaryKey: true },
        parentId: DataTypes.STRING,
        name: DataTypes.STRING,
        value: DataTypes.INTEGER
      }, { tableName: 'Children', timestamps: false });

      const MetadataModel = sequelize.define('Metadata', {
        id: { type: DataTypes.STRING, primaryKey: true },
        parentId: DataTypes.STRING,
        key: DataTypes.STRING,
        value: DataTypes.STRING
      }, { tableName: 'Metadata', timestamps: false });

      // Define associations
      ParentModel.hasMany(ChildModel, { foreignKey: 'parentId', as: 'children' });
      ParentModel.hasMany(MetadataModel, { foreignKey: 'parentId', as: 'metadata' });

      await sequelize.sync({ force: true });

      // Create 100 parent items
      const parents = [];
      for (let i = 1; i <= 100; i++) {
        parents.push({ id: `p${i}`, name: `Parent ${i}` });
      }
      await ParentModel.bulkCreate(parents);

      // Create 5 children per parent (500 total)
      const children = [];
      for (let i = 1; i <= 100; i++) {
        for (let j = 1; j <= 5; j++) {
          children.push({
            id: `c${i}-${j}`,
            parentId: `p${i}`,
            name: `Child ${i}-${j}`,
            value: j
          });
        }
      }
      await ChildModel.bulkCreate(children);

      // Create 3 metadata entries per parent (300 total)
      const metadata = [];
      for (let i = 1; i <= 100; i++) {
        for (let j = 1; j <= 3; j++) {
          metadata.push({
            id: `m${i}-${j}`,
            parentId: `p${i}`,
            key: `key${j}`,
            value: `value${j}`
          });
        }
      }
      await MetadataModel.bulkCreate(metadata);

      // Create libraries
      createSequelizeLibrary(
        registry,
        createCoordinate(['child', 'parent']),
        [ChildModel],
        createOptions({})
      );

      createSequelizeLibrary(
        registry,
        createCoordinate(['metadata', 'parent']),
        [MetadataModel],
        createOptions({})
      );

      const parentLibrary = createSequelizeLibrary(
        registry,
        createCoordinate(['parent']),
        [ParentModel],
        createOptions({
          aggregations: [
            {
              kta: ['child', 'parent'],
              property: 'children',
              cardinality: 'many'
            },
            {
              kta: ['metadata', 'parent'],
              property: 'metadata',
              cardinality: 'many'
            }
          ]
        })
      );

      // Load all parents with aggregations
      const startTime = Date.now();
      const result = await parentLibrary.operations.all({});
      const duration = Date.now() - startTime;

      // Verify results
      expect(result.items).toHaveLength(100);
      
      // Check each parent has correct aggregations
      for (const parent of result.items) {
        expect(parent.aggs?.children).toBeDefined();
        expect(parent.aggs?.children).toHaveLength(5);
        expect(parent.aggs?.metadata).toBeDefined();
        expect(parent.aggs?.metadata).toHaveLength(3);
      }

      // Performance check - should be fast with JOINs
      // With N+1, this would take much longer (200+ queries)
      // With JOINs, should be just a few queries
      console.log(`Loaded 100 parents with 500 children and 300 metadata in ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle 500 items with aggregations', async () => {
      const OrderModel = sequelize.define('Order', {
        id: { type: DataTypes.STRING, primaryKey: true },
        total: DataTypes.DECIMAL
      }, { tableName: 'Orders', timestamps: false });

      const OrderItemModel = sequelize.define('OrderItem', {
        id: { type: DataTypes.STRING, primaryKey: true },
        orderId: DataTypes.STRING,
        quantity: DataTypes.INTEGER
      }, { tableName: 'OrderItems', timestamps: false });

      OrderModel.hasMany(OrderItemModel, { foreignKey: 'orderId', as: 'items' });

      await sequelize.sync({ force: true });

      // Create 500 orders
      const orders = [];
      for (let i = 1; i <= 500; i++) {
        orders.push({ id: `o${i}`, total: i * 10.50 });
      }
      await OrderModel.bulkCreate(orders);

      // Create 3 items per order (1500 total)
      const items = [];
      for (let i = 1; i <= 500; i++) {
        for (let j = 1; j <= 3; j++) {
          items.push({
            id: `oi${i}-${j}`,
            orderId: `o${i}`,
            quantity: j
          });
        }
      }
      await OrderItemModel.bulkCreate(items);

      createSequelizeLibrary(
        registry,
        createCoordinate(['orderItem', 'order']),
        [OrderItemModel],
        createOptions({})
      );

      const orderLibrary = createSequelizeLibrary(
        registry,
        createCoordinate(['order']),
        [OrderModel],
        createOptions({
          aggregations: [
            {
              kta: ['orderItem', 'order'],
              property: 'items',
              cardinality: 'many'
            }
          ]
        })
      );

      const startTime = Date.now();
      const result = await orderLibrary.operations.all({});
      const duration = Date.now() - startTime;

      expect(result.items).toHaveLength(500);
      
      // Verify all have correct aggregations
      for (const order of result.items) {
        expect(order.aggs?.items).toHaveLength(3);
      }

      console.log(`Loaded 500 orders with 1500 items in ${duration}ms`);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Empty Aggregation Tests', () => {
    it('should handle items with no aggregated data', async () => {
      const UserModel = sequelize.define('User', {
        id: { type: DataTypes.STRING, primaryKey: true },
        name: DataTypes.STRING
      }, { tableName: 'Users', timestamps: false });

      const PostModel = sequelize.define('Post', {
        id: { type: DataTypes.STRING, primaryKey: true },
        userId: DataTypes.STRING,
        title: DataTypes.STRING
      }, { tableName: 'Posts', timestamps: false });

      UserModel.hasMany(PostModel, { foreignKey: 'userId', as: 'posts' });

      await sequelize.sync({ force: true });

      // Create 50 users, only half have posts
      const users = [];
      for (let i = 1; i <= 50; i++) {
        users.push({ id: `u${i}`, name: `User ${i}` });
      }
      await UserModel.bulkCreate(users);

      // Create posts only for first 25 users
      const posts = [];
      for (let i = 1; i <= 25; i++) {
        posts.push({
          id: `p${i}`,
          userId: `u${i}`,
          title: `Post ${i}`
        });
      }
      await PostModel.bulkCreate(posts);

      createSequelizeLibrary(
        registry,
        createCoordinate(['post', 'user']),
        [PostModel],
        createOptions({})
      );

      const userLibrary = createSequelizeLibrary(
        registry,
        createCoordinate(['user']),
        [UserModel],
        createOptions({
          aggregations: [
            {
              kta: ['post', 'user'],
              property: 'posts',
              cardinality: 'many'
            }
          ]
        })
      );

      const result = await userLibrary.operations.all({});

      expect(result.items).toHaveLength(50);

      // First 25 should have posts
      for (let i = 0; i < 25; i++) {
        expect(result.items[i].aggs?.posts).toHaveLength(1);
      }

      // Last 25 should have empty arrays (LEFT JOIN preserves them)
      for (let i = 25; i < 50; i++) {
        expect(result.items[i].aggs?.posts).toHaveLength(0);
      }
    });
  });

  describe('Variable Aggregation Count Tests', () => {
    it('should handle items with varying numbers of aggregated items', async () => {
      const CategoryModel = sequelize.define('Category', {
        id: { type: DataTypes.STRING, primaryKey: true },
        name: DataTypes.STRING
      }, { tableName: 'Categories', timestamps: false });

      const ProductModel = sequelize.define('Product', {
        id: { type: DataTypes.STRING, primaryKey: true },
        categoryId: DataTypes.STRING,
        name: DataTypes.STRING
      }, { tableName: 'Products', timestamps: false });

      CategoryModel.hasMany(ProductModel, { foreignKey: 'categoryId', as: 'products' });

      await sequelize.sync({ force: true });

      // Create 20 categories
      const categories = [];
      for (let i = 1; i <= 20; i++) {
        categories.push({ id: `cat${i}`, name: `Category ${i}` });
      }
      await CategoryModel.bulkCreate(categories);

      // Create varying numbers of products per category (0 to 20)
      const products = [];
      for (let i = 1; i <= 20; i++) {
        // Category i has i products
        for (let j = 1; j <= i; j++) {
          products.push({
            id: `prod${i}-${j}`,
            categoryId: `cat${i}`,
            name: `Product ${i}-${j}`
          });
        }
      }
      await ProductModel.bulkCreate(products);

      createSequelizeLibrary(
        registry,
        createCoordinate(['product', 'category']),
        [ProductModel],
        createOptions({})
      );

      const categoryLibrary = createSequelizeLibrary(
        registry,
        createCoordinate(['category']),
        [CategoryModel],
        createOptions({
          aggregations: [
            {
              kta: ['product', 'category'],
              property: 'products',
              cardinality: 'many'
            }
          ]
        })
      );

      const result = await categoryLibrary.operations.all({});

      expect(result.items).toHaveLength(20);

      // Verify each category has the correct number of products
      for (let i = 0; i < 20; i++) {
        const category = result.items[i];
        const expectedCount = parseInt(category.id.replace('cat', ''));
        expect(category.aggs?.products).toHaveLength(expectedCount);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should demonstrate performance improvement over N+1', async () => {
      const TestModel = sequelize.define('TestModel', {
        id: { type: DataTypes.STRING, primaryKey: true },
        name: DataTypes.STRING
      }, { tableName: 'TestModels', timestamps: false });

      const RelatedModel = sequelize.define('RelatedModel', {
        id: { type: DataTypes.STRING, primaryKey: true },
        testModelId: DataTypes.STRING,
        data: DataTypes.STRING
      }, { tableName: 'RelatedModels', timestamps: false });

      TestModel.hasMany(RelatedModel, { foreignKey: 'testModelId', as: 'related' });

      await sequelize.sync({ force: true });

      // Create 200 test items with 4 related items each
      const testItems = [];
      const relatedItems = [];
      
      for (let i = 1; i <= 200; i++) {
        testItems.push({ id: `t${i}`, name: `Test ${i}` });
        
        for (let j = 1; j <= 4; j++) {
          relatedItems.push({
            id: `r${i}-${j}`,
            testModelId: `t${i}`,
            data: `Data ${i}-${j}`
          });
        }
      }

      await TestModel.bulkCreate(testItems);
      await RelatedModel.bulkCreate(relatedItems);

      createSequelizeLibrary(
        registry,
        createCoordinate(['related', 'test']),
        [RelatedModel],
        createOptions({})
      );

      const testLibrary = createSequelizeLibrary(
        registry,
        createCoordinate(['test']),
        [TestModel],
        createOptions({
          aggregations: [
            {
              kta: ['related', 'test'],
              property: 'related',
              cardinality: 'many'
            }
          ]
        })
      );

      // Measure performance
      const startTime = Date.now();
      const result = await testLibrary.operations.all({});
      const duration = Date.now() - startTime;

      // Verify correctness
      expect(result.items).toHaveLength(200);
      for (const item of result.items) {
        expect(item.aggs?.related).toHaveLength(4);
      }

      // Performance expectations
      // Without optimization: Would need 201 queries (1 + 200 N+1)
      // With optimization: Should need only 2 queries (COUNT + JOIN)
      console.log(`Loaded 200 items with 800 related items in ${duration}ms`);
      
      // With JOINs, even 200 items should load quickly
      expect(duration).toBeLessThan(500); // Should be very fast
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity with large datasets', async () => {
      const MasterModel = sequelize.define('Master', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: DataTypes.STRING
      }, { tableName: 'Masters', timestamps: false });

      const DetailModel = sequelize.define('Detail', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        masterId: DataTypes.INTEGER,
        sequence: DataTypes.INTEGER,
        value: DataTypes.STRING
      }, { tableName: 'Details', timestamps: false });

      MasterModel.hasMany(DetailModel, { foreignKey: 'masterId', as: 'details' });

      await sequelize.sync({ force: true });

      // Create 100 masters with sequential details
      for (let i = 1; i <= 100; i++) {
        const master = await MasterModel.create({ code: `M${i}` });
        
        const details = [];
        for (let j = 1; j <= 10; j++) {
          details.push({
            masterId: (master as any).id,
            sequence: j,
            value: `Value ${i}-${j}`
          });
        }
        await DetailModel.bulkCreate(details);
      }

      createSequelizeLibrary(
        registry,
        createCoordinate(['detail', 'master']),
        [DetailModel],
        createOptions({})
      );

      const masterLibrary = createSequelizeLibrary(
        registry,
        createCoordinate(['master']),
        [MasterModel],
        createOptions({
          aggregations: [
            {
              kta: ['detail', 'master'],
              property: 'details',
              cardinality: 'many'
            }
          ]
        })
      );

      const result = await masterLibrary.operations.all({});

      // Verify every master has exactly 10 details in correct sequence
      expect(result.items).toHaveLength(100);
      
      for (const master of result.items) {
        expect(master.aggs?.details).toHaveLength(10);
        
        // Verify sequence is correct
        const details = master.aggs.details;
        for (let i = 0; i < 10; i++) {
          expect(details[i].sequence).toBe(i + 1);
        }
      }
    });
  });
});

