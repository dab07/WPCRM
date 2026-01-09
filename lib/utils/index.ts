// Utility function exports
export * from './formatting';
export * from './constants';

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
} from './validation';

export * from './type-validation';

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
} from './response-validation';

// Export API client utilities with explicit names to avoid conflicts
export {
  ApiClient,
  ApiClientError,
  createApiResponse,
  handleApiError,
  safeFetch,
  validateExternalApiResponse
} from './api-client';