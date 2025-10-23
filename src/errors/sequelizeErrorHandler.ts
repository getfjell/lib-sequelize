import {
  BusinessLogicError,
  DuplicateError,
  ValidationError
} from "@fjell/core";

/**
 * Transforms Sequelize-specific errors into Fjell error types.
 *
 * Sequelize surfaces both its own error types and raw database error codes:
 * - PostgreSQL: numeric codes like '23505' (unique violation), '23503' (foreign key)
 * - MySQL: named codes like 'ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW'
 * - SQLite: often no codes, just error messages
 *
 * @param error - The Sequelize error to transform
 * @param itemType - The type of item being operated on
 * @param key - Optional key context for the error
 * @param modelName - Optional model name for enhanced error messages
 * @param itemData - Optional item data for enhanced error messages
 * @returns A Fjell error type or the original error if not recognized
 */
export function transformSequelizeError(
  error: any,
  itemType: string,
  key?: any,
  modelName?: string,
  itemData?: any
): Error {
  // Handle PostgreSQL unique constraint errors (code 23505)
  if (error.code === '23505' || error.original?.code === '23505') {
    const constraint = error.original?.constraint;
    const detail = error.original?.detail;
    
    let message = '';
    if (constraint && detail) {
      message = `Duplicate value violates unique constraint '${constraint}'. ${detail}`;
    } else if (detail) {
      message = `Duplicate value detected. This record already exists. ${detail}`;
    } else {
      message = `${itemType} already exists`;
    }
    
    const field = error.fields ? Object.keys(error.fields)[0] : 'unique constraint';
    return new DuplicateError(message, key, field);
  }
  
  // Handle Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
    const field = error.fields ? Object.keys(error.fields)[0] : 'unique constraint';
    return new DuplicateError(
      `${itemType} already exists`,
      key,
      field
    );
  }

  // Handle Sequelize validation errors
  if (error.name === 'SequelizeValidationError') {
    const fields = error.errors?.map((e: any) => e.path) || [];
    const message = error.errors?.map((e: any) => e.message).join(', ') ||
                    `Validation failed for ${itemType}`;
    return new ValidationError(
      message,
      fields,
      'Fix validation errors and try again'
    );
  }

  // Handle PostgreSQL foreign key constraint errors (code 23503)
  if (error.code === '23503' || error.original?.code === '23503') {
    const constraint = error.original?.constraint;
    const detail = error.original?.detail;
    
    let message = '';
    if (constraint && detail) {
      message = `Foreign key constraint '${constraint}' violated. Referenced record does not exist. ${detail}`;
    } else if (constraint) {
      message = `Foreign key constraint '${constraint}' violated. Referenced record does not exist.`;
    } else if (detail) {
      message = `Referenced record does not exist. Check that all related records are valid. ${detail}`;
    } else {
      message = 'Referenced item does not exist';
    }
    
    return new ValidationError(
      message,
      void 0,
      'Ensure all referenced items exist before creating this relationship'
    );
  }
  
  // Handle Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError' || error.code === 'ER_NO_REFERENCED_ROW') {
    return new ValidationError(
      'Referenced item does not exist',
      void 0,
      'Ensure all referenced items exist before creating this relationship'
    );
  }

  // Handle not null constraint errors (code 23502)
  if (error.code === '23502' || error.original?.code === '23502') {
    const column = error.original?.column;
    const fields = column ? [column] : void 0;
    return new ValidationError(
      column ? `Required field '${column}' cannot be null` : 'Required field is missing or null',
      fields,
      'Provide all required fields'
    );
  }

  // Handle check constraint errors (code 23514)
  if (error.code === '23514' || error.original?.code === '23514') {
    const constraint = error.original?.constraint;
    const detail = error.original?.detail;
    
    let message = '';
    if (constraint && detail) {
      message = `Check constraint '${constraint}' violated. ${detail}`;
    } else if (detail) {
      message = `Data validation failed. Check constraint violated. ${detail}`;
    } else if (constraint) {
      message = `Check constraint '${constraint}' violated`;
    } else {
      message = 'Data validation failed';
    }
    
    return new ValidationError(
      message,
      void 0,
      'Ensure data meets all constraints'
    );
  }

  // Handle unknown column errors
  if (error.name === 'SequelizeDatabaseError' && error.message?.includes('Unknown column')) {
    const match = error.message.match(/Unknown column '(.+?)'/);
    const field = match ? match[1] : 'unknown field';
    return new ValidationError(
      `Invalid field: ${field}`,
      [field],
      'Check the field names in your request'
    );
  }

  // Handle data too long errors (code 22001)
  if (error.code === '22001' || error.original?.code === '22001') {
    const detail = error.original?.detail;
    const message = detail
      ? `Data too long for field. Check string lengths. ${detail}`
      : 'Data too long for field';
    
    return new ValidationError(
      message,
      void 0,
      'Check string lengths and try again'
    );
  }

  // Handle numeric out of range errors (code 22003)
  if (error.code === '22003' || error.original?.code === '22003') {
    const detail = error.original?.detail;
    const message = detail
      ? `Numeric value out of range. Check number values. ${detail}`
      : 'Numeric value out of range';
    
    return new ValidationError(
      message,
      void 0,
      'Check number values and try again'
    );
  }

  // Handle undefined column errors (code 42703)
  if (error.code === '42703' || error.original?.code === '42703') {
    const column = error.original?.column;
    const fields = column ? [column] : void 0;
    const message = column && modelName
      ? `Column '${column}' does not exist in table '${modelName}'`
      : column
        ? `Column '${column}' does not exist`
        : 'Referenced column does not exist';
    
    return new ValidationError(
      message,
      fields,
      'Check the field names in your request'
    );
  }
  
  // Handle undefined table errors (code 42P01)
  if (error.code === '42P01' || error.original?.code === '42P01') {
    const message = modelName
      ? `Table '${modelName}' does not exist`
      : 'Table does not exist';
    
    return new ValidationError(
      message,
      void 0,
      'Check the table name and database configuration'
    );
  }

  // Handle SQLite-specific errors (no error codes, message-based)
  if (error.message?.includes('notNull Violation') ||
      error.message?.includes('cannot be null')) {
    const fieldMatches = error.message.match(/([a-zA-Z][a-zA-Z0-9_]{0,100}\.[a-zA-Z][a-zA-Z0-9_]{0,100}) cannot be null/g);
    if (fieldMatches) {
      const fields = fieldMatches.map((match: string) => {
        const parts = match.split('.');
        return parts[1]?.split(' ')[0];
      }).filter(Boolean);
      if (fields.length > 0) {
        return new ValidationError(
          `Required field${fields.length > 1 ? 's' : ''} ${fields.join(', ')} cannot be null`,
          fields,
          'Provide all required fields'
        );
      }
    }
    return new ValidationError(
      'Required fields are missing',
      void 0,
      'Provide all required fields'
    );
  }

  // Handle connection errors
  if (error.name === 'SequelizeConnectionError' ||
      error.name === 'SequelizeConnectionRefusedError') {
    return new BusinessLogicError(
      'Database connection failed',
      'Check database connectivity and try again',
      true // retryable
    );
  }

  // Handle timeout errors
  if (error.name === 'SequelizeTimeoutError') {
    return new BusinessLogicError(
      'Database operation timed out',
      'Try again or simplify the operation',
      true // retryable
    );
  }

  // Handle database errors without original property but with modelName and itemData
  if (!error.original && modelName && itemData && error.message) {
    const formattedData = JSON.stringify(itemData, null, 2);
    return new Error(
      `Database error in ${modelName}.create(): ${error.message}. Item data: ${formattedData}`
    );
  }
  
  // Handle unknown database errors with original property
  if (error.original && modelName && itemData) {
    const formattedData = JSON.stringify(itemData, null, 2);
    return new Error(
      `Database error in ${modelName}.create(): ${error.message}. Item data: ${formattedData}`
    );
  }

  // Pass through other errors unchanged
  return error;
}

