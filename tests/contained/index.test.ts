import { describe, expect, it } from 'vitest';
import * as ContainedIndex from '@/contained/index';

describe('contained/index', () => {
  it('should export Instance interface and createInstance function', () => {
    // Verify that createInstance function is exported
    expect(typeof ContainedIndex.createInstance).toBe('function');
    expect(ContainedIndex.createInstance).toBeDefined();
  });

  it('should re-export all Instance exports', () => {
    // Verify that the re-export includes the expected exports
    const exports = Object.keys(ContainedIndex);
    expect(exports).toContain('createInstance');

    // Verify we have at least one export (the function)
    expect(exports.length).toBeGreaterThan(0);
  });

  it('should maintain function signature from Instance module', () => {
    // Verify the function has the expected number of required parameters
    // (function.length only counts parameters without defaults)
    expect(ContainedIndex.createInstance.length).toBe(2);
  });
});
