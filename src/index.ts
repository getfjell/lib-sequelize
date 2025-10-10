export * from './Definition';
export * from './SequelizeLibrary';
export * from './SequelizeLibraryFactory';
export * from './Options';
export * from './Operations';
export * from './Registry';
export * as Contained from './contained';
export * as Primary from './primary';

// Export sequelize-specific coordinate functionality
export { createCoordinate, SCOPE_SEQUELIZE } from './Coordinate';
export type { Coordinate } from './Coordinate';

// Export Sequelize-specific reference handling
export * from './processing/ReferenceBuilder';
