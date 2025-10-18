import { describe, expect, it } from 'vitest';
import { transformSequelizeError } from '../../src/errors/sequelizeErrorHandler';
import { BusinessLogicError, DuplicateError, ValidationError } from '@fjell/core';

describe('transformSequelizeError', () => {
  const itemType = 'user';
  const key = { pk: 123, kt: 'user' };

  describe('Unique constraint errors', () => {
    it('should transform SequelizeUniqueConstraintError', () => {
      const error = {
        name: 'SequelizeUniqueConstraintError',
        fields: { email: 'test@example.com' }
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(DuplicateError);
      expect(result.message).toContain('user already exists');
      expect((result as DuplicateError).errorInfo.details?.conflictingValue).toBe('email');
    });

    it('should transform PostgreSQL unique violation (23505)', () => {
      const error = {
        code: '23505',
        original: { constraint: 'users_email_unique' }
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(DuplicateError);
    });

    it('should transform MySQL duplicate entry (ER_DUP_ENTRY)', () => {
      const error = {
        code: 'ER_DUP_ENTRY',
        fields: { username: 'john_doe' }
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(DuplicateError);
      expect((result as DuplicateError).errorInfo.details?.conflictingValue).toBe('username');
    });
  });

  describe('Validation errors', () => {
    it('should transform SequelizeValidationError', () => {
      const error = {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'email', message: 'Invalid email format' },
          { path: 'age', message: 'Age must be positive' }
        ]
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Invalid email format');
      expect((result as ValidationError).errorInfo.details?.validOptions).toEqual(['email', 'age']);
    });

    it('should transform SequelizeValidationError with no errors array', () => {
      const error = {
        name: 'SequelizeValidationError'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Validation failed for user');
    });
  });

  describe('Foreign key constraint errors', () => {
    it('should transform SequelizeForeignKeyConstraintError', () => {
      const error = {
        name: 'SequelizeForeignKeyConstraintError'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Referenced item does not exist');
    });

    it('should transform PostgreSQL foreign key violation (23503)', () => {
      const error = {
        code: '23503'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
    });

    it('should transform MySQL foreign key error (ER_NO_REFERENCED_ROW)', () => {
      const error = {
        code: 'ER_NO_REFERENCED_ROW'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
    });
  });

  describe('Not null constraint errors', () => {
    it('should transform PostgreSQL not null violation (23502)', () => {
      const error = {
        code: '23502',
        original: { column: 'email' }
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('email');
      expect(result.message).toContain('cannot be null');
      expect((result as ValidationError).errorInfo.details?.validOptions).toEqual(['email']);
    });

    it('should transform not null error without column info', () => {
      const error = {
        code: '23502',
        original: {}
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Required field is missing or null');
    });
  });

  describe('Check constraint errors', () => {
    it('should transform check constraint violation (23514)', () => {
      const error = {
        code: '23514',
        original: { constraint: 'age_positive' }
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('age_positive');
    });
  });

  describe('Unknown column errors', () => {
    it('should transform unknown column error', () => {
      const error = {
        name: 'SequelizeDatabaseError',
        message: "Unknown column 'invalid_field' in 'field list'"
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Invalid field: invalid_field');
      expect((result as ValidationError).errorInfo.details?.validOptions).toEqual(['invalid_field']);
    });
  });

  describe('Data too long errors', () => {
    it('should transform data too long error (22001)', () => {
      const error = {
        code: '22001'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Data too long');
    });
  });

  describe('Numeric out of range errors', () => {
    it('should transform numeric out of range error (22003)', () => {
      const error = {
        code: '22003'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Numeric value out of range');
    });
  });

  describe('Undefined column errors', () => {
    it('should transform undefined column error (42703)', () => {
      const error = {
        code: '42703',
        original: { column: 'bad_column' }
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('bad_column');
    });
  });

  describe('SQLite notNull violations', () => {
    it('should transform SQLite notNull violation', () => {
      const error = {
        message: 'notNull Violation: User.email cannot be null'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('email');
      expect(result.message).toContain('cannot be null');
    });

    it('should transform SQLite notNull violation with multiple fields', () => {
      const error = {
        message: 'notNull Violation: User.email cannot be null, User.name cannot be null'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('email');
      expect(result.message).toContain('name');
    });
  });

  describe('Connection errors', () => {
    it('should transform SequelizeConnectionError', () => {
      const error = {
        name: 'SequelizeConnectionError'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('Database connection failed');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });

    it('should transform SequelizeConnectionRefusedError', () => {
      const error = {
        name: 'SequelizeConnectionRefusedError'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });
  });

  describe('Timeout errors', () => {
    it('should transform SequelizeTimeoutError', () => {
      const error = {
        name: 'SequelizeTimeoutError'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('timed out');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });
  });

  describe('Unknown errors', () => {
    it('should pass through unknown errors unchanged', () => {
      const error = new Error('Unknown error');

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBe(error);
      expect(result.message).toBe('Unknown error');
    });

    it('should pass through errors without codes', () => {
      const error = {
        name: 'UnknownSequelizeError',
        message: 'Something went wrong'
      };

      const result = transformSequelizeError(error, itemType, key);

      expect(result).toBe(error);
    });
  });
});

