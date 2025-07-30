/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Location-Based Data Example
 *
 * This example demonstrates organizing data with location hierarchies
 * and contained items using fjell's location system.
 */

import { DataTypes, ModelStatic, Sequelize } from 'sequelize';
import { createRegistry } from '@fjell/registry';
import { createSequelizeLibrary } from '@fjell/lib-sequelize';
import { Item } from '@fjell/core';

// Initialize Sequelize with SQLite for this example
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

// Define interfaces with location hierarchies
interface Department extends Item<'department', 'country', 'region'> {
  id: string;
  name: string;
  code: string;
  countryId: string;
  regionId: string;
  country?: Country;
  region?: Region;
}

interface Country extends Item<'country'> {
  id: string;
  name: string;
  code: string;
}

interface Region extends Item<'region', 'country'> {
  id: string;
  name: string;
  countryId: string;
  country?: Country;
}

interface Employee extends Item<'employee', 'department', 'region', 'country'> {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  department?: Department;
}

// Define models
const CountryModel = sequelize.define('Country', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING(2), unique: true, allowNull: false }
});

const RegionModel = sequelize.define('Region', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  countryId: { type: DataTypes.UUID, allowNull: false }
});

const DepartmentModel = sequelize.define('Department', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  countryId: { type: DataTypes.UUID, allowNull: false },
  regionId: { type: DataTypes.UUID, allowNull: false }
});

const EmployeeModel = sequelize.define('Employee', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  departmentId: { type: DataTypes.UUID, allowNull: false }
});

// Set up associations
CountryModel.hasMany(RegionModel, { foreignKey: 'countryId', as: 'regions' });
RegionModel.belongsTo(CountryModel, { foreignKey: 'countryId', as: 'country' });

CountryModel.hasMany(DepartmentModel, { foreignKey: 'countryId', as: 'departments' });
RegionModel.hasMany(DepartmentModel, { foreignKey: 'regionId', as: 'departments' });
DepartmentModel.belongsTo(CountryModel, { foreignKey: 'countryId', as: 'country' });
DepartmentModel.belongsTo(RegionModel, { foreignKey: 'regionId', as: 'region' });

DepartmentModel.hasMany(EmployeeModel, { foreignKey: 'departmentId', as: 'employees' });
EmployeeModel.belongsTo(DepartmentModel, { foreignKey: 'departmentId', as: 'department' });

