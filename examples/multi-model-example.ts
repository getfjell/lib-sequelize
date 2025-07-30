/**
 * Multi-Model Example
 *
 * This example demonstrates working with multiple related Sequelize models
 * in a single library, including associations and complex queries.
 */

import { DataTypes, ModelStatic, Sequelize } from 'sequelize';
import { createRegistry } from '@fjell/registry';
import { createSequelizeLibrary } from '@fjell/lib-sequelize';
import { Item } from '@fjell/core';

// Initialize Sequelize with SQLite for this example
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

// Define interfaces
interface User extends Item<'user'> {
  id: string;
  name: string;
  email: string;
  profile?: UserProfile;
  settings?: UserSettings;
}

interface UserProfile extends Item<'userProfile'> {
  id: string;
  userId: string;
  bio: string;
  avatar?: string;
  user?: User;
}

interface UserSettings extends Item<'userSettings'> {
  id: string;
  userId: string;
  theme: 'light' | 'dark';
  notifications: boolean;
  user?: User;
}

// Define models
const UserModel = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false }
});

const UserProfileModel = sequelize.define('UserProfile', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false },
  bio: { type: DataTypes.TEXT, allowNull: false },
  avatar: { type: DataTypes.STRING, allowNull: true }
});

const UserSettingsModel = sequelize.define('UserSettings', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false },
  theme: { type: DataTypes.ENUM('light', 'dark'), defaultValue: 'light' },
  notifications: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Set up associations
UserModel.hasOne(UserProfileModel, { foreignKey: 'userId', as: 'profile' });
UserModel.hasOne(UserSettingsModel, { foreignKey: 'userId', as: 'settings' });
UserProfileModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
UserSettingsModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

async function multiModelExample() {
  console.log('🚀 Starting Multi-Model Example\n');

  // Sync database
  await sequelize.sync();

  // Create registry
  const registry = createRegistry();

  // Create user library with multiple models
  const userLibrary = createSequelizeLibrary<User, 'user'>(
    registry,
    { kta: ['user'] },
    [UserModel, UserProfileModel, UserSettingsModel] as ModelStatic<any>[],
    {
      hooks: {
        afterCreate: async (user: any) => {
          console.log(`🔄 Auto-creating profile and settings for ${user.name}`);

          // Automatically create profile and settings
          await UserProfileModel.create({
            userId: user.id,
            bio: `Hello, I'm ${user.name}!`,
            avatar: null
          });

          await UserSettingsModel.create({
            userId: user.id,
            theme: 'light',
            notifications: true
          });

          console.log(`✅ Profile and settings created for ${user.name}`);
          return user;
        }
      }
    }
  );

  // Register the library
  registry.register(userLibrary);
  console.log('👤 User library created with multiple models');
  console.log(`📋 Available models: ${userLibrary.models.map(m => m.name).join(', ')}`);

  // Create users (will auto-create profile and settings)
  console.log('\n📝 Creating users...');

  const alice = await userLibrary.operations.create({
    name: 'Alice Johnson',
    email: 'alice@example.com'
  });

  const bob = await userLibrary.operations.create({
    name: 'Bob Smith',
    email: 'bob@example.com'
  });

  // Verify related data was created
  console.log('\n🔍 Verifying related data...');

  const profileCount = await UserProfileModel.count();
  const settingsCount = await UserSettingsModel.count();
  console.log(`📊 Created ${profileCount} profiles and ${settingsCount} settings`);

  // Query with associations using raw Sequelize
  console.log('\n🔗 Querying with associations...');

  const usersWithAssociations = await UserModel.findAll({
    include: [
      { model: UserProfileModel, as: 'profile' },
      { model: UserSettingsModel, as: 'settings' }
    ]
  });

  usersWithAssociations.forEach((user: any) => {
    console.log(`👤 ${user.name}:`);
    console.log(`   📄 Bio: ${user.profile?.bio}`);
    console.log(`   🎨 Theme: ${user.settings?.theme}`);
    console.log(`   🔔 Notifications: ${user.settings?.notifications ? 'ON' : 'OFF'}`);
  });

  // Update related data
  console.log('\n✏️  Updating user profile...');

  const aliceProfile = await UserProfileModel.findOne({ where: { userId: alice.id } });
  if (aliceProfile) {
    await aliceProfile.update({
      bio: 'Senior Software Engineer with 5+ years experience',
      avatar: 'https://example.com/alice-avatar.jpg'
    });
    console.log(`✅ Updated Alice's profile`);
  }

  // Update user settings
  const bobSettings = await UserSettingsModel.findOne({ where: { userId: bob.id } });
  if (bobSettings) {
    await bobSettings.update({
      theme: 'dark',
      notifications: false
    });
    console.log(`✅ Updated Bob's settings to dark theme, notifications off`);
  }

  // Advanced queries across models
  console.log('\n📊 Advanced multi-model queries...');

  // Find users with dark theme
  const darkThemeUsers = await UserModel.findAll({
    include: [{
      model: UserSettingsModel,
      as: 'settings',
      where: { theme: 'dark' }
    }]
  });
  console.log(`🌙 Users with dark theme: ${darkThemeUsers.map((u: any) => u.name).join(', ')}`);

  // Find users with notifications enabled
  const notificationUsers = await UserModel.findAll({
    include: [{
      model: UserSettingsModel,
      as: 'settings',
      where: { notifications: true }
    }]
  });
  console.log(`🔔 Users with notifications: ${notificationUsers.map((u: any) => u.name).join(', ')}`);

  // Cleanup - remove a user and related data
  console.log('\n🗑️  Testing cascaded deletion...');

  await UserModel.destroy({ where: { id: alice.id } });

  // Note: In a real app, you'd set up cascading deletes in your model associations
  await UserProfileModel.destroy({ where: { userId: alice.id } });
  await UserSettingsModel.destroy({ where: { userId: alice.id } });

  const remainingUsers = await UserModel.count();
  const remainingProfiles = await UserProfileModel.count();
  const remainingSettings = await UserSettingsModel.count();

  console.log(`📊 Remaining: ${remainingUsers} users, ${remainingProfiles} profiles, ${remainingSettings} settings`);

  console.log('\n✨ Multi-Model Example Complete');
  console.log('\n💡 Key Multi-Model Features:');
  console.log('   • Multiple related models in a single library');
  console.log('   • Automatic related data creation via hooks');
  console.log('   • Complex queries across model associations');
  console.log('   • Proper data relationships and integrity');
}

// Graceful error handling for the demo
async function runExample() {
  try {
    await multiModelExample();
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

export { multiModelExample };
