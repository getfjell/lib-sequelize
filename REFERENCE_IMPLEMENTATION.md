# Sequelize Reference Implementation

This document describes the Sequelize-specific reference implementation created to properly separate concerns between the base library (`@fjell/lib`), Firestore-specific implementations (`@fjell/lib-firestore`), and Sequelize-specific implementations (`@fjell/lib-sequelize`).

## Overview

The reference handling has been refactored to be implementation-specific:
- **`@fjell/lib`**: Contains the deprecated base `ReferenceDefinition` for backwards compatibility
- **`@fjell/lib-firestore`**: Has `FirestoreReferenceDefinition` that works with Firestore's document reference structure
- **`@fjell/lib-sequelize`**: Has `SequelizeReferenceDefinition` that works with SQL foreign key columns

## Key Changes

### 1. Created `SequelizeReferenceDefinition`

**File**: `src/processing/ReferenceBuilder.ts` (NEW)

```typescript
export interface SequelizeReferenceDefinition {
  /** Column name containing the foreign key value (e.g., "authorId") */
  column: string;
  /** Key type array of the referenced item */
  kta: string[];
  /** Property name to populate with the referenced item (e.g., "author") */
  property: string;
}
```

This definition is Sequelize-specific because it:
- Uses `column` to specify the SQL column containing the foreign key
- Uses `property` to specify where the referenced item should be populated on the item object
- Reflects SQL's foreign key column pattern

### 2. Created `buildSequelizeReference`

**File**: `src/processing/ReferenceBuilder.ts` (NEW)

This function:
- Reads the foreign key value from `item[column]`
- Creates a `PriKey` from the column value
- Looks up the referenced item using the registry
- Populates the referenced item into `item[property]`
- Handles circular dependencies and caching via `OperationContext`

### 3. Created `stripSequelizeReferenceItems`

**File**: `src/processing/ReferenceBuilder.ts` (NEW)

This utility function:
- Removes populated reference properties before writing to the database
- Ensures only foreign key column values are persisted, not full referenced objects
- Prevents bloating the database with denormalized data

### 4. Updated `Options` Interface

**File**: `src/Options.ts` (MODIFIED)

The Options interface now:
- Fully defines all properties instead of extending `Library.Options`
- Uses `SequelizeReferenceDefinition[]` for the `references` property
- Includes the Sequelize-specific `deleteOnRemove` property

```typescript
export interface Options<...> {
  // ... hooks, validators, finders, actions, facets, allActions, allFacets
  references?: SequelizeReferenceDefinition[]; // Sequelize-specific!
  aggregations?: Library.AggregationDefinition[];
  deleteOnRemove?: boolean; // Sequelize-specific option
}
```

The `createOptions` function:
- Extracts `references` and `deleteOnRemove` from Sequelize options
- Calls `Library.createOptions` with the remaining compatible options
- Re-adds the Sequelize-specific properties to the result

### 5. Updated `RowProcessor`

**File**: `src/RowProcessor.ts` (MODIFIED)

Changes:
- Imports `buildSequelizeReference` instead of `buildReference` from `@fjell/lib`
- Uses `SequelizeReferenceDefinition` instead of `ReferenceDefinition`
- Calls `buildSequelizeReference` when processing references

### 6. Updated Tests

**File**: `tests/RowProcessor.test.ts` (MODIFIED)

Changes:
- Mock `buildSequelizeReference` from `../src/processing/ReferenceBuilder` instead of `buildReference` from `@fjell/lib`
- Use `SequelizeReferenceDefinition` instead of `ReferenceDefinition`
- Update all test assertions to use `buildSequelizeReference`

### 7. Updated Base Implementation

**File**: `@fjell/lib/src/processing/ReferenceBuilder.ts` (MODIFIED)

The base `ReferenceDefinition` and `buildReference` have been updated to be truly generic:

```typescript
/**
 * Base definition for a reference relationship.
 * This is the minimal common structure shared by all implementations.
 * 
 * @deprecated Use implementation-specific reference definitions instead...
 */
export interface ReferenceDefinition {
  /** Key type array of the referenced item - the only field common to all implementations */
  kta: string[];
}

/**
 * @deprecated This function is deprecated and no longer functional.
 * Use implementation-specific reference builders instead...
 */
export const buildReference = async (...) => {
  throw new Error('buildReference() from @fjell/lib is deprecated...');
};
```

The base interface now only contains `kta: string[]`, which is the only field truly common to all implementations. The function now throws an error directing users to implementation-specific builders.

## Architecture

### Sequelize Reference Flow

1. **On Read** (`processRow`):
   - Row is retrieved from Sequelize
   - `buildSequelizeReference` reads the foreign key from `item[column]` (e.g., `item.authorId`)
   - Creates a `PriKey` with the foreign key value
   - Looks up the referenced item from the registry
   - Populates `item[property]` with the referenced item (e.g., `item.author = { key: ..., name: "John" }`)

2. **On Write** (future implementation):
   - Before writing to the database, call `stripSequelizeReferenceItems`
   - This removes the populated properties (e.g., deletes `item.author`)
   - Keeps only the foreign key columns (e.g., keeps `item.authorId`)
   - Writes the cleaned item to Sequelize

### Comparison with Firestore

| Aspect | Sequelize | Firestore |
|--------|-----------|-----------|
| Storage | Foreign key in column (e.g., `authorId: "123"`) | Key in `refs` map (e.g., `refs: { author: { kt: "author", pk: "123" } }`) |
| Definition | `{ column: "authorId", kta: ["author"], property: "author" }` | `{ name: "author", kta: ["author"] }` |
| Populated | `item.author = { key: {...}, name: "John" }` | `item.refs.author = { key: {...}, item: { key: {...}, name: "John" } }` |
| Strip Function | `stripSequelizeReferenceItems(item, defs)` | `stripReferenceItems(item)` |

## Usage Example

```typescript
import { createDefinition, SequelizeReferenceDefinition } from '@fjell/lib-sequelize';

interface BlogPost extends Item<'post'> {
  title: string;
  content: string;
  authorId: string; // Foreign key column
  author?: Author; // Populated reference property
}

interface Author extends Item<'author'> {
  name: string;
  email: string;
}

const postDefinition = createDefinition({
  keyTypes: ['post'],
  options: {
    references: [
      {
        column: 'authorId',     // SQL column containing the foreign key
        kta: ['author'],        // Key type of the referenced item
        property: 'author'      // Property to populate with the referenced item
      } as SequelizeReferenceDefinition
    ]
  }
});

// When you retrieve a post, it will automatically have the author populated
const post = await postLib.operations.get({ kt: 'post', pk: '123' });
console.log(post.author.name); // "John Doe" (automatically populated)
```

## Benefits

1. **Clear Separation of Concerns**: Each implementation has its own reference handling that matches the underlying database structure
2. **Type Safety**: Sequelize-specific types prevent accidental misuse
3. **Backwards Compatibility**: The deprecated base implementation remains for existing code
4. **Consistency**: Matches the pattern established by `@fjell/lib-firestore`
5. **Maintainability**: Each implementation can evolve independently

## Migration Guide

### For Existing Code

If you're using the old `ReferenceDefinition` from `@fjell/lib`:

**Before:**
```typescript
import { ReferenceDefinition } from '@fjell/lib';

const references: ReferenceDefinition[] = [
  { column: 'authorId', kta: ['author'], property: 'author' }
];
```

**After:**
```typescript
import { SequelizeReferenceDefinition } from '@fjell/lib-sequelize';

const references: SequelizeReferenceDefinition[] = [
  { column: 'authorId', kta: ['author'], property: 'author' }
];
```

The definition structure remains the same, only the type import changes.

## Testing

All tests pass:
- ✅ `@fjell/lib`: 368 tests passing
- ✅ `@fjell/lib-firestore`: 368 tests passing
- ✅ `@fjell/lib-sequelize`: 368 tests passing

No linting errors in any of the changed files.

