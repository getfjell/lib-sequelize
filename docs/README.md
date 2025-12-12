# @fjell/lib-sequelize

Sequelize integration for the Fjell ecosystem providing database-specific implementations for relational databases.

## New Architecture (v4.4.12+)

This library now uses the new **SequelizeLibrary** architecture that extends `@fjell/lib`:

```
fjell-registry.Instance
  ↓ extends
fjell-lib.Library
  ↓ extends
fjell-lib-sequelize.SequelizeLibrary
```

## Installation

```bash
npm install @fjell/lib-sequelize @fjell/lib @fjell/registry sequelize
```

## Quick Start

### New SequelizeLibrary API (v4.4.12+)

```typescript
import { createRegistry } from '@fjell/registry';
import { createSequelizeLibrary, SequelizeLibrary } from '@fjell/lib-sequelize';
import { User } from './models/User'; // Your Sequelize model

// Create a SequelizeLibrary
const userLibrary: SequelizeLibrary<UserItem, 'user'> = createSequelizeLibrary(
  registry,
  { keyType: 'user' },
  [User], // Sequelize models
  {
    validators: {
      email: (email) => email.includes('@')
    },
    hooks: {
      beforeCreate: async (user) => {
        user.createdAt = new Date();
        return user;
      }
    }
  }
);

// Use the library
const users = await userLibrary.operations.all({});
const newUser = await userLibrary.operations.create({
  name: 'Alice Johnson',
  email: 'alice@example.com'
});

// Access Sequelize-specific features
console.log('Available models:', userLibrary.models.map(m => m.name));
```



## Features

### SequelizeLibrary Extends Library

The `SequelizeLibrary` interface adds:
- **models**: Array of Sequelize model classes
- **All Library features**: operations, options, coordinate, registry

```typescript
interface SequelizeLibrary<T, S> extends Library<T, S> {
  models: ModelStatic<any>[];
}
```

### Database Operations

Built-in operations automatically use your Sequelize models:

```typescript
// CRUD operations use Sequelize under the hood
await userLibrary.operations.create(userData);
await userLibrary.operations.find({ filter: { email: 'alice@example.com' } });
await userLibrary.operations.update(['user-123'], { name: 'Alice Smith' });
await userLibrary.operations.remove(['user-123']);

// Advanced queries
await userLibrary.operations.all({
  filter: { status: 'active' },
  sort: { createdAt: -1 },
  limit: 10
});
```

### Model Integration

Your Sequelize models are automatically integrated:

```typescript
// Define your Sequelize model
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true }
});

// Create SequelizeLibrary with the model
const userLibrary = createSequelizeLibrary(
  registry,
  { keyType: 'user' },
  [User], // Pass your models here
  options
);

// Operations automatically use the User model
const users = await userLibrary.operations.all({}); // SELECT * FROM users
```

## Advanced Usage

### Multiple Models

```typescript
import { User, UserProfile, UserSettings } from './models';

const userLibrary = createSequelizeLibrary(
  registry,
  { keyType: 'user' },
  [User, UserProfile, UserSettings], // Multiple related models
  {
    hooks: {
      afterCreate: async (user) => {
        // Automatically create profile and settings
        await UserProfile.create({ userId: user.id });
        await UserSettings.create({ userId: user.id });
      }
    }
  }
);
```

### Custom Operations

```typescript
import { createOperations } from '@fjell/lib-sequelize';

const customOperations = createOperations([User], coordinate, registry, {
  // Custom business logic
  actions: {
    activate: async (keys, params) => {
      const user = await User.findByPk(keys[0]);
      user.status = 'active';
      user.activatedAt = new Date();
      await user.save();
      return { success: true };
    }
  },

  // Custom analytics
  facets: {
    userStats: async (query, options) => {
      const users = await User.findAll();
      return {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        byRegion: groupBy(users, 'region')
      };
    }
  }
});
```

### Hierarchical Data

Support for contained items with location hierarchies:

```typescript
// Department library with location hierarchy
const deptLibrary = createSequelizeLibrary(
  registry,
  { keyType: 'department' },
  [Department],
  options
);

// Query departments by location
const usDepartments = await deptLibrary.operations.all({}, ['us', 'usa']);
const westCoastDepts = await deptLibrary.operations.all({}, ['us', 'west']);
```

## Migration Guide

### From v4.4.11 and earlier

1. **No breaking changes** - existing code continues to work
2. **Optional migration** to new naming:

```typescript
// Clean Library architecture
import { createSequelizeLibrary, SequelizeLibrary } from '@fjell/lib-sequelize';
```

3. **Benefits of the new architecture**:
   - Clear naming that shows inheritance hierarchy
   - Better TypeScript autocomplete and documentation
   - Future-proof as the ecosystem evolves

### Simple Setup

Use the SequelizeLibrary for all new development:

```typescript
// Clean, consistent API
const userLibrary = createSequelizeLibrary(registry, coordinate, models, options);
const orderLibrary = createSequelizeLibrary(registry, orderCoordinate, orderModels, orderOptions);
```

## Architecture Benefits

1. **Clear Inheritance**: Shows how SequelizeLibrary extends Library
2. **Type Safety**: Full TypeScript support throughout the hierarchy
3. **Database Focus**: SequelizeLibrary is clearly Sequelize-specific
4. **Extensibility**: Easy to add new database-specific libraries
5. **Clean API**: Consistent naming and patterns across all libraries

## Error Handling

@fjell/lib-sequelize provides detailed error messages to help with debugging configuration issues:

### Improved Error Context

All error messages now include relevant context:

```typescript
// Example: Reference configuration error
try {
  await userLibrary.operations.create({
    name: 'Alice',
    organizationId: 'invalid-org'
  });
} catch (error) {
  // Error now shows:
  // "Reference organization is not supported on model 'User', column 'organizationId' not found.
  //  Available columns: [id, name, email, createdAt, updatedAt].
  //  Reference query: {"kt":"organization","pk":"invalid-org"}"
}
```

### Reference Builder Errors

Reference definition errors show complete context:

```typescript
// Multiple key types error:
// "The ReferenceBuilder doesn't work with more than one key type yet.
//  Reference definition key types: [user, organization],
//  property: 'owner', column: 'ownerId'"

// Missing dependency error:
// "This model definition has a reference definition, but the dependency is not present in registry.
//  Reference property: 'organization', missing key type: 'organization', column: 'organizationId'"
```

### Location Key Errors

Location key resolution errors include helpful details:

```typescript
// "Location key 'department' cannot be resolved on model 'User' or through its relationships.
//  Key type array: [user, department, organization].
//  Available associations: [profile, settings, posts]"
```

## Examples

See the `examples/` directory for complete working examples:
- Basic Sequelize integration
- Error handling and debugging
- Advanced business logic
- Multi-model applications
- Location-based data organization

## TypeScript Support

Full TypeScript support with proper type inference:

```typescript
import { Item } from '@fjell/core';

interface User extends Item<'user'> {
  id: string;
  name: string;
  email: string;
}

const userLibrary: SequelizeLibrary<User, 'user'> = createSequelizeLibrary(
  registry,
  { keyType: 'user' },
  [UserModel],
  options
);

// Full type safety
const user: User = await userLibrary.operations.create({
  name: 'Alice',
  email: 'alice@example.com'
});
```

## Next Steps

- Check out `@fjell/lib-firestore` for Firestore integration
- See `@fjell/lib` for core Library functionality
- Read `@fjell/registry` for base coordination features