async function locationExample() {
  console.log('🚀 Starting Location-Based Data Example\n');

  // Sync database
  await sequelize.sync();

  // Create registry
  const registry = createRegistry();

  // Create libraries for each level of the hierarchy
  const countryLibrary = createSequelizeLibrary<Country, 'country'>(
    registry,
    { kta: ['country'] },
    [CountryModel as ModelStatic<any>],
    {}
  );

  const regionLibrary = createSequelizeLibrary<Region, 'region', 'country'>(
    registry,
    { kta: ['region', 'country'] },
    [RegionModel as ModelStatic<any>],
    {
      references: [{
        property: 'country',
        column: 'countryId',
        kta: ['country']
      }]
    }
  );

  const departmentLibrary = createSequelizeLibrary<Department, 'department', 'country', 'region'>(
    registry,
    { kta: ['department', 'country', 'region'] },
    [DepartmentModel as ModelStatic<any>],
    {
      references: [
        {
          property: 'country',
          column: 'countryId',
          kta: ['country']
        },
        {
          property: 'region',
          column: 'regionId',
          kta: ['region']
        }
      ]
    }
  );

  const employeeLibrary = createSequelizeLibrary<Employee, 'employee', 'department', 'region', 'country'>(
    registry,
    { kta: ['employee', 'department', 'region', 'country'] },
    [EmployeeModel as ModelStatic<any>],
    {
      references: [{
        property: 'department',
        column: 'departmentId',
        kta: ['department']
      }]
    }
  );

  // Register all libraries
  registry.register(countryLibrary);
  registry.register(regionLibrary);
  registry.register(departmentLibrary);
  registry.register(employeeLibrary);

  console.log('🌍 All location-based libraries created and registered');
  console.log('📊 Hierarchy: Country → Region → Department → Employee');

  // Create hierarchical test data
  console.log('\n📝 Creating hierarchical data...');

  // Create countries
  const usa = await countryLibrary.operations.create({
    name: 'United States',
    code: 'US'
  });

  const canada = await countryLibrary.operations.create({
    name: 'Canada',
    code: 'CA'
  });

  console.log(`🇺🇸 Created countries: ${usa.name}, ${canada.name}`);

  // Create regions
  const westCoast = await regionLibrary.operations.create({
    name: 'West Coast',
    countryId: usa.id
  });

  const eastCoast = await regionLibrary.operations.create({
    name: 'East Coast',
    countryId: usa.id
  });

  const ontario = await regionLibrary.operations.create({
    name: 'Ontario',
    countryId: canada.id
  });

  console.log(`🗺️  Created regions: ${westCoast.name}, ${eastCoast.name}, ${ontario.name}`);

  // Create departments
  const engineering = await departmentLibrary.operations.create({
    name: 'Engineering',
    code: 'ENG',
    countryId: usa.id,
    regionId: westCoast.id
  });

  const sales = await departmentLibrary.operations.create({
    name: 'Sales',
    code: 'SALES',
    countryId: usa.id,
    regionId: eastCoast.id
  });

  const support = await departmentLibrary.operations.create({
    name: 'Customer Support',
    code: 'SUPP',
    countryId: canada.id,
    regionId: ontario.id
  });

  console.log(`🏢 Created departments: ${engineering.name}, ${sales.name}, ${support.name}`);

  // Create employees
  const alice = await employeeLibrary.operations.create({
    name: 'Alice Johnson',
    email: 'alice@company.com',
    departmentId: engineering.id
  });

  const bob = await employeeLibrary.operations.create({
    name: 'Bob Smith',
    email: 'bob@company.com',
    departmentId: sales.id
  });

  const charlie = await employeeLibrary.operations.create({
    name: 'Charlie Brown',
    email: 'charlie@company.com',
    departmentId: support.id
  });

  console.log(`👥 Created employees: ${alice.name}, ${bob.name}, ${charlie.name}`);

  // Query by location hierarchy
  console.log('\n🔍 Querying by location hierarchy...');

  // Get all employees in USA
  try {
    console.log('📍 Querying employees in USA...');
    // Note: This would require proper location key handling in the library
    // For demonstration, we'll use direct model queries

    const usaDepartments = await DepartmentModel.findAll({
      where: { countryId: usa.id }
    });

    const usaDeptIds = usaDepartments.map((dept: any) => dept.id);
    const usaEmployees = await EmployeeModel.findAll({
      where: { departmentId: usaDeptIds },
      include: [{ model: DepartmentModel, as: 'department' }]
    });

    console.log(`🇺🇸 USA employees: ${usaEmployees.map((emp: any) => `${emp.name} (${emp.department.name})`).join(', ')}`);

  } catch (error) {
    console.log('⚠️  Location-based queries require additional location key configuration');
  }

  // Query employees by department with full hierarchy
  console.log('\n🔗 Querying with full hierarchy...');

  const employeesWithHierarchy = await EmployeeModel.findAll({
    include: [{
      model: DepartmentModel,
      as: 'department',
      include: [
        { model: CountryModel, as: 'country' },
        { model: RegionModel, as: 'region' }
      ]
    }]
  });

  employeesWithHierarchy.forEach((emp: any) => {
    console.log(`👤 ${emp.name}:`);
    console.log(`   🏢 Department: ${emp.department.name} (${emp.department.code})`);
    console.log(`   🗺️  Region: ${emp.department.region?.name}`);
    console.log(`   🌍 Country: ${emp.department.country?.name}`);
  });

  // Demonstrate location-based aggregations
  console.log('\n📊 Location-based statistics...');

  const stats = {
    totalCountries: await CountryModel.count(),
    totalRegions: await RegionModel.count(),
    totalDepartments: await DepartmentModel.count(),
    totalEmployees: await EmployeeModel.count()
  };

  console.log('📈 Statistics:');
  console.log(`   Countries: ${stats.totalCountries}`);
  console.log(`   Regions: ${stats.totalRegions}`);
  console.log(`   Departments: ${stats.totalDepartments}`);
  console.log(`   Employees: ${stats.totalEmployees}`);

  // Show employees by region
  const regionStats = await RegionModel.findAll({
    include: [{
      model: DepartmentModel,
      as: 'departments',
      include: [{
        model: EmployeeModel,
        as: 'employees'
      }]
    }]
  });

  console.log('\n🗺️  Employees by region:');
  regionStats.forEach((region: any) => {
    const employeeCount = region.departments.reduce((total: number, dept: any) =>
      total + dept.employees.length, 0
    );
    console.log(`   ${region.name}: ${employeeCount} employees`);
  });

  console.log('\n✨ Location-Based Data Example Complete');
  console.log('\n💡 Key Location Features:');
  console.log('   • Hierarchical data organization');
  console.log('   • Location-aware queries and filtering');
  console.log('   • Multi-level relationships and references');
  console.log('   • Geographic and organizational structure support');
}

// Graceful error handling for the demo
async function runExample() {
  try {
    await locationExample();
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

export { locationExample };
