// API response validation utilities
import { 
  ValidationError as TypeValidationError,
  validateContact,
  validateConversation,
  validateMessage,
  validateCampaign,
  validateContactArray,
  validateConversationArray,
  validateMessageArray,
  validateCampaignArray,
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray
} from './type-validation';

import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  BaseApiResponse,
  PaginatedResponse,
  ContactResponse,
  ContactListResponse,
  CreateContactResponse,
  ConversationResponse,
  ConversationListResponse,
  MessageResponse,
  MessageListResponse,
  SendMessageResponse,
  CampaignResponse,
  CampaignListResponse,
  CampaignExecutionResponse,
  WhatsAppApiResponse,
  GeminiApiResponse,
  N8nApiResponse,
  SupabaseResponse,
  HealthCheckResponse,
  MetricsResponse
} from '../types/api/responses';

// Re-export ValidationError for convenience
export { ValidationError } from './type-validation';

// Base response validation
export const validateBaseApiResponse = (data: unknown): BaseApiResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('Response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isBoolean(response.success)) {
    throw new TypeValidationError('Response must have a boolean success field');
  }

  if (response.message !== undefined && response.message !== null && !isString(response.message)) {
    throw new TypeValidationError('Message must be a string');
  }

  if (response.error !== undefined && response.error !== null && !isString(response.error)) {
    throw new TypeValidationError('Error must be a string');
  }

  return {
    success: response.success as boolean,
    ...(response.message && { message: response.message as string }),
    ...(response.error && { error: response.error as string })
  };
};

export const validateApiSuccessResponse = <T>(
  data: unknown,
  dataValidator?: (data: unknown) => T
): ApiSuccessResponse<T> => {
  const baseResponse = validateBaseApiResponse(data);
  
  if (!baseResponse.success) {
    throw new TypeValidationError('Expected success response but got failure');
  }

  const response = data as Record<string, unknown>;

  if (!('data' in response)) {
    throw new TypeValidationError('Success response must have data field');
  }

  let validatedData: T;
  if (dataValidator) {
    validatedData = dataValidator(response.data);
  } else {
    validatedData = response.data as T;
  }

  return {
    success: true,
    data: validatedData,
    ...(baseResponse.message && { message: baseResponse.message })
  };
};

export const validateApiErrorResponse = (data: unknown): ApiErrorResponse => {
  const baseResponse = validateBaseApiResponse(data);
  
  if (baseResponse.success) {
    throw new TypeValidationError('Expected error response but got success');
  }

  const response = data as Record<string, unknown>;

  if (!isString(response.error)) {
    throw new TypeValidationError('Error response must have error message');
  }

  const result: ApiErrorResponse = {
    success: false,
    error: response.error
  };

  // Only add details if it exists and is a valid object
  if (response.details && isObject(response.details)) {
    result.details = response.details as Record<string, unknown>;
  }

  return result;
};

// Pagination validation
export const validatePaginatedResponse = <T>(
  data: unknown,
  itemValidator: (data: unknown) => T[]
): PaginatedResponse<T> => {
  if (!isObject(data)) {
    throw new TypeValidationError('Paginated response must be an object');
  }

  const response = data as Record<string, unknown>;

  const validatedData = itemValidator(response.data);

  if (!isObject(response.pagination)) {
    throw new TypeValidationError('Paginated response must have pagination object');
  }

  const pagination = response.pagination as Record<string, unknown>;

  if (!isNumber(pagination.page) || pagination.page < 1) {
    throw new TypeValidationError('Page must be a positive number');
  }

  if (!isNumber(pagination.limit) || pagination.limit < 1) {
    throw new TypeValidationError('Limit must be a positive number');
  }

  if (!isNumber(pagination.total) || pagination.total < 0) {
    throw new TypeValidationError('Total must be a non-negative number');
  }

  if (!isNumber(pagination.totalPages) || pagination.totalPages < 0) {
    throw new TypeValidationError('Total pages must be a non-negative number');
  }

  if (!isBoolean(pagination.hasNext)) {
    throw new TypeValidationError('HasNext must be a boolean');
  }

  if (!isBoolean(pagination.hasPrev)) {
    throw new TypeValidationError('HasPrev must be a boolean');
  }

  return {
    data: validatedData,
    pagination: {
      page: pagination.page as number,
      limit: pagination.limit as number,
      total: pagination.total as number,
      totalPages: pagination.totalPages as number,
      hasNext: pagination.hasNext as boolean,
      hasPrev: pagination.hasPrev as boolean
    }
  };
};

