// Service exports - organized by layer
export * from './base';

// Data access services
export * from './contacts';
export * from './campaigns';
export * from './external';

// Service registry (provides dependency injection)
export * from './ServiceRegistry';