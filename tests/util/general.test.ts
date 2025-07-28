import { describe, expect, it } from 'vitest';
import { clean, stringifyJSON } from '../../src/util/general';

describe('general.ts utilities', () => {
  describe('clean', () => {
    it('should remove undefined values from object', () => {
      const input = {
        name: 'John',
        age: void 0,
        city: 'New York',
        country: void 0
      };

      const result = clean(input);

      expect(result).toEqual({
        name: 'John',
        city: 'New York'
      });
    });

    it('should keep null values', () => {
      const input = {
        name: 'John',
        age: null,
        city: 'New York',
        score: void 0
      };

      const result = clean(input);

      expect(result).toEqual({
        name: 'John',
        age: null,
        city: 'New York'
      });
    });

    it('should keep falsy values except undefined', () => {
      const input = {
        name: '',
        age: 0,
        active: false,
        score: null,
        unused: void 0
      };

      const result = clean(input);

      expect(result).toEqual({
        name: '',
        age: 0,
        active: false,
        score: null
      });
    });

    it('should handle empty object', () => {
      const input = {};
      const result = clean(input);
      expect(result).toEqual({});
    });

    it('should handle object with only undefined values', () => {
      const input = {
        a: void 0,
        b: void 0
      };

      const result = clean(input);
      expect(result).toEqual({});
    });

    it('should handle object with no undefined values', () => {
      const input = {
        name: 'John',
        age: 25,
        active: true
      };

      const result = clean(input);
      expect(result).toEqual(input);
    });
  });

  describe('stringifyJSON', () => {
    describe('primitive types', () => {
      it('should stringify numbers', () => {
        expect(stringifyJSON(42)).toBe('42');
        expect(stringifyJSON(0)).toBe('0');
        expect(stringifyJSON(-10)).toBe('-10');
        expect(stringifyJSON(3.14)).toBe('3.14');
      });

      it('should stringify booleans', () => {
        expect(stringifyJSON(true)).toBe('true');
        expect(stringifyJSON(false)).toBe('false');
      });

      it('should stringify null', () => {
        expect(stringifyJSON(null)).toBe('null');
      });

      it('should stringify strings', () => {
        expect(stringifyJSON('hello')).toBe('"hello"');
        expect(stringifyJSON('')).toBe('""');
        expect(stringifyJSON('hello world')).toBe('"hello world"');
      });
    });

    describe('arrays', () => {
      it('should stringify empty array', () => {
        expect(stringifyJSON([])).toBe('[]');
      });

      it('should stringify array with primitives', () => {
        expect(stringifyJSON([1, 2, 3])).toBe('[1,2,3]');
        expect(stringifyJSON(['a', 'b', 'c'])).toBe('["a","b","c"]');
        expect(stringifyJSON([true, false, null])).toBe('[true,false,null]');
      });

      it('should stringify nested arrays', () => {
        expect(stringifyJSON([[1, 2], [3, 4]])).toBe('[[1,2],[3,4]]');
        expect(stringifyJSON([1, [2, 3], 4])).toBe('[1,[2,3],4]');
      });

      it('should stringify mixed type arrays', () => {
        expect(stringifyJSON([1, 'hello', true, null])).toBe('[1,"hello",true,null]');
      });
    });

    describe('objects', () => {
      it('should stringify empty object', () => {
        expect(stringifyJSON({})).toBe('{}');
      });

      it('should stringify simple object', () => {
        const obj = { name: 'John', age: 30 };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"name":"John","age":30}');
      });

      it('should stringify object with various types', () => {
        const obj = {
          name: 'John',
          age: 30,
          active: true,
          score: null
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"name":"John","age":30,"active":true,"score":null}');
      });

      it('should skip undefined properties in objects', () => {
        const obj = {
          name: 'John',
          age: void 0,
          city: 'New York'
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"name":"John","city":"New York"}');
      });

      it('should skip function properties in objects', () => {
        const obj = {
          name: 'John',
          greet: function () { return 'hello'; },
          age: 30
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"name":"John","age":30}');
      });

      it('should stringify nested objects', () => {
        const obj = {
          person: {
            name: 'John',
            address: {
              city: 'New York',
              zip: 10001
            }
          },
          count: 5
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"person":{"name":"John","address":{"city":"New York","zip":10001}},"count":5}');
      });
    });

    describe('circular references', () => {
      it('should handle simple circular reference', () => {
        const obj: any = { name: 'John' };
        obj.self = obj;

        const result = stringifyJSON(obj);
        expect(result).toBe('{"name":"John","self":"(circular)"}');
      });

      it('should handle circular reference in nested structure', () => {
        const obj: any = {
          name: 'John',
          data: {
            info: 'test'
          }
        };
        obj.data.parent = obj;

        const result = stringifyJSON(obj);
        expect(result).toBe('{"name":"John","data":{"info":"test","parent":"(circular)"}}');
      });

      it('should handle circular reference in arrays', () => {
        const arr: any = [1, 2];
        arr.push(arr);

        const result = stringifyJSON(arr);
        expect(result).toBe('[1,2,"(circular)"]');
      });
    });

    describe('complex structures', () => {
      it('should stringify object containing arrays', () => {
        const obj = {
          numbers: [1, 2, 3],
          strings: ['a', 'b'],
          name: 'test'
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"numbers":[1,2,3],"strings":["a","b"],"name":"test"}');
      });

      it('should stringify array containing objects', () => {
        const arr = [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 }
        ];
        const result = stringifyJSON(arr);
        expect(result).toBe('[{"name":"John","age":30},{"name":"Jane","age":25}]');
      });

      it('should handle deeply nested structure', () => {
        const obj = {
          level1: {
            level2: {
              level3: {
                data: [1, 2, { nested: true }]
              }
            }
          }
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{"level1":{"level2":{"level3":{"data":[1,2,{"nested":true}]}}}}');
      });
    });

    describe('edge cases', () => {
      it('should return empty string for unsupported types', () => {
        const symbol = Symbol('test');
        expect(stringifyJSON(symbol)).toBe('');
      });

      it('should handle object with only functions and undefined', () => {
        const obj = {
          func: function () { return 1; },
          undef: void 0
        };
        const result = stringifyJSON(obj);
        expect(result).toBe('{}');
      });

      it('should maintain visited set between calls', () => {
        const visited = new Set();
        const obj1 = { a: 1 };
        const obj2 = { b: 2 };

        visited.add(obj1);

        const result1 = stringifyJSON(obj1, visited);
        const result2 = stringifyJSON(obj2, visited);

        expect(result1).toBe('"(circular)"');
        expect(result2).toBe('{"b":2}');
      });
    });
  });
});