// Contact response validators
export const validateContactResponse = (data: unknown): ContactResponse => {
  return validateApiSuccessResponse(data, validateContact);
};

export const validateContactListResponse = (data: unknown): ContactListResponse => {
  return validateApiSuccessResponse(data, validateContactArray);
};

export const validateCreateContactResponse = (data: unknown): CreateContactResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('Create contact response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isBoolean(response.success)) {
    throw new TypeValidationError('Response must have a boolean success field');
  }

  if (!isString(response.message)) {
    throw new TypeValidationError('Response must have a message string');
  }

  if (response.contact !== undefined && response.contact !== null) {
    validateContact(response.contact);
  }

  if (response.messageId !== undefined && response.messageId !== null && !isString(response.messageId)) {
    throw new TypeValidationError('Message ID must be a string');
  }

  if (response.conversationId !== undefined && response.conversationId !== null && !isString(response.conversationId)) {
    throw new TypeValidationError('Conversation ID must be a string');
  }

  if (response.warning !== undefined && response.warning !== null && !isString(response.warning)) {
    throw new TypeValidationError('Warning must be a string');
  }

  if (response.error !== undefined && response.error !== null && !isString(response.error)) {
    throw new TypeValidationError('Error must be a string');
  }

  const result: CreateContactResponse = {
    success: response.success as boolean,
    message: response.message as string
  };

  // Only add optional properties if they exist
  if (response.contact) {
    result.contact = response.contact as any;
  }

  if (response.messageId && isString(response.messageId)) {
    result.messageId = response.messageId;
  }

  if (response.conversationId && isString(response.conversationId)) {
    result.conversationId = response.conversationId;
  }

  if (response.warning && isString(response.warning)) {
    result.warning = response.warning;
  }

  if (response.error && isString(response.error)) {
    result.error = response.error;
  }

  return result;
};

// Conversation response validators
export const validateConversationResponse = (data: unknown): ConversationResponse => {
  return validateApiSuccessResponse(data, validateConversation);
};

export const validateConversationListResponse = (data: unknown): ConversationListResponse => {
  return validateApiSuccessResponse(data, validateConversationArray);
};

// Message response validators
export const validateMessageResponse = (data: unknown): MessageResponse => {
  return validateApiSuccessResponse(data, validateMessage);
};

export const validateMessageListResponse = (data: unknown): MessageListResponse => {
  return validateApiSuccessResponse(data, validateMessageArray);
};

export const validateSendMessageResponse = (data: unknown): SendMessageResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('Send message response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isBoolean(response.success)) {
    throw new TypeValidationError('Response must have a boolean success field');
  }

  if (!isString(response.message)) {
    throw new TypeValidationError('Response must have a message string');
  }

  if (response.messageId !== undefined && response.messageId !== null && !isString(response.messageId)) {
    throw new TypeValidationError('Message ID must be a string');
  }

  if (response.deliveryStatus !== undefined && response.deliveryStatus !== null && !isString(response.deliveryStatus)) {
    throw new TypeValidationError('Delivery status must be a string');
  }

  const result: SendMessageResponse = {
    success: response.success as boolean,
    message: response.message as string
  };

  // Only add optional properties if they exist
  if (response.messageId && isString(response.messageId)) {
    result.messageId = response.messageId;
  }

  if (response.deliveryStatus && isString(response.deliveryStatus)) {
    result.deliveryStatus = response.deliveryStatus;
  }

  return result;
};

// Campaign response validators
export const validateCampaignResponse = (data: unknown): CampaignResponse => {
  return validateApiSuccessResponse(data, validateCampaign);
};

export const validateCampaignListResponse = (data: unknown): CampaignListResponse => {
  return validateApiSuccessResponse(data, validateCampaignArray);
};

