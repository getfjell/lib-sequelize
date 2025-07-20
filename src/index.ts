export * from './Definition';
export * from './Instance';
export * from './InstanceFactory';
export * from './Options';
export * from './Operations';
export * from './Registry';
export * as Contained from './contained';
export * as Primary from './primary';

// Export sequelize-specific coordinate functionality
export { createCoordinate, SCOPE_SEQUELIZE } from './Coordinate';
export type { Coordinate } from './Coordinate';
