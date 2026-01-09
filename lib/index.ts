// Main lib exports - organized by layer to prevent circular dependencies

// Types layer (no dependencies)
export * from './types';

// Configuration layer (minimal dependencies)
export * from './config';

// Utilities layer (no business logic dependencies) - explicit exports to avoid ValidationError conflict
export * from './utils/formatting';
export * from './utils/constants';

// Export validation utilities with explicit names to avoid conflicts
export {
  isValidPhoneNumber,
  isValidPhoneNumber as isValidPhoneNumberUtil,
  formatPhoneNumber,
  displayPhoneNumber,
  isValidEmail as isValidEmailUtil,
  isValidUUID as isValidUUIDUtil,
  validateRequired,
  sanitizeString
} from './utils/validation';

// Export type validation with explicit names to avoid ValidationError conflict
export {
  ValidationError as TypeValidationError,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isValidDate,
  isValidUUID as isValidUUIDTypeUtil,
  isValidPhoneNumber as isValidPhoneNumberTypeUtil,
  isValidEmail as isValidEmailTypeUtil,
  isValidConversationStatus,
  isValidSenderType,
  isValidMessageType,
  isValidDeliveryStatus,
  isValidCampaignStatus,
  validateContact,
  validateConversation,
  validateMessage,
  validateCampaign,
  validateCreateContactRequest,
  validateCreateConversationRequest,
  validateCreateMessageRequest,
  validateCreateCampaignRequest,
  validateContactArray,
  validateConversationArray,
  validateMessageArray,
  validateCampaignArray
} from './utils/type-validation';

// Export response validation with explicit names to avoid conflicts
export {
  validateBaseApiResponse,
  validateApiSuccessResponse,
  validateApiErrorResponse,
  validateContactResponse,
  validateCreateContactResponse,
  validateConversationResponse,
  validateMessageResponse,
  validateCampaignResponse,
  ValidationError as ResponseValidationError
} from './utils/response-validation';

// Export API client utilities with explicit names to avoid conflicts
export {
  ApiClient,
  ApiClientError,
  createApiResponse,
  handleApiError,
  safeFetch,
  validateExternalApiResponse
} from './utils/api-client';

// Services layer (depends on types and config)
export {
  // Service registry for dependency injection
  serviceRegistry,
  
  // Base services
  AbstractBaseService,
  
  // Data services (CRUD operations)
  ContactsService,
  ConversationsService,
  CampaignsService,
  TriggersService,
  WorkflowExecutionsService,
  FollowUpRulesService,
  
  // Business services (complex workflows)
  ContactBusinessService,
  ConversationBusinessService,
  FollowUpBusinessService,
  
  // External services
  WhatsAppService,
  WhatsAppServiceError,
  createWhatsAppService,
  sendWhatsAppMessage,
  sendWelcomeMessage,
  sendTemplateMessage,
  markMessageAsRead,
  GeminiService,
  GeminiServiceError,
  extractBusinessCardFromText,
  extractBusinessCardFromImage,
  generateAIResponse,
  generateInstagramMessage,
  analyzeInstagramContent,
  detectIntent,
  InstagramService,
  InstagramServiceError,
  fetchInstagramPosts,
  storeInstagramPost,
  getBroadcastRules,
  getTargetContacts,
  matchesHashtagFilters,
  logBroadcast
} from './services';

// Hooks layer (depends on services, should be imported separately to avoid SSR issues)
export * from './hooks';