export const validateCampaignExecutionResponse = (data: unknown): CampaignExecutionResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('Campaign execution response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isBoolean(response.success)) {
    throw new TypeValidationError('Response must have a boolean success field');
  }

  if (!isString(response.message)) {
    throw new TypeValidationError('Response must have a message string');
  }

  if (response.sentCount !== undefined && response.sentCount !== null && !isNumber(response.sentCount)) {
    throw new TypeValidationError('Sent count must be a number');
  }

  if (response.failedCount !== undefined && response.failedCount !== null && !isNumber(response.failedCount)) {
    throw new TypeValidationError('Failed count must be a number');
  }

  if (response.totalRecipients !== undefined && response.totalRecipients !== null && !isNumber(response.totalRecipients)) {
    throw new TypeValidationError('Total recipients must be a number');
  }

  if (response.campaignId !== undefined && response.campaignId !== null && !isString(response.campaignId)) {
    throw new TypeValidationError('Campaign ID must be a string');
  }

  if (response.campaignName !== undefined && response.campaignName !== null && !isString(response.campaignName)) {
    throw new TypeValidationError('Campaign name must be a string');
  }

  const result: CampaignExecutionResponse = {
    success: response.success as boolean,
    message: response.message as string
  };

  // Only add optional properties if they exist
  if (response.sentCount !== undefined && response.sentCount !== null && isNumber(response.sentCount)) {
    result.sentCount = response.sentCount;
  }

  if (response.failedCount !== undefined && response.failedCount !== null && isNumber(response.failedCount)) {
    result.failedCount = response.failedCount;
  }

  if (response.totalRecipients !== undefined && response.totalRecipients !== null && isNumber(response.totalRecipients)) {
    result.totalRecipients = response.totalRecipients;
  }

  if (response.campaignId && isString(response.campaignId)) {
    result.campaignId = response.campaignId;
  }

  if (response.campaignName && isString(response.campaignName)) {
    result.campaignName = response.campaignName;
  }

  return result;
};

// External service response validators
export const validateWhatsAppApiResponse = (data: unknown): WhatsAppApiResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('WhatsApp API response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isString(response.messaging_product)) {
    throw new TypeValidationError('Messaging product must be a string');
  }

  if (response.contacts !== undefined && response.contacts !== null) {
    if (!isArray(response.contacts)) {
      throw new TypeValidationError('Contacts must be an array');
    }
    
    for (const contact of response.contacts) {
      if (!isObject(contact)) {
        throw new TypeValidationError('Contact must be an object');
      }
      const contactObj = contact as Record<string, unknown>;
      if (!isString(contactObj.input) || !isString(contactObj.wa_id)) {
        throw new TypeValidationError('Contact must have input and wa_id strings');
      }
    }
  }

  if (response.messages !== undefined && response.messages !== null) {
    if (!isArray(response.messages)) {
      throw new TypeValidationError('Messages must be an array');
    }
    
    for (const message of response.messages) {
      if (!isObject(message)) {
        throw new TypeValidationError('Message must be an object');
      }
      const messageObj = message as Record<string, unknown>;
      if (!isString(messageObj.id)) {
        throw new TypeValidationError('Message must have id string');
      }
      if (messageObj.message_status !== undefined && messageObj.message_status !== null && !isString(messageObj.message_status)) {
        throw new TypeValidationError('Message status must be a string');
      }
    }
  }

  const result: WhatsAppApiResponse = {
    messaging_product: response.messaging_product as string
  };

  // Only add optional properties if they exist
  if (response.contacts && isArray(response.contacts)) {
    result.contacts = response.contacts as Array<{
      input: string;
      wa_id: string;
    }>;
  }

  if (response.messages && isArray(response.messages)) {
    result.messages = response.messages as Array<{
      id: string;
      message_status?: string;
    }>;
  }

  return result;
};

