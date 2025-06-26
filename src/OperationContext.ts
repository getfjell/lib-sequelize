import { ComKey, Item, PriKey } from "@fjell/core";
import LibLogger from "@/logger";

const logger = LibLogger.get('sequelize', 'OperationContext');

export type ItemKey = PriKey<any> | ComKey<any, any, any, any, any, any>;

export interface OperationContext {
  /**
   * Set of serialized keys that are currently being processed.
   * Used to detect circular dependencies.
   */
  inProgress: Set<string>;

  /**
   * Cache of fully loaded objects keyed by serialized key.
   * Used to avoid duplicate work and provide already-loaded objects.
   * Can store individual items, arrays, or any other values.
   */
  cache: Map<string, any>;

  /**
   * Add a key to the in-progress set
   */
  markInProgress(key: ItemKey): void;

  /**
   * Remove a key from the in-progress set
   */
  markComplete(key: ItemKey): void;

  /**
   * Check if a key is currently being processed (cycle detection)
   */
  isInProgress(key: ItemKey): boolean;

  /**
   * Get a cached object by key
   */
  getCached(key: ItemKey): Item<any, any, any, any, any, any> | undefined;

  /**
   * Cache a loaded object by key
   */
  setCached(key: ItemKey, item: Item<any, any, any, any, any, any>): void;

  /**
   * Check if an object is cached
   */
  isCached(key: ItemKey): boolean;
}

/**
 * Serialize an ItemKey to a string for use in sets and maps
 */
export const serializeKey = (key: ItemKey): string => {
  if ('pk' in key && 'kt' in key && !('loc' in key)) {
    // PriKey
    return `${key.kt}:${key.pk}`;
  } else if ('pk' in key && 'kt' in key && 'loc' in key) {
    // ComKey
    const locStr = key.loc.map(l => `${l.kt}:${l.lk}`).join(',');
    return `${key.kt}:${key.pk}|${locStr}`;
  }
  throw new Error(`Unsupported key type: ${JSON.stringify(key)}`);
};

/**
 * Create a new OperationContext
 */
export const createOperationContext = (): OperationContext => {
  const inProgress = new Set<string>();
  const cache = new Map<string, any>();

  return {
    inProgress,
    cache,

    markInProgress(key: ItemKey): void {
      const serialized = serializeKey(key);
      logger.debug('Marking key as in progress', { key, serialized });
      inProgress.add(serialized);
    },

    markComplete(key: ItemKey): void {
      const serialized = serializeKey(key);
      logger.debug('Marking key as complete', { key, serialized });
      inProgress.delete(serialized);
    },

    isInProgress(key: ItemKey): boolean {
      const serialized = serializeKey(key);
      const result = inProgress.has(serialized);
      logger.debug('Checking if key is in progress', { key, serialized, result });
      return result;
    },

    getCached(key: ItemKey): Item<any, any, any, any, any, any> | undefined {
      const serialized = serializeKey(key);
      const result = cache.get(serialized);
      logger.debug('Getting cached item', { key, serialized, found: !!result });
      return result;
    },

    setCached(key: ItemKey, item: Item<any, any, any, any, any, any>): void {
      const serialized = serializeKey(key);
      logger.debug('Caching item', { key, serialized });
      cache.set(serialized, item);
    },

    isCached(key: ItemKey): boolean {
      const serialized = serializeKey(key);
      const result = cache.has(serialized);
      logger.debug('Checking if key is cached', { key, serialized, result });
      return result;
    }
  };
};

/**
 * Context Manager for sharing context across operations without changing public interfaces
 */
class ContextManager {
  private contexts = new Map<string, OperationContext>();
  private currentContextId: string | null = null;

  /**
   * Set the current context for the current operation chain
   */
  setCurrentContext(context: OperationContext): string {
    const contextId = Math.random().toString(36).substring(7);
    this.contexts.set(contextId, context);
    this.currentContextId = contextId;
    logger.debug('Set current context', { contextId });
    return contextId;
  }

  /**
   * Get the current context if one is set
   */
  getCurrentContext(): OperationContext | undefined {
    if (this.currentContextId) {
      const context = this.contexts.get(this.currentContextId);
      logger.debug('Got current context', { contextId: this.currentContextId, found: !!context });
      return context;
    }
    return;
  }

  /**
   * Clear the current context
   */
  clearCurrentContext(): void {
    if (this.currentContextId) {
      logger.debug('Clearing current context', { contextId: this.currentContextId });
      this.contexts.delete(this.currentContextId);
      this.currentContextId = null;
    }
  }

  /**
   * Execute a function with a specific context set as current
   */
  async withContext<T>(context: OperationContext, fn: () => Promise<T>): Promise<T> {
    const previousContextId = this.currentContextId;
    this.setCurrentContext(context);

    try {
      return await fn();
    } finally {
      this.clearCurrentContext();
      if (previousContextId) {
        this.currentContextId = previousContextId;
      }
    }
  }
}

// Global context manager instance
export const contextManager = new ContextManager();
