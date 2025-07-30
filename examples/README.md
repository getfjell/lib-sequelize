# @fjell/lib-sequelize Examples

This directory contains practical examples demonstrating how to use @fjell/lib-sequelize effectively.

## Examples

### 1. [Basic Integration](./basic-integration.ts)
Basic setup and usage of SequelizeLibrary with a simple User model.

### 2. [Error Handling](./error-handling-example.ts)
Comprehensive examples of error handling and debugging with improved error messages.

### 3. [Multi-Model Setup](./multi-model-example.ts)
Working with multiple related Sequelize models in a single library.

### 4. [Reference Handling](./reference-example.ts)
Setting up and working with references between different libraries.

### 5. [Multikey Reference Handling](./multikey-reference-example.ts)
Demonstrates how to set up references to composite item types using just the primary key. Shows the assumption that primary keys of composite items are unique and can be used for retrieval.

### 6. [Location-Based Data](./location-example.ts)
Organizing data with location hierarchies and contained items.

## Running Examples

Each example is a standalone TypeScript file that you can run directly:

```bash
npx tsx examples/basic-integration.ts
npx tsx examples/error-handling-example.ts
npx tsx examples/multikey-reference-example.ts
```

Make sure you have the required dependencies installed:

```bash
npm install @fjell/lib-sequelize @fjell/lib @fjell/registry sequelize sqlite3
npm install -D tsx
```
