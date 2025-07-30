/**
 * Basic Integration Example
 *
 * This example shows the basic setup and usage of @fjell/lib-sequelize
 * with a simple User model.
 */

import { DataTypes, ModelStatic, Sequelize } from 'sequelize';
import { createRegistry } from '@fjell/registry';
import { createSequelizeLibrary } from '@fjell/lib-sequelize';
import { Item } from '@fjell/core';

// Initialize Sequelize with SQLite for this example
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

// Define User interface
interface User extends Item<'user'> {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

// Define User model
const UserModel = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
});

async function basicIntegrationExample() {
  console.log('🚀 Starting Basic Integration Example\n');

  // Sync database
  await sequelize.sync();

  // Create registry
  const registry = createRegistry();

  // Create user library
  const userLibrary = createSequelizeLibrary<User, 'user'>(
    registry,
    { kta: ['user'] },
    [UserModel as ModelStatic<any>],
    {
      validators: {
        email: (email: string) => email.includes('@')
      },
      hooks: {
        beforeCreate: async (user: any) => {
          console.log(`🔄 Creating user: ${user.name}`);
          return user;
        },
        afterCreate: async (user: any) => {
          console.log(`✅ User created with ID: ${user.id}`);
          return user;
        }
      }
    }
  );

  // Register the library
  registry.register(userLibrary);

  console.log('📚 User library created and registered');

  // Create some users
  console.log('\n📝 Creating users...');

  const alice = await userLibrary.operations.create({
    name: 'Alice Johnson',
    email: 'alice@example.com',
    status: 'active'
  });

  const bob = await userLibrary.operations.create({
    name: 'Bob Smith',
    email: 'bob@example.com',
    status: 'active'
  });

  const charlie = await userLibrary.operations.create({
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    status: 'inactive'
  });

  // Query users
  console.log('\n🔍 Querying users...');

  // Get all users
  const allUsers = await userLibrary.operations.all({});
  console.log(`📊 Total users: ${allUsers.length}`);

  // Find active users
  const activeUsers = await userLibrary.operations.all({
    filter: { status: 'active' }
  });
  console.log(`🟢 Active users: ${activeUsers.length}`);

  // Get specific user
  const foundUser = await userLibrary.operations.get({ kt: 'user', pk: alice.id });
  console.log(`👤 Found user: ${foundUser.name} (${foundUser.email})`);

  // Update user
  console.log('\n✏️  Updating user...');
  const updatedUser = await userLibrary.operations.update(
    { kt: 'user', pk: bob.id },
    { status: 'inactive' }
  );
  console.log(`🔄 Updated ${updatedUser.name} status to: ${updatedUser.status}`);

  // Advanced query with sorting and limiting
  console.log('\n📈 Advanced query...');
  const recentUsers = await userLibrary.operations.all({
    sort: { createdAt: -1 },
    limit: 2
  });
  console.log(`📅 Most recent users: ${recentUsers.map(u => u.name).join(', ')}`);

  // Access Sequelize-specific features
  console.log('\n🔧 Sequelize-specific features:');
  console.log(`📋 Available models: ${userLibrary.models.map(m => m.name).join(', ')}`);

  console.log('\n✨ Basic Integration Example Complete');
}

// Graceful error handling for the demo
async function runExample() {
  try {
    await basicIntegrationExample();
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

export { basicIntegrationExample };
