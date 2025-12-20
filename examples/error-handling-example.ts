/**
 * Error Handling Example
 *
 * This example demonstrates the improved error messages in @fjell/lib-sequelize
 * and how to handle common configuration errors.
 */

import { DataTypes, ModelStatic, Sequelize } from 'sequelize';
import { createRegistry } from '@fjell/registry';
import { createSequelizeLibrary } from '@fjell/lib-sequelize';
import { Item } from "@fjell/types";

// Initialize Sequelize with SQLite for this example
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

// Define User interface
interface User extends Item<'user'> {
  id: string;
  name: string;
  email: string;
  organizationId?: string;
}

// Define User model
const UserModel = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: true }
});

// Create registry
const registry = createRegistry();

async function demonstrateErrorHandling() {
  console.log('🚀 Starting Error Handling Example\n');

  // Sync database
  await sequelize.sync();

  try {
    // Create user library
    const userLibrary = createSequelizeLibrary<User, 'user'>(
      registry,
      { kta: ['user'] },
      [UserModel as ModelStatic<any>],
      {
        // Example reference definition that might cause errors
        references: [{
          property: 'organization',
          column: 'organizationId',
          kta: ['organization'] // This will cause an error - organization not in registry
        }]
      }
    );

    console.log('✅ User library created successfully');

    // Register the library
    registry.register(userLibrary);

    // Example 1: Reference dependency error
    console.log('\n📝 Example 1: Reference Dependency Error');
    try {
      await userLibrary.operations.create({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        organizationId: 'org-123'
      });
    } catch (error) {
      console.log('❌ Expected Error:', error.message);
      console.log('   This shows the reference property, missing key type, and available registry keys');
    }

    // Example 2: Query with non-existent reference
    console.log('\n📝 Example 2: Query Reference Error');
    try {
      await userLibrary.operations.all({
        refs: {
          department: { kt: 'department', pk: 'dept-123' }
        }
      });
    } catch (error) {
      console.log('❌ Expected Error:', error.message);
      console.log('   This shows the model name, available columns, and the query that failed');
    }

    // Example 3: Event query with missing column
    console.log('\n📝 Example 3: Event Query Error');
    try {
      await userLibrary.operations.all({
        events: {
          activated: {
            start: new Date('2024-01-01'),
            by: 'admin'
          }
        }
      });
    } catch (error) {
      console.log('❌ Expected Error:', error.message);
      console.log('   This shows available columns and the event query details');
    }

    // Example 4: Location key error (for multi-level hierarchies)
    console.log('\n📝 Example 4: Location Key Error');
    try {
      await userLibrary.operations.all({}, ['user', 'invalidLocation']);
    } catch (error) {
      console.log('❌ Expected Error:', error.message);
      console.log('   This shows the model, key type array, and available associations');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n✨ Error Handling Example Complete');
  console.log('\n💡 Key Benefits of Improved Error Messages:');
  console.log('   • Show exact configuration that caused the error');
  console.log('   • List available options (columns, associations, registry keys)');
  console.log('   • Include model context and query details');
  console.log('   • Provide specific property and column information');
  console.log('   • Help identify missing dependencies quickly');
}

// Graceful error handling for the demo
async function runExample() {
  try {
    await demonstrateErrorHandling();
  } catch (error) {
    console.error('❌ Example failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runExample();
}

export { demonstrateErrorHandling };
