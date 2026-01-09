// Standardized API response types with validation
import type { Contact, Conversation, Message, Campaign } from './index';

// Base API response structure
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Success response with data
export interface ApiSuccessResponse<T = unknown> extends BaseApiResponse {
  success: true;
  data: T;
  message?: string;
}

// Error response
export interface ApiErrorResponse extends BaseApiResponse {
  success: false;
  error: string;
  details?: Record<string, unknown>;
}

// Union type for all API responses
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Contact API responses
export interface ContactResponse extends ApiSuccessResponse<Contact> {}
export interface ContactListResponse extends ApiSuccessResponse<Contact[]> {}
export interface PaginatedContactResponse extends ApiSuccessResponse<PaginatedResponse<Contact>> {}

export interface CreateContactResponse extends BaseApiResponse {
  success: boolean;
  contact?: Contact;
  message: string;
  messageId?: string;
  conversationId?: string;
  warning?: string;
  error?: string;
}

// Conversation API responses
export interface ConversationResponse extends ApiSuccessResponse<Conversation> {}
export interface ConversationListResponse extends ApiSuccessResponse<Conversation[]> {}
export interface PaginatedConversationResponse extends ApiSuccessResponse<PaginatedResponse<Conversation>> {}

// Message API responses
export interface MessageResponse extends ApiSuccessResponse<Message> {}
export interface MessageListResponse extends ApiSuccessResponse<Message[]> {}
export interface PaginatedMessageResponse extends ApiSuccessResponse<PaginatedResponse<Message>> {}

export interface SendMessageResponse extends BaseApiResponse {
  success: boolean;
  message: string;
  messageId?: string;
  deliveryStatus?: string;
}

// Campaign API responses
export interface CampaignResponse extends ApiSuccessResponse<Campaign> {}
export interface CampaignListResponse extends ApiSuccessResponse<Campaign[]> {}
export interface PaginatedCampaignResponse extends ApiSuccessResponse<PaginatedResponse<Campaign>> {}

export interface CampaignExecutionResponse extends BaseApiResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  totalRecipients?: number;
  campaignId?: string;
  campaignName?: string;
}

// External service response types
export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
    message_status?: string;
  }>;
}

export interface GeminiApiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface N8nApiResponse {
  data?: unknown;
  success?: boolean;
  error?: string;
  executionId?: string;
  finished?: boolean;
}

// Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
  count?: number | null;
  status: number;
  statusText: string;
}

// Validation result types
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
}

// Health check response
export interface HealthCheckResponse extends BaseApiResponse {
  success: true;
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy';
    whatsapp: 'healthy' | 'unhealthy' | 'unknown';
    gemini: 'healthy' | 'unhealthy' | 'unknown';
    n8n: 'healthy' | 'unhealthy' | 'unknown';
  };
  version: string;
}

// Metrics response
export interface MetricsResponse extends ApiSuccessResponse<{
  conversations: {
    total: number;
    active: number;
    aiHandled: number;
    agentAssigned: number;
    closed: number;
  };
  messages: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
  contacts: {
    total: number;
    newToday: number;
    newThisWeek: number;
  };
}> {}