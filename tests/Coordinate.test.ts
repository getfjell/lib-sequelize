import { createCoordinate, SCOPE_SEQUELIZE } from '../src/index';
import { ItemTypeArray } from '@fjell/core';
import { describe, expect, it } from 'vitest';

describe('Coordinate', () => {
  describe('SCOPE_SEQUELIZE', () => {
    it('should have the correct value', () => {
      expect(SCOPE_SEQUELIZE).toBe('sequelize');
    });
  });

  describe('createCoordinate', () => {
    it('should create a coordinate with default sequelize scope when no additional scopes provided', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const coordinate = createCoordinate(kta);

      expect(coordinate).toBeDefined();
      expect(coordinate.kta).toEqual(kta);
      expect(coordinate.scopes).toContain(SCOPE_SEQUELIZE);
      expect(coordinate.scopes.length).toBe(1);
      expect(coordinate.toString).toBeInstanceOf(Function);
    });

    it('should create a coordinate with sequelize scope and additional custom scopes', () => {
      const kta: ItemTypeArray<'test', 'level1'> = ['test', 'level1'];
      const customScopes = ['customScope1', 'customScope2'];
      const coordinate = createCoordinate(kta, customScopes);

      expect(coordinate).toBeDefined();
      expect(coordinate.kta).toEqual(kta);
      expect(coordinate.scopes).toContain(SCOPE_SEQUELIZE);
      customScopes.forEach(scope => {
        expect(coordinate.scopes).toContain(scope);
      });
      expect(coordinate.scopes.length).toBe(1 + customScopes.length);
      expect(coordinate.toString).toBeInstanceOf(Function);
    });

    it('should handle empty custom scopes array', () => {
      const kta: ItemTypeArray<'sample'> = ['sample'];
      const coordinate = createCoordinate(kta, []);

      expect(coordinate).toBeDefined();
      expect(coordinate.kta).toEqual(kta);
      expect(coordinate.scopes).toContain(SCOPE_SEQUELIZE);
      expect(coordinate.scopes.length).toBe(1);
    });

    it('should correctly construct coordinate with single level ItemTypeArray', () => {
      const kta: ItemTypeArray<'entity'> = ['entity'];
      const coordinate = createCoordinate(kta);

      expect(coordinate.kta).toEqual(['entity']);
      expect(coordinate.scopes).toEqual([SCOPE_SEQUELIZE]);
    });

    it('should correctly construct coordinate with multiple level ItemTypeArray', () => {
      const kta: ItemTypeArray<'entity', 'type', 'id'> = ['entity', 'type', 'id'];
      const coordinate = createCoordinate(kta);

      expect(coordinate.kta).toEqual(['entity', 'type', 'id']);
      expect(coordinate.scopes).toEqual([SCOPE_SEQUELIZE]);
    });

    it('should handle ItemTypeArray with all levels', () => {
      const kta: ItemTypeArray<'l0', 'l1', 'l2', 'l3', 'l4', 'l5'> = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5'];
      const coordinate = createCoordinate(kta);

      expect(coordinate.kta).toEqual(['l0', 'l1', 'l2', 'l3', 'l4', 'l5']);
      expect(coordinate.scopes).toContain(SCOPE_SEQUELIZE);
    });

    it('should preserve order of scopes with sequelize first', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const customScopes = ['scope1', 'scope2', 'scope3'];
      const coordinate = createCoordinate(kta, customScopes);

      expect(coordinate.scopes[0]).toBe(SCOPE_SEQUELIZE);
      expect(coordinate.scopes.slice(1)).toEqual(customScopes);
    });

    it('should handle duplicate scopes correctly', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const customScopes = ['sequelize', 'scope1', 'sequelize'];
      const coordinate = createCoordinate(kta, customScopes);

      expect(coordinate.scopes).toEqual([SCOPE_SEQUELIZE, ...customScopes]);
      expect(coordinate.scopes.filter((scope: string) => scope === 'sequelize').length).toBe(3);
    });

    it('should create coordinate with toString function that returns formatted string', () => {
      const kta: ItemTypeArray<'test', 'other'> = ['test', 'other'];
      const scopes = ['scope1', 'scope2'];
      const coordinate = createCoordinate(kta, scopes);

      const result = coordinate.toString();
      const expected = 'test, other - sequelize, scope1, scope2';

      expect(result).toBe(expected);
    });

    it('should handle toString with only sequelize scope', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const coordinate = createCoordinate(kta);

      const result = coordinate.toString();
      const expected = 'test - sequelize';

      expect(result).toBe(expected);
    });

    it('should return a coordinate that matches the Coordinate interface', () => {
      const kta: ItemTypeArray<'test'> = ['test'];
      const coordinate = createCoordinate(kta);

      expect(coordinate).toHaveProperty('kta');
      expect(coordinate).toHaveProperty('scopes');
      expect(coordinate).toHaveProperty('toString');
      expect(typeof coordinate.toString).toBe('function');
    });
  });
});
