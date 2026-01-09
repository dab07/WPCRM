// Service exports - organized by layer
export * from './base';

// Data access services
export * from './contacts';
export * from './conversations';
export * from './campaigns';
export * from './external';
export * from './workflows';
export * from './triggers';
export * from './automation';

// Service registry (provides dependency injection)
export * from './ServiceRegistry';