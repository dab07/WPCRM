// Main type exports
export * from './api';
export * from './ui';

// Export services types with explicit names to avoid conflicts
export type {
  BaseService,
  ServiceError,
  PaginatedResponse as ServicePaginatedResponse,
  QueryOptions
} from './services';

// Export external types with explicit names to avoid conflicts  
export type {
  WhatsAppBusinessApiConfig,
  WhatsAppMessage,
  WhatsAppWebhookEntry,
  WhatsAppWebhookPayload,
  N8nWorkflowExecution,
  N8nWorkflow,
  N8nNode
} from './external';