export const validateGeminiApiResponse = (data: unknown): GeminiApiResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('Gemini API response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isArray(response.candidates)) {
    throw new TypeValidationError('Candidates must be an array');
  }

  for (const candidate of response.candidates) {
    if (!isObject(candidate)) {
      throw new TypeValidationError('Candidate must be an object');
    }
    
    const candidateObj = candidate as Record<string, unknown>;
    
    if (!isObject(candidateObj.content)) {
      throw new TypeValidationError('Candidate content must be an object');
    }
    
    const content = candidateObj.content as Record<string, unknown>;
    if (!isArray(content.parts)) {
      throw new TypeValidationError('Content parts must be an array');
    }
    
    for (const part of content.parts) {
      if (!isObject(part)) {
        throw new TypeValidationError('Part must be an object');
      }
      const partObj = part as Record<string, unknown>;
      if (!isString(partObj.text)) {
        throw new TypeValidationError('Part text must be a string');
      }
    }
    
    if (!isString(candidateObj.finishReason)) {
      throw new TypeValidationError('Finish reason must be a string');
    }
    
    if (!isNumber(candidateObj.index)) {
      throw new TypeValidationError('Index must be a number');
    }
  }

  if (response.usageMetadata !== undefined && response.usageMetadata !== null) {
    if (!isObject(response.usageMetadata)) {
      throw new TypeValidationError('Usage metadata must be an object');
    }
    
    const metadata = response.usageMetadata as Record<string, unknown>;
    if (metadata.promptTokenCount !== undefined && !isNumber(metadata.promptTokenCount)) {
      throw new TypeValidationError('Prompt token count must be a number');
    }
    if (metadata.candidatesTokenCount !== undefined && !isNumber(metadata.candidatesTokenCount)) {
      throw new TypeValidationError('Candidates token count must be a number');
    }
    if (metadata.totalTokenCount !== undefined && !isNumber(metadata.totalTokenCount)) {
      throw new TypeValidationError('Total token count must be a number');
    }
  }

  const result: GeminiApiResponse = {
    candidates: response.candidates as Array<{
      content: {
        parts: Array<{
          text: string;
        }>;
      };
      finishReason: string;
      index: number;
    }>
  };

  // Only add optional properties if they exist
  if (response.usageMetadata && isObject(response.usageMetadata)) {
    const metadata = response.usageMetadata as Record<string, unknown>;
    
    // Only add usageMetadata if all required properties are present
    if (isNumber(metadata.promptTokenCount) && 
        isNumber(metadata.candidatesTokenCount) && 
        isNumber(metadata.totalTokenCount)) {
      result.usageMetadata = {
        promptTokenCount: metadata.promptTokenCount,
        candidatesTokenCount: metadata.candidatesTokenCount,
        totalTokenCount: metadata.totalTokenCount
      };
    }
  }

  return result;
};

export const validateN8nApiResponse = (data: unknown): N8nApiResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('N8N API response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (response.success !== undefined && response.success !== null && !isBoolean(response.success)) {
    throw new TypeValidationError('Success must be a boolean');
  }

  if (response.error !== undefined && response.error !== null && !isString(response.error)) {
    throw new TypeValidationError('Error must be a string');
  }

  if (response.executionId !== undefined && response.executionId !== null && !isString(response.executionId)) {
    throw new TypeValidationError('Execution ID must be a string');
  }

  if (response.finished !== undefined && response.finished !== null && !isBoolean(response.finished)) {
    throw new TypeValidationError('Finished must be a boolean');
  }

  const result: N8nApiResponse = {};

  // Only add properties if they exist
  if (response.data !== undefined) {
    result.data = response.data;
  }

  if (response.success !== undefined && response.success !== null && isBoolean(response.success)) {
    result.success = response.success;
  }

  if (response.error && isString(response.error)) {
    result.error = response.error;
  }

  if (response.executionId && isString(response.executionId)) {
    result.executionId = response.executionId;
  }

  if (response.finished !== undefined && response.finished !== null && isBoolean(response.finished)) {
    result.finished = response.finished;
  }

  return result;
};

export const validateSupabaseResponse = <T>(
  data: unknown,
  dataValidator?: (data: unknown) => T
): SupabaseResponse<T> => {
  if (!isObject(data)) {
    throw new TypeValidationError('Supabase response must be an object');
  }

  const response = data as Record<string, unknown>;

  let validatedData: T | null = null;
  if (response.data !== null && response.data !== undefined) {
    if (dataValidator) {
      validatedData = dataValidator(response.data);
    } else {
      validatedData = response.data as T;
    }
  }

  let error: { message: string; details: string; hint: string; code: string } | null = null;
  if (response.error !== null && response.error !== undefined) {
    if (!isObject(response.error)) {
      throw new TypeValidationError('Supabase error must be an object');
    }
    
    const errorObj = response.error as Record<string, unknown>;
    if (!isString(errorObj.message) || !isString(errorObj.details) || 
        !isString(errorObj.hint) || !isString(errorObj.code)) {
      throw new TypeValidationError('Supabase error must have message, details, hint, and code strings');
    }
    
    error = errorObj as { message: string; details: string; hint: string; code: string };
  }

  if (!isNumber(response.status)) {
    throw new TypeValidationError('Status must be a number');
  }

  if (!isString(response.statusText)) {
    throw new TypeValidationError('Status text must be a string');
  }

  const result: SupabaseResponse<T> = {
    data: validatedData,
    error,
    status: response.status as number,
    statusText: response.statusText as string
  };

  // Only add count if it exists and is a number
  if (response.count !== undefined && response.count !== null && isNumber(response.count)) {
    result.count = response.count;
  }

  return result;
};

