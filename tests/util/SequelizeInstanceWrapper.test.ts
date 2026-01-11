import { beforeEach, describe, expect, it } from 'vitest';
import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';
import {
  hasHooksDefined,
  SequelizeWrapperConfig,
  wrapSequelizeInstance,
  wrapSequelizeModel,
  wrapSequelizeModels
} from '../../src/util/SequelizeInstanceWrapper';
import { Options } from '../../src/Options';
import { Item } from '@fjell/types';

// Create a real Sequelize instance for testing
let sequelize: Sequelize;
let TestModel: ModelStatic<Model>;

interface TestItem extends Item<'test'> {
  id: string;
  name: string;
  value: number;
}

beforeEach(async () => {
  sequelize = new Sequelize('sqlite::memory:', {
    logging: false
  });

  TestModel = sequelize.define<Model>('Test', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    name: DataTypes.STRING,
    value: DataTypes.INTEGER
  }, {
    tableName: 'tests',
    timestamps: false
  });

  await sequelize.sync({ force: true });
});

describe('SequelizeInstanceWrapper', () => {
  describe('hasHooksDefined', () => {
    it('should return false when no hooks or validators are defined', () => {
      const options: Options<TestItem, 'test'> = {};
      expect(hasHooksDefined(options)).toBe(false);
    });

    it('should return true when preCreate hook is defined', () => {
      const options: Options<TestItem, 'test'> = {
        hooks: {
          preCreate: async () => ({})
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when postCreate hook is defined', () => {
      const options: Options<TestItem, 'test'> = {
        hooks: {
          postCreate: async () => ({} as TestItem)
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when preUpdate hook is defined', () => {
      const options: Options<TestItem, 'test'> = {
        hooks: {
          preUpdate: async () => ({})
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when postUpdate hook is defined', () => {
      const options: Options<TestItem, 'test'> = {
        hooks: {
          postUpdate: async () => ({} as TestItem)
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when preRemove hook is defined', () => {
      const options: Options<TestItem, 'test'> = {
        hooks: {
          preRemove: async () => ({})
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when postRemove hook is defined', () => {
      const options: Options<TestItem, 'test'> = {
        hooks: {
          postRemove: async () => ({} as TestItem)
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when onCreate validator is defined', () => {
      const options: Options<TestItem, 'test'> = {
        validators: {
          onCreate: async () => true
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when onUpdate validator is defined', () => {
      const options: Options<TestItem, 'test'> = {
        validators: {
          onUpdate: async () => true
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });

    it('should return true when onRemove validator is defined', () => {
      const options: Options<TestItem, 'test'> = {
        validators: {
          onRemove: async () => true
        }
      };
      expect(hasHooksDefined(options)).toBe(true);
    });
  });

  describe('wrapSequelizeInstance', () => {
    describe('with warn-and-throw behavior', () => {
      it('should throw error when save() is called directly', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        await expect(wrapped.save()).rejects.toThrow(/Direct save\(\) call blocked/);
      });

      it('should throw error when update() is called directly', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        await expect(wrapped.update({ name: 'Updated' })).rejects.toThrow(/Direct update\(\) call blocked/);
      });

      it('should throw error when destroy() is called directly', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        await expect(wrapped.destroy()).rejects.toThrow(/Direct destroy\(\) call blocked/);
      });

      it('should include itemType in error message', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'myCustomType',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        try {
          await wrapped.save();
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.message).toContain('myCustomType');
        }
      });
    });

    describe('with warn-only behavior', () => {
      it('should allow save() but log warning', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-only',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);
        
        // Should not throw - the logger will handle the warning
        await expect(wrapped.save()).resolves.toBeDefined();
      });

      it('should allow update() but log warning', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-only',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);
        
        // Should not throw - the logger will handle the warning
        await expect(wrapped.update({ name: 'Updated' })).resolves.toBeDefined();
      });

      it('should allow destroy() but log warning', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-only',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);
        
        // Should not throw - the logger will handle the warning
        await expect(wrapped.destroy()).resolves.toBeDefined();
      });
    });

    describe('when hooks are not defined', () => {
      it('should not wrap instance when hasHooks is false', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: false
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        // Should work normally without throwing
        await wrapped.save();
        expect(wrapped).toBe(instance); // Should be the same instance
      });
    });

    describe('non-Sequelize objects', () => {
      it('should return non-Sequelize objects unchanged', () => {
        const plainObject = { name: 'test' };
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const result = wrapSequelizeInstance(plainObject as any, config);
        expect(result).toBe(plainObject);
      });
    });

    describe('other methods', () => {
      it('should allow access to other methods like get()', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        // get() should work normally
        const data = wrapped.get({ plain: true });
        expect(data).toBeDefined();
        expect(data.id).toBe('1');
      });

      it('should allow access to properties', async () => {
        const instance = await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrapped = wrapSequelizeInstance(instance, config);

        // Properties should be accessible
        expect(wrapped.id).toBe('1');
        expect(wrapped.name).toBe('Test');
      });
    });
  });

  describe('wrapSequelizeModel', () => {
    describe('with hooks defined', () => {
      it('should wrap instances returned from findOne', async () => {
        await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instance = await wrappedModel.findOne({ where: { id: '1' } });

        expect(instance).toBeDefined();
        await expect(instance!.save()).rejects.toThrow(/Direct save\(\) call blocked/);
      });

      it('should wrap instances returned from findByPk', async () => {
        await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instance = await wrappedModel.findByPk('1');

        expect(instance).toBeDefined();
        await expect(instance!.save()).rejects.toThrow(/Direct save\(\) call blocked/);
      });

      it('should wrap instances returned from create', async () => {
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instance = await wrappedModel.create({ id: '1', name: 'Test', value: 10 });

        await expect(instance.save()).rejects.toThrow(/Direct save\(\) call blocked/);
      });

      it('should wrap instances returned from build', async () => {
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instance = wrappedModel.build({ id: '1', name: 'Test', value: 10 });

        await expect(instance.save()).rejects.toThrow(/Direct save\(\) call blocked/);
      });

      it('should wrap all instances returned from findAll', async () => {
        await TestModel.create({ id: '1', name: 'Test1', value: 10 });
        await TestModel.create({ id: '2', name: 'Test2', value: 20 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instances = await wrappedModel.findAll();

        expect(instances).toHaveLength(2);
        expect(instances[0]).toBeDefined();
        expect(instances[1]).toBeDefined();
        await expect(instances[0]!.save()).rejects.toThrow(/Direct save\(\) call blocked/);
        await expect(instances[1]!.save()).rejects.toThrow(/Direct save\(\) call blocked/);
      });

      it('should handle null results from findOne', async () => {
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instance = await wrappedModel.findOne({ where: { id: 'nonexistent' } });

        expect(instance).toBeNull();
      });
    });

    describe('when hooks are not defined', () => {
      it('should not wrap model when hasHooks is false', async () => {
        await TestModel.create({ id: '1', name: 'Test', value: 10 });
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: false
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);
        const instance = await wrappedModel.findOne({ where: { id: '1' } });

        expect(instance).toBeDefined();
        // Should work normally without throwing
        await instance!.save();
      });
    });

    describe('other model methods', () => {
      it('should allow access to other model methods', async () => {
        const config: SequelizeWrapperConfig = {
          directSaveBehavior: 'warn-and-throw',
          itemType: 'test',
          hasHooks: true
        };

        const wrappedModel = wrapSequelizeModel(TestModel, config);

        // Other methods should work
        expect(wrappedModel.name).toBe('Test');
        expect(wrappedModel.getAttributes).toBeDefined();
      });
    });
  });

  describe('wrapSequelizeModels', () => {
    it('should wrap multiple models', async () => {
      const AnotherModel = sequelize.define<Model>('Another', {
        id: {
          type: DataTypes.STRING,
          primaryKey: true
        },
        name: DataTypes.STRING
      }, {
        tableName: 'anothers',
        timestamps: false
      });

      await sequelize.sync({ force: true });

      const config: SequelizeWrapperConfig = {
        directSaveBehavior: 'warn-and-throw',
        itemType: 'test',
        hasHooks: true
      };

      const wrappedModels = wrapSequelizeModels([TestModel, AnotherModel], config);

      expect(wrappedModels).toHaveLength(2);

      const instance1 = await wrappedModels[0].create({ id: '1', name: 'Test', value: 10 });
      expect(instance1).toBeDefined();
      await expect(instance1.save()).rejects.toThrow(/Direct save\(\) call blocked/);

      const instance2 = await wrappedModels[1].create({ id: '1', name: 'Another' });
      expect(instance2).toBeDefined();
      await expect(instance2.save()).rejects.toThrow(/Direct save\(\) call blocked/);
    });
  });
});

