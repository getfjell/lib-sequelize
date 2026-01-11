import { Model, ModelStatic } from 'sequelize';
import LibLogger from '../logger';

const logger = LibLogger.get('sequelize', 'instance-wrapper');

export type DirectSaveBehavior = 'warn-and-throw' | 'warn-only';

/**
 * Configuration for Sequelize instance wrapping behavior
 */
export interface SequelizeWrapperConfig {
  /**
   * Behavior when save() or update() is called directly on a Sequelize instance
   * - 'warn-and-throw': Log a warning and throw an error (default)
   * - 'warn-only': Log a warning but allow the operation to proceed
   */
  directSaveBehavior?: DirectSaveBehavior;
  
  /**
   * The item type (kt) for better error messages
   */
  itemType?: string;
  
  /**
   * Whether hooks are defined for this library
   */
  hasHooks?: boolean;
}

/**
 * Checks if an object is a Sequelize Model instance
 */
function isSequelizeModelInstance(obj: any): obj is Model {
  return obj != null &&
    typeof obj === 'object' &&
    typeof obj.save === 'function' &&
    typeof obj.update === 'function' &&
    typeof obj.destroy === 'function' &&
    typeof obj.get === 'function';
}

/**
 * Wraps a Sequelize Model instance to intercept direct save() and update() calls
 * that would bypass Fjell hooks.
 *
 * @param instance - The Sequelize Model instance to wrap
 * @param config - Configuration for wrapper behavior
 * @returns A wrapped instance that intercepts save() and update() calls
 */
export function wrapSequelizeInstance<T extends Model>(
  instance: T,
  config: SequelizeWrapperConfig = {}
): T {
  const {
    directSaveBehavior = 'warn-and-throw',
    itemType = 'unknown',
    hasHooks = true
  } = config;

  // If no hooks are defined, there's no need to wrap
  if (!hasHooks) {
    return instance;
  }

  // If it's not a Sequelize instance, return as-is
  if (!isSequelizeModelInstance(instance)) {
    return instance;
  }

  // Create a proxy that intercepts method calls
  return new Proxy(instance, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);

      // Intercept save() method
      if (prop === 'save' && typeof originalValue === 'function') {
        return function(...args: any[]): any {
          const warningMessage =
            `WARNING: You are calling save() directly on a Sequelize instance ` +
            `for item type "${itemType}" in a Fjell library with hooks defined. ` +
            `This will bypass Fjell hooks (preUpdate, postUpdate, validators, etc.). ` +
            `Use library.operations.update() instead to ensure hooks are executed.`;

          logger.error(warningMessage, {
            itemType,
            operation: 'save',
            hasHooks,
            directSaveBehavior,
            stack: new Error().stack
          });

          if (directSaveBehavior === 'warn-and-throw') {
            const error = new Error(
              `Direct save() call blocked: ${warningMessage} ` +
              `To allow this operation, configure directSaveBehavior: 'warn-only' in library options.`
            );
            return Promise.reject(error);
          }

          // If warn-only, proceed with the original save
          return originalValue.apply(target, args);
        };
      }

      // Intercept update() method
      if (prop === 'update' && typeof originalValue === 'function') {
        return function(...args: any[]): any {
          const warningMessage =
            `WARNING: You are calling update() directly on a Sequelize instance ` +
            `for item type "${itemType}" in a Fjell library with hooks defined. ` +
            `This will bypass Fjell hooks (preUpdate, postUpdate, validators, etc.). ` +
            `Use library.operations.update() instead to ensure hooks are executed.`;

          logger.error(warningMessage, {
            itemType,
            operation: 'update',
            hasHooks,
            directSaveBehavior,
            stack: new Error().stack
          });

          if (directSaveBehavior === 'warn-and-throw') {
            const error = new Error(
              `Direct update() call blocked: ${warningMessage} ` +
              `To allow this operation, configure directSaveBehavior: 'warn-only' in library options.`
            );
            return Promise.reject(error);
          }

          // If warn-only, proceed with the original update
          return originalValue.apply(target, args);
        };
      }

      // Intercept destroy() method (used for removal)
      if (prop === 'destroy' && typeof originalValue === 'function') {
        return function(...args: any[]): any {
          const warningMessage =
            `WARNING: You are calling destroy() directly on a Sequelize instance ` +
            `for item type "${itemType}" in a Fjell library with hooks defined. ` +
            `This will bypass Fjell hooks (preRemove, postRemove, validators, etc.). ` +
            `Use library.operations.remove() instead to ensure hooks are executed.`;

          logger.error(warningMessage, {
            itemType,
            operation: 'destroy',
            hasHooks,
            directSaveBehavior,
            stack: new Error().stack
          });

          if (directSaveBehavior === 'warn-and-throw') {
            const error = new Error(
              `Direct destroy() call blocked: ${warningMessage} ` +
              `To allow this operation, configure directSaveBehavior: 'warn-only' in library options.`
            );
            return Promise.reject(error);
          }

          // If warn-only, proceed with the original destroy
          return originalValue.apply(target, args);
        };
      }

      // For all other properties, return the original value
      return originalValue;
    }
  }) as T;
}

