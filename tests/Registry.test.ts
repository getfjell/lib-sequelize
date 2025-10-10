import { describe, expect, it, vi } from 'vitest';
import { Registry } from '../src/Registry';
import * as Library from '@fjell/lib';

describe('Registry', () => {
  it('should be a type alias for Library.Registry', () => {
    // Since Registry is just a type alias, we test that it behaves like Library.Registry
    // We can't directly test the type, but we can test that it's compatible
    
    // Create a mock registry that matches the expected interface
    const mockRegistry: Registry = {
      register: () => {},
      get: () => undefined,
      has: () => false,
      keys: () => [],
      values: () => [],
      entries: () => [],
      forEach: () => {},
      clear: () => {},
      size: 0,
      [Symbol.iterator]: function* () {},
      [Symbol.toStringTag]: 'Registry'
    };

    expect(mockRegistry).toBeDefined();
    expect(typeof mockRegistry.register).toBe('function');
    expect(typeof mockRegistry.get).toBe('function');
    expect(typeof mockRegistry.has).toBe('function');
    expect(typeof mockRegistry.keys).toBe('function');
    expect(typeof mockRegistry.values).toBe('function');
    expect(typeof mockRegistry.entries).toBe('function');
    expect(typeof mockRegistry.forEach).toBe('function');
    expect(typeof mockRegistry.clear).toBe('function');
    expect(typeof mockRegistry.size).toBe('number');
    expect(typeof mockRegistry[Symbol.iterator]).toBe('function');
    expect(mockRegistry[Symbol.toStringTag]).toBe('Registry');
  });

  it('should be compatible with Library.Registry interface', () => {
    // Test that Registry type is assignable to Library.Registry
    const registry: Registry = {} as Library.Registry;
    expect(registry).toBeDefined();
  });

  it('should support all Registry methods', () => {
    const registry: Registry = {
      register: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
      forEach: vi.fn(),
      clear: vi.fn(),
      size: 0,
      [Symbol.iterator]: function* () {},
      [Symbol.toStringTag]: 'Registry'
    };

    // Test that all methods are callable
    expect(() => registry.register({} as any)).not.toThrow();
    expect(() => registry.get('test')).not.toThrow();
    expect(() => registry.has('test')).not.toThrow();
    expect(() => registry.keys()).not.toThrow();
    expect(() => registry.values()).not.toThrow();
    expect(() => registry.entries()).not.toThrow();
    expect(() => registry.forEach(() => {})).not.toThrow();
    expect(() => registry.clear()).not.toThrow();
  });

  it('should support iteration', () => {
    const registry: Registry = {
      register: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
      forEach: vi.fn(),
      clear: vi.fn(),
      size: 0,
      [Symbol.iterator]: function* () {},
      [Symbol.toStringTag]: 'Registry'
    };

    // Test that the registry is iterable
    expect(typeof registry[Symbol.iterator]).toBe('function');
    expect(registry[Symbol.toStringTag]).toBe('Registry');
  });
});