// Health check and metrics validators
export const validateHealthCheckResponse = (data: unknown): HealthCheckResponse => {
  if (!isObject(data)) {
    throw new TypeValidationError('Health check response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!isBoolean(response.success) || !response.success) {
    throw new TypeValidationError('Health check must be successful');
  }

  if (!isString(response.timestamp)) {
    throw new TypeValidationError('Timestamp must be a string');
  }

  if (!isObject(response.services)) {
    throw new TypeValidationError('Services must be an object');
  }

  const services = response.services as Record<string, unknown>;
  const validStatuses = ['healthy', 'unhealthy', 'unknown'];
  
  if (!isString(services.database) || !['healthy', 'unhealthy'].includes(services.database)) {
    throw new TypeValidationError('Database status must be healthy or unhealthy');
  }

  if (!isString(services.whatsapp) || !validStatuses.includes(services.whatsapp)) {
    throw new TypeValidationError('WhatsApp status must be healthy, unhealthy, or unknown');
  }

  if (!isString(services.gemini) || !validStatuses.includes(services.gemini)) {
    throw new TypeValidationError('Gemini status must be healthy, unhealthy, or unknown');
  }

  if (!isString(services.n8n) || !validStatuses.includes(services.n8n)) {
    throw new TypeValidationError('N8N status must be healthy, unhealthy, or unknown');
  }

  if (!isString(response.version)) {
    throw new TypeValidationError('Version must be a string');
  }

  return {
    success: true,
    timestamp: response.timestamp as string,
    services: {
      database: services.database as 'healthy' | 'unhealthy',
      whatsapp: services.whatsapp as 'healthy' | 'unhealthy' | 'unknown',
      gemini: services.gemini as 'healthy' | 'unhealthy' | 'unknown',
      n8n: services.n8n as 'healthy' | 'unhealthy' | 'unknown'
    },
    version: response.version as string
  };
};

export const validateMetricsResponse = (data: unknown): MetricsResponse => {
  const baseResponse = validateApiSuccessResponse(data);
  
  if (!isObject(baseResponse.data)) {
    throw new TypeValidationError('Metrics data must be an object');
  }

  const metrics = baseResponse.data as Record<string, unknown>;

  // Validate conversations metrics
  if (!isObject(metrics.conversations)) {
    throw new TypeValidationError('Conversations metrics must be an object');
  }
  const conversations = metrics.conversations as Record<string, unknown>;
  if (!isNumber(conversations.total) || !isNumber(conversations.active) || 
      !isNumber(conversations.aiHandled) || !isNumber(conversations.agentAssigned) || 
      !isNumber(conversations.closed)) {
    throw new TypeValidationError('All conversation metrics must be numbers');
  }

  // Validate messages metrics
  if (!isObject(metrics.messages)) {
    throw new TypeValidationError('Messages metrics must be an object');
  }
  const messages = metrics.messages as Record<string, unknown>;
  if (!isNumber(messages.total) || !isNumber(messages.sent) || 
      !isNumber(messages.delivered) || !isNumber(messages.failed)) {
    throw new TypeValidationError('All message metrics must be numbers');
  }

  // Validate campaigns metrics
  if (!isObject(metrics.campaigns)) {
    throw new TypeValidationError('Campaigns metrics must be an object');
  }
  const campaigns = metrics.campaigns as Record<string, unknown>;
  if (!isNumber(campaigns.total) || !isNumber(campaigns.active) || 
      !isNumber(campaigns.completed) || !isNumber(campaigns.failed)) {
    throw new TypeValidationError('All campaign metrics must be numbers');
  }

  // Validate contacts metrics
  if (!isObject(metrics.contacts)) {
    throw new TypeValidationError('Contacts metrics must be an object');
  }
  const contacts = metrics.contacts as Record<string, unknown>;
  if (!isNumber(contacts.total) || !isNumber(contacts.newToday) || 
      !isNumber(contacts.newThisWeek)) {
    throw new TypeValidationError('All contact metrics must be numbers');
  }

  return baseResponse as MetricsResponse;
};