/**
 * Checks if a Sequelize library has hooks defined
 */
export function hasHooksDefined(options: { hooks?: any; validators?: any }): boolean {
  return !!(
    options.hooks?.preCreate ||
    options.hooks?.postCreate ||
    options.hooks?.preUpdate ||
    options.hooks?.postUpdate ||
    options.hooks?.preRemove ||
    options.hooks?.postRemove ||
    options.validators?.onCreate ||
    options.validators?.onUpdate ||
    options.validators?.onRemove
  );
}

/**
 * Wraps a Sequelize ModelStatic class so that queries return wrapped instances.
 * This ensures that when actions/facets query models directly via library.models,
 * they receive wrapped instances that intercept direct save()/update() calls.
 *
 * @param modelClass - The Sequelize ModelStatic class to wrap
 * @param config - Configuration for wrapper behavior
 * @returns A wrapped ModelStatic that returns wrapped instances from queries
 */
export function wrapSequelizeModel<T extends ModelStatic<Model>>(
  modelClass: T,
  config: SequelizeWrapperConfig = {}
): T {
  const {
    hasHooks = true
  } = config;

  // If no hooks are defined, there's no need to wrap
  if (!hasHooks) {
    return modelClass;
  }

  // Create a proxy that intercepts query methods
  return new Proxy(modelClass, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);

      // Wrap methods that return Model instances (these are async and return Promises)
      const instanceReturningMethods = ['findOne', 'findByPk', 'create', 'build'];
      
      if (instanceReturningMethods.includes(prop as string) && typeof originalValue === 'function') {
        return function(...args: any[]): any {
          const result = originalValue.apply(target, args);
          
          // Sequelize query methods return Promises
          if (result && typeof result.then === 'function') {
            return result.then((instance: Model | Model[] | null) => {
              if (instance == null) {
                return instance;
              }
              if (Array.isArray(instance)) {
                return instance.map(inst =>
                  inst ? wrapSequelizeInstance(inst, config) : inst
                );
              }
              // Check if it's a Model instance
              if (isSequelizeModelInstance(instance)) {
                return wrapSequelizeInstance(instance, config);
              }
              return instance;
            }).catch((error: any) => {
              // Re-throw errors unchanged
              throw error;
            });
          }
          
          // For sync methods like build(), wrap immediately if it's a Model instance
          if (isSequelizeModelInstance(result)) {
            return wrapSequelizeInstance(result, config);
          }
          
          return result;
        };
      }

      // Wrap findAll to wrap all returned instances
      if (prop === 'findAll' && typeof originalValue === 'function') {
        return function(...args: any[]): any {
          const result = originalValue.apply(target, args);
          
          if (result && typeof result.then === 'function') {
            return result.then((instances: Model[]) => {
              if (!Array.isArray(instances)) {
                return instances;
              }
              return instances.map(inst =>
                inst ? wrapSequelizeInstance(inst, config) : inst
              );
            }).catch((error: unknown) => {
              // Re-throw errors unchanged
              throw error;
            });
          }
          
          return result;
        };
      }

      // For all other properties, return the original value
      return originalValue;
    }
  }) as T;
}

/**
 * Wraps an array of Sequelize ModelStatic classes
 */
export function wrapSequelizeModels(
  models: ModelStatic<any>[],
  config: SequelizeWrapperConfig = {}
): ModelStatic<any>[] {
  return models.map(model => wrapSequelizeModel(model, config));
}

