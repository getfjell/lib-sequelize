/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Reference Handling Example
 *
 * This example demonstrates how to set up and work with references
 * between different libraries, including proper error handling.
 */

import { DataTypes, ModelStatic, Sequelize } from 'sequelize';
import { createRegistry } from '@fjell/registry';
import { createSequelizeLibrary } from '@fjell/lib-sequelize';
import { Item } from '@fjell/core';

// Initialize Sequelize with SQLite for this example
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

// Define interfaces
interface Organization extends Item<'organization'> {
  id: string;
  name: string;
  domain: string;
}

interface User extends Item<'user'> {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organization?: Organization; // Populated by reference
}

// Define models
const OrganizationModel = sequelize.define('Organization', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  domain: { type: DataTypes.STRING, unique: true, allowNull: false }
});

const UserModel = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: false }
});

// Set up associations
UserModel.belongsTo(OrganizationModel, { foreignKey: 'organizationId', as: 'organization' });
OrganizationModel.hasMany(UserModel, { foreignKey: 'organizationId', as: 'users' });

async function referenceExample() {
  console.log('🚀 Starting Reference Handling Example\n');

  // Sync database
  await sequelize.sync();

  // Create registry
  const registry = createRegistry();

  // Create organization library first (dependency)
  const organizationLibrary = createSequelizeLibrary<Organization, 'organization'>(
    registry,
    { kta: ['organization'] },
    [OrganizationModel as ModelStatic<any>],
    {}
  );

  // Register organization library
  registry.register(organizationLibrary);
  console.log('🏢 Organization library created and registered');

  // Create user library with reference to organization
  const userLibrary = createSequelizeLibrary<User, 'user'>(
    registry,
    { kta: ['user'] },
    [UserModel as ModelStatic<any>],
    {
      references: [{
        property: 'organization',
        column: 'organizationId',
        kta: ['organization']
      }]
    }
  );

  // Register user library
  registry.register(userLibrary);
  console.log('👤 User library created and registered with organization reference');

  // Create test data
  console.log('\n📝 Creating test data...');

  // Create organizations
  const acmeCorp = await organizationLibrary.operations.create({
    name: 'ACME Corporation',
    domain: 'acme.com'
  });

  const techCorp = await organizationLibrary.operations.create({
    name: 'Tech Corp',
    domain: 'techcorp.com'
  });

  console.log(`🏢 Created organizations: ${acmeCorp.name}, ${techCorp.name}`);

  // Create users with organization references
  const alice = await userLibrary.operations.create({
    name: 'Alice Johnson',
    email: 'alice@acme.com',
    organizationId: acmeCorp.id
  });

  const bob = await userLibrary.operations.create({
    name: 'Bob Smith',
    email: 'bob@techcorp.com',
    organizationId: techCorp.id
  });

  console.log(`👤 Created users: ${alice.name}, ${bob.name}`);

  // Fetch user with populated organization reference
  console.log('\n🔍 Fetching user with organization reference...');
  const userWithOrg = await userLibrary.operations.get({ kt: 'user', pk: alice.id });

  if (userWithOrg.organization) {
    console.log(`✅ User: ${userWithOrg.name} works at ${userWithOrg.organization.name} (${userWithOrg.organization.domain})`);
  } else {
    console.log(`⚠️  Organization reference not populated for ${userWithOrg.name}`);
  }

  // Query users by organization reference
  console.log('\n📊 Querying users by organization reference...');
  const acmeUsers = await userLibrary.operations.all({
    refs: {
      organization: { kt: 'organization', pk: acmeCorp.id }
    }
  });

  console.log(`🏢 ACME users: ${acmeUsers.map(u => u.name).join(', ')}`);

  // Demonstrate reference error handling
  console.log('\n❌ Demonstrating reference error handling...');

  try {
    // Try to query with invalid reference key
    await userLibrary.operations.all({
      refs: {
        department: { kt: 'department', pk: 'dept-123' } // This will fail
      }
    });
  } catch (error) {
    console.log('🚨 Expected reference error:', error.message.split('.')[0] + '...');
    console.log('   Error shows: model name, available columns, and reference details');
  }

  try {
    // Try to create user with non-existent organization
    await userLibrary.operations.create({
      name: 'Charlie Brown',
      email: 'charlie@nowhere.com',
      organizationId: 'non-existent-org-id'
    });
  } catch (error) {
    console.log('🚨 Expected constraint error - organization not found');
  }

  console.log('\n✨ Reference Handling Example Complete');
  console.log('\n💡 Key Reference Features:');
  console.log('   • Automatic reference resolution when fetching data');
  console.log('   • Query by reference relationships');
  console.log('   • Clear error messages for reference configuration issues');
  console.log('   • Foreign key constraint validation');
}

// Graceful error handling for the demo
async function runExample() {
  try {
    await referenceExample();
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

export { referenceExample };
