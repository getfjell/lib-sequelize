import { describe, expect, it } from 'vitest';
import * as ContainedIndex from '../../src/contained/index';

describe('contained/index', () => {
  it('should export SequelizeLibrary interface and createSequelizeLibrary function', () => {
    // Verify that createSequelizeLibrary function is exported
    expect(typeof ContainedIndex.createSequelizeLibrary).toBe('function');
    expect(ContainedIndex.createSequelizeLibrary).toBeDefined();
  });

  it('should re-export all SequelizeLibrary exports', () => {
    // Verify that the re-export includes the expected exports
    const exports = Object.keys(ContainedIndex);
    expect(exports).toContain('createSequelizeLibrary');

    // Verify we have at least one export (the function)
    expect(exports.length).toBeGreaterThan(0);
  });

  it('should maintain function signature from SequelizeLibrary module', () => {
    // Verify the function has the expected number of required parameters
    // (function.length only counts parameters without defaults)
    expect(ContainedIndex.createSequelizeLibrary.length).toBe(2);
  });
});
