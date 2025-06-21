import { describe, expect, it } from 'vitest';
import * as IndexExports from '@/index';

describe('index', () => {
  describe('direct exports', () => {
    it('should export Coordinate module exports', () => {
      expect(IndexExports.createCoordinate).toBeDefined();
      expect(typeof IndexExports.createCoordinate).toBe('function');
      expect(IndexExports.SCOPE_SEQUELIZE).toBeDefined();
      expect(IndexExports.SCOPE_SEQUELIZE).toBe('sequelize');
    });

    it('should export Definition module exports', () => {
      expect(IndexExports.createDefinition).toBeDefined();
      expect(typeof IndexExports.createDefinition).toBe('function');
    });

    it('should export Instance module exports', () => {
      // Instance module should have exports - we'll verify at least one exists
      const instanceExports = Object.keys(IndexExports).filter(key =>
        !['Contained', 'Primary', 'createCoordinate', 'SCOPE_SEQUELIZE', 'createDefinition'].includes(key)
      );
      expect(instanceExports.length).toBeGreaterThan(0);
    });
  });

  describe('namespace exports', () => {
    it('should export Contained as a namespace', () => {
      expect(IndexExports.Contained).toBeDefined();
      expect(typeof IndexExports.Contained).toBe('object');

      // Contained should re-export from contained/Instance
      const containedKeys = Object.keys(IndexExports.Contained);
      expect(containedKeys.length).toBeGreaterThan(0);
    });

    it('should export Primary as a namespace', () => {
      expect(IndexExports.Primary).toBeDefined();
      expect(typeof IndexExports.Primary).toBe('object');

      // Primary should re-export from primary/Instance
      const primaryKeys = Object.keys(IndexExports.Primary);
      expect(primaryKeys.length).toBeGreaterThan(0);
    });
  });

  describe('module structure', () => {
    it('should have expected top-level exports', () => {
      const exports = Object.keys(IndexExports);

      // Core function exports
      expect(exports).toContain('createCoordinate');
      expect(exports).toContain('createDefinition');

      // Constants
      expect(exports).toContain('SCOPE_SEQUELIZE');

      // Namespace exports
      expect(exports).toContain('Contained');
      expect(exports).toContain('Primary');
    });

    it('should maintain separation between direct exports and namespaces', () => {
      // Verify that Contained and Primary are objects (namespaces)
      expect(typeof IndexExports.Contained).toBe('object');
      expect(typeof IndexExports.Primary).toBe('object');

      // Verify that direct exports are not nested in namespaces unnecessarily
      expect(typeof IndexExports.createCoordinate).toBe('function');
      expect(typeof IndexExports.createDefinition).toBe('function');
    });
  });

  describe('export integrity', () => {
    it('should not have undefined exports', () => {
      const exports = Object.keys(IndexExports);

      exports.forEach(exportName => {
        expect(IndexExports[exportName as keyof typeof IndexExports]).toBeDefined();
      });
    });

    it('should have consistent export types', () => {
      // Functions should be functions
      expect(typeof IndexExports.createCoordinate).toBe('function');
      expect(typeof IndexExports.createDefinition).toBe('function');

      // Constants should be strings
      expect(typeof IndexExports.SCOPE_SEQUELIZE).toBe('string');

      // Namespaces should be objects
      expect(typeof IndexExports.Contained).toBe('object');
      expect(typeof IndexExports.Primary).toBe('object');
    });
  });
});
