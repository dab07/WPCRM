// Runtime type validation utilities for API responses
import type { 
  Contact, 
  Conversation, 
  Message, 
  Campaign,
  CreateContactRequest,
  CreateConversationRequest,
  CreateMessageRequest,
  CreateCampaignRequest
} from '../types/api';

// Base validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Type guard utilities
export const isString = (value: unknown): value is string => 
  typeof value === 'string';

export const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value);

export const isBoolean = (value: unknown): value is boolean => 
  typeof value === 'boolean';

export const isArray = (value: unknown): value is unknown[] => 
  Array.isArray(value);

export const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isValidDate = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

export const isValidUUID = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const isValidPhoneNumber = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(value.replace(/\s+/g, ''));
};

export const isValidEmail = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

// Enum validators
export const isValidConversationStatus = (value: unknown): value is 'active' | 'ai_handled' | 'agent_assigned' | 'closed' => {
  return isString(value) && ['active', 'ai_handled', 'agent_assigned', 'closed'].includes(value);
};

export const isValidSenderType = (value: unknown): value is 'user' | 'ai' | 'agent' | 'customer' => {
  return isString(value) && ['user', 'ai', 'agent', 'customer'].includes(value);
};

export const isValidMessageType = (value: unknown): value is 'text' | 'image' | 'audio' | 'video' | 'document' => {
  return isString(value) && ['text', 'image', 'audio', 'video', 'document'].includes(value);
};

export const isValidDeliveryStatus = (value: unknown): value is 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received' => {
  return isString(value) && ['pending', 'sent', 'delivered', 'read', 'failed', 'received'].includes(value);
};

export const isValidCampaignStatus = (value: unknown): value is 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' => {
  return isString(value) && ['draft', 'scheduled', 'running', 'completed', 'paused'].includes(value);
};

// Contact validation
export const validateContact = (data: unknown): Contact => {
  if (!isObject(data)) {
    throw new ValidationError('Contact must be an object');
  }

  const contact = data as Record<string, unknown>;

  if (!isValidUUID(contact.id)) {
    throw new ValidationError('Invalid contact ID', 'id');
  }

  if (!isValidPhoneNumber(contact.phone_number)) {
    throw new ValidationError('Invalid phone number', 'phone_number');
  }

  if (!isString(contact.name) || contact.name.trim().length === 0) {
    throw new ValidationError('Name is required and must be a non-empty string', 'name');
  }

  if (contact.email !== undefined && contact.email !== null && !isValidEmail(contact.email)) {
    throw new ValidationError('Invalid email format', 'email');
  }

  if (contact.company !== undefined && contact.company !== null && !isString(contact.company)) {
    throw new ValidationError('Company must be a string', 'company');
  }

  if (!isArray(contact.tags) || !contact.tags.every(isString)) {
    throw new ValidationError('Tags must be an array of strings', 'tags');
  }

  if (!isObject(contact.metadata)) {
    throw new ValidationError('Metadata must be an object', 'metadata');
  }

  if (!isString(contact.source) || contact.source.trim().length === 0) {
    throw new ValidationError('Source is required and must be a non-empty string', 'source');
  }

  if (!isValidDate(contact.created_at)) {
    throw new ValidationError('Invalid created_at date', 'created_at');
  }

  if (!isValidDate(contact.updated_at)) {
    throw new ValidationError('Invalid updated_at date', 'updated_at');
  }

  const result: Contact = {
    id: contact.id as string,
    phone_number: contact.phone_number as string,
    name: contact.name as string,
    tags: contact.tags as string[],
    metadata: contact.metadata as Record<string, any>,
    source: contact.source as string,
    created_at: contact.created_at as string,
    updated_at: contact.updated_at as string
  };

  // Only add optional properties if they have values
  if (contact.email !== undefined && contact.email !== null) {
    result.email = contact.email as string;
  }

  if (contact.company !== undefined && contact.company !== null) {
    result.company = contact.company as string;
  }

  return result;
};

// Conversation validation
export const validateConversation = (data: unknown): Conversation => {
  if (!isObject(data)) {
    throw new ValidationError('Conversation must be an object');
  }

  const conversation = data as Record<string, unknown>;

  if (!isValidUUID(conversation.id)) {
    throw new ValidationError('Invalid conversation ID', 'id');
  }

  if (!isValidUUID(conversation.contact_id)) {
    throw new ValidationError('Invalid contact ID', 'contact_id');
  }

  if (!isValidConversationStatus(conversation.status)) {
    throw new ValidationError('Invalid conversation status', 'status');
  }

  if (!isString(conversation.channel) || conversation.channel.trim().length === 0) {
    throw new ValidationError('Channel is required and must be a non-empty string', 'channel');
  }

  if (!isNumber(conversation.ai_confidence) || conversation.ai_confidence < 0 || conversation.ai_confidence > 1) {
    throw new ValidationError('AI confidence must be a number between 0 and 1', 'ai_confidence');
  }

  if (conversation.assigned_agent_id !== undefined && conversation.assigned_agent_id !== null && !isValidUUID(conversation.assigned_agent_id)) {
    throw new ValidationError('Invalid assigned agent ID', 'assigned_agent_id');
  }

  if (!isValidDate(conversation.last_message_at)) {
    throw new ValidationError('Invalid last_message_at date', 'last_message_at');
  }

  if (conversation.last_message_from !== undefined && conversation.last_message_from !== null && !isValidSenderType(conversation.last_message_from)) {
    throw new ValidationError('Invalid last_message_from value', 'last_message_from');
  }

  if (!isValidDate(conversation.created_at)) {
    throw new ValidationError('Invalid created_at date', 'created_at');
  }

  if (!isValidDate(conversation.updated_at)) {
    throw new ValidationError('Invalid updated_at date', 'updated_at');
  }

  const result: Conversation = {
    id: conversation.id as string,
    contact_id: conversation.contact_id as string,
    status: conversation.status as 'active' | 'ai_handled' | 'agent_assigned' | 'closed',
    channel: conversation.channel as string,
    ai_confidence: conversation.ai_confidence as number,
    last_message_at: conversation.last_message_at as string,
    created_at: conversation.created_at as string,
    updated_at: conversation.updated_at as string
  };

  // Only add optional properties if they have values
  if (conversation.assigned_agent_id !== undefined && conversation.assigned_agent_id !== null) {
    result.assigned_agent_id = conversation.assigned_agent_id as string;
  }

  if (conversation.last_message_from !== undefined && conversation.last_message_from !== null) {
    result.last_message_from = conversation.last_message_from as 'user' | 'ai' | 'agent' | 'customer';
  }

  return result;
};

// Message validation
export const validateMessage = (data: unknown): Message => {
  if (!isObject(data)) {
    throw new ValidationError('Message must be an object');
  }

  const message = data as Record<string, unknown>;

  if (!isValidUUID(message.id)) {
    throw new ValidationError('Invalid message ID', 'id');
  }

  if (!isValidUUID(message.conversation_id)) {
    throw new ValidationError('Invalid conversation ID', 'conversation_id');
  }

  if (message.whatsapp_message_id !== undefined && message.whatsapp_message_id !== null && !isString(message.whatsapp_message_id)) {
    throw new ValidationError('WhatsApp message ID must be a string', 'whatsapp_message_id');
  }

  if (!isString(message.content) || message.content.trim().length === 0) {
    throw new ValidationError('Content is required and must be a non-empty string', 'content');
  }

  if (!isValidSenderType(message.sender_type)) {
    throw new ValidationError('Invalid sender type', 'sender_type');
  }

  if (!isValidMessageType(message.message_type)) {
    throw new ValidationError('Invalid message type', 'message_type');
  }

  if (!isValidDeliveryStatus(message.delivery_status)) {
    throw new ValidationError('Invalid delivery status', 'delivery_status');
  }

  if (!isObject(message.metadata)) {
    throw new ValidationError('Metadata must be an object', 'metadata');
  }

  if (!isValidDate(message.created_at)) {
    throw new ValidationError('Invalid created_at date', 'created_at');
  }

  if (!isValidDate(message.updated_at)) {
    throw new ValidationError('Invalid updated_at date', 'updated_at');
  }

  const result: Message = {
    id: message.id as string,
    conversation_id: message.conversation_id as string,
    content: message.content as string,
    sender_type: message.sender_type as 'user' | 'ai' | 'agent' | 'customer',
    message_type: message.message_type as 'text' | 'image' | 'audio' | 'video' | 'document',
    delivery_status: message.delivery_status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received',
    metadata: message.metadata as Record<string, any>,
    created_at: message.created_at as string,
    updated_at: message.updated_at as string
  };

  // Only add optional properties if they have values
  if (message.whatsapp_message_id !== undefined && message.whatsapp_message_id !== null) {
    result.whatsapp_message_id = message.whatsapp_message_id as string;
  }

  return result;
};

// Campaign validation
export const validateCampaign = (data: unknown): Campaign => {
  if (!isObject(data)) {
    throw new ValidationError('Campaign must be an object');
  }

  const campaign = data as Record<string, unknown>;

  if (!isValidUUID(campaign.id)) {
    throw new ValidationError('Invalid campaign ID', 'id');
  }

  if (!isString(campaign.name) || campaign.name.trim().length === 0) {
    throw new ValidationError('Name is required and must be a non-empty string', 'name');
  }

  if (!isString(campaign.message_template) || campaign.message_template.trim().length === 0) {
    throw new ValidationError('Message template is required and must be a non-empty string', 'message_template');
  }

  if (!isArray(campaign.target_tags) || !campaign.target_tags.every(isString)) {
    throw new ValidationError('Target tags must be an array of strings', 'target_tags');
  }

  if (campaign.scheduled_at !== undefined && campaign.scheduled_at !== null && !isValidDate(campaign.scheduled_at)) {
    throw new ValidationError('Invalid scheduled_at date', 'scheduled_at');
  }

  if (!isValidCampaignStatus(campaign.status)) {
    throw new ValidationError('Invalid campaign status', 'status');
  }

  if (campaign.total_recipients !== undefined && campaign.total_recipients !== null && !isNumber(campaign.total_recipients)) {
    throw new ValidationError('Total recipients must be a number', 'total_recipients');
  }

  if (campaign.sent_count !== undefined && campaign.sent_count !== null && !isNumber(campaign.sent_count)) {
    throw new ValidationError('Sent count must be a number', 'sent_count');
  }

  if (campaign.delivered_count !== undefined && campaign.delivered_count !== null && !isNumber(campaign.delivered_count)) {
    throw new ValidationError('Delivered count must be a number', 'delivered_count');
  }

  if (campaign.read_count !== undefined && campaign.read_count !== null && !isNumber(campaign.read_count)) {
    throw new ValidationError('Read count must be a number', 'read_count');
  }

  if (!isValidDate(campaign.created_at)) {
    throw new ValidationError('Invalid created_at date', 'created_at');
  }

  if (!isValidDate(campaign.updated_at)) {
    throw new ValidationError('Invalid updated_at date', 'updated_at');
  }

  const result: Campaign = {
    id: campaign.id as string,
    name: campaign.name as string,
    message_template: campaign.message_template as string,
    target_tags: campaign.target_tags as string[],
    status: campaign.status as 'draft' | 'scheduled' | 'running' | 'completed' | 'paused',
    created_at: campaign.created_at as string,
    updated_at: campaign.updated_at as string
  };

  // Only add optional properties if they have values
  if (campaign.scheduled_at !== undefined && campaign.scheduled_at !== null) {
    result.scheduled_at = campaign.scheduled_at as string;
  }

  if (campaign.sent_count !== undefined && campaign.sent_count !== null) {
    result.sent_count = campaign.sent_count as number;
  }

  if (campaign.delivered_count !== undefined && campaign.delivered_count !== null) {
    result.delivered_count = campaign.delivered_count as number;
  }

  if (campaign.read_count !== undefined && campaign.read_count !== null) {
    result.read_count = campaign.read_count as number;
  }

  return result;
};

// Request validation functions
export const validateCreateContactRequest = (data: unknown): CreateContactRequest => {
  if (!isObject(data)) {
    throw new ValidationError('Create contact request must be an object');
  }

  const request = data as Record<string, unknown>;

  if (!isValidPhoneNumber(request.phone_number)) {
    throw new ValidationError('Invalid phone number', 'phone_number');
  }

  if (!isString(request.name) || request.name.trim().length === 0) {
    throw new ValidationError('Name is required and must be a non-empty string', 'name');
  }

  if (request.email !== undefined && request.email !== null && !isValidEmail(request.email)) {
    throw new ValidationError('Invalid email format', 'email');
  }

  if (request.company !== undefined && request.company !== null && !isString(request.company)) {
    throw new ValidationError('Company must be a string', 'company');
  }

  if (request.tags !== undefined && request.tags !== null && (!isArray(request.tags) || !request.tags.every(isString))) {
    throw new ValidationError('Tags must be an array of strings', 'tags');
  }

  if (request.metadata !== undefined && request.metadata !== null && !isObject(request.metadata)) {
    throw new ValidationError('Metadata must be an object', 'metadata');
  }

  if (!isString(request.source) || request.source.trim().length === 0) {
    throw new ValidationError('Source is required and must be a non-empty string', 'source');
  }

  const result: CreateContactRequest = {
    phone_number: request.phone_number as string,
    name: request.name as string,
    source: request.source as string
  };

  // Only add optional properties if they have values
  if (request.email !== undefined && request.email !== null) {
    result.email = request.email as string;
  }

  if (request.company !== undefined && request.company !== null) {
    result.company = request.company as string;
  }

  if (request.tags !== undefined && request.tags !== null) {
    result.tags = request.tags as string[];
  }

  if (request.metadata !== undefined && request.metadata !== null) {
    result.metadata = request.metadata as Record<string, any>;
  }

  return result;
};

export const validateCreateConversationRequest = (data: unknown): CreateConversationRequest => {
  if (!isObject(data)) {
    throw new ValidationError('Create conversation request must be an object');
  }

  const request = data as Record<string, unknown>;

  if (!isValidUUID(request.contact_id)) {
    throw new ValidationError('Invalid contact ID', 'contact_id');
  }

  if (request.status !== undefined && request.status !== null && !isValidConversationStatus(request.status)) {
    throw new ValidationError('Invalid conversation status', 'status');
  }

  if (request.channel !== undefined && request.channel !== null && !isString(request.channel)) {
    throw new ValidationError('Channel must be a string', 'channel');
  }

  if (request.ai_confidence !== undefined && request.ai_confidence !== null && (!isNumber(request.ai_confidence) || request.ai_confidence < 0 || request.ai_confidence > 1)) {
    throw new ValidationError('AI confidence must be a number between 0 and 1', 'ai_confidence');
  }

  if (request.assigned_agent_id !== undefined && request.assigned_agent_id !== null && !isValidUUID(request.assigned_agent_id)) {
    throw new ValidationError('Invalid assigned agent ID', 'assigned_agent_id');
  }

  if (request.last_message_at !== undefined && request.last_message_at !== null && !isValidDate(request.last_message_at)) {
    throw new ValidationError('Invalid last_message_at date', 'last_message_at');
  }

  if (request.last_message_from !== undefined && request.last_message_from !== null && !isValidSenderType(request.last_message_from)) {
    throw new ValidationError('Invalid last_message_from value', 'last_message_from');
  }

  const result: CreateConversationRequest = {
    contact_id: request.contact_id as string
  };

  // Only add optional properties if they have values
  if (request.status !== undefined && request.status !== null) {
    result.status = request.status as 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  }

  if (request.channel !== undefined && request.channel !== null) {
    result.channel = request.channel as string;
  }

  if (request.ai_confidence !== undefined && request.ai_confidence !== null) {
    result.ai_confidence = request.ai_confidence as number;
  }

  if (request.assigned_agent_id !== undefined && request.assigned_agent_id !== null) {
    result.assigned_agent_id = request.assigned_agent_id as string;
  }

  if (request.last_message_at !== undefined && request.last_message_at !== null) {
    result.last_message_at = request.last_message_at as string;
  }

  if (request.last_message_from !== undefined && request.last_message_from !== null) {
    result.last_message_from = request.last_message_from as 'user' | 'ai' | 'agent' | 'customer';
  }

  return result;
};

export const validateCreateMessageRequest = (data: unknown): CreateMessageRequest => {
  if (!isObject(data)) {
    throw new ValidationError('Create message request must be an object');
  }

  const request = data as Record<string, unknown>;

  if (!isValidUUID(request.conversation_id)) {
    throw new ValidationError('Invalid conversation ID', 'conversation_id');
  }

  if (request.whatsapp_message_id !== undefined && request.whatsapp_message_id !== null && !isString(request.whatsapp_message_id)) {
    throw new ValidationError('WhatsApp message ID must be a string', 'whatsapp_message_id');
  }

  if (!isString(request.content) || request.content.trim().length === 0) {
    throw new ValidationError('Content is required and must be a non-empty string', 'content');
  }

  if (!isValidSenderType(request.sender_type)) {
    throw new ValidationError('Invalid sender type', 'sender_type');
  }

  if (request.message_type !== undefined && request.message_type !== null && !isValidMessageType(request.message_type)) {
    throw new ValidationError('Invalid message type', 'message_type');
  }

  if (request.delivery_status !== undefined && request.delivery_status !== null && !isValidDeliveryStatus(request.delivery_status)) {
    throw new ValidationError('Invalid delivery status', 'delivery_status');
  }

  if (request.metadata !== undefined && request.metadata !== null && !isObject(request.metadata)) {
    throw new ValidationError('Metadata must be an object', 'metadata');
  }

  const result: CreateMessageRequest = {
    conversation_id: request.conversation_id as string,
    content: request.content as string,
    sender_type: request.sender_type as 'user' | 'ai' | 'agent' | 'customer'
  };

  // Only add optional properties if they have values
  if (request.whatsapp_message_id !== undefined && request.whatsapp_message_id !== null) {
    result.whatsapp_message_id = request.whatsapp_message_id as string;
  }

  if (request.message_type !== undefined && request.message_type !== null) {
    result.message_type = request.message_type as 'text' | 'image' | 'audio' | 'video' | 'document';
  }

  if (request.delivery_status !== undefined && request.delivery_status !== null) {
    result.delivery_status = request.delivery_status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  }

  if (request.metadata !== undefined && request.metadata !== null) {
    result.metadata = request.metadata as Record<string, any>;
  }

  return result;
};

export const validateCreateCampaignRequest = (data: unknown): CreateCampaignRequest => {
  if (!isObject(data)) {
    throw new ValidationError('Create campaign request must be an object');
  }

  const request = data as Record<string, unknown>;

  if (!isString(request.name) || request.name.trim().length === 0) {
    throw new ValidationError('Name is required and must be a non-empty string', 'name');
  }

  if (!isString(request.message_template) || request.message_template.trim().length === 0) {
    throw new ValidationError('Message template is required and must be a non-empty string', 'message_template');
  }

  if (!isArray(request.target_tags) || !request.target_tags.every(isString)) {
    throw new ValidationError('Target tags must be an array of strings', 'target_tags');
  }

  if (request.scheduled_at !== undefined && request.scheduled_at !== null && !isValidDate(request.scheduled_at)) {
    throw new ValidationError('Invalid scheduled_at date', 'scheduled_at');
  }

  if (request.status !== undefined && request.status !== null && !isValidCampaignStatus(request.status)) {
    throw new ValidationError('Invalid campaign status', 'status');
  }

  const result: CreateCampaignRequest = {
    name: request.name as string,
    message_template: request.message_template as string,
    target_tags: request.target_tags as string[]
  };

  // Only add optional properties if they have values
  if (request.scheduled_at !== undefined && request.scheduled_at !== null) {
    result.scheduled_at = request.scheduled_at as string;
  }

  if (request.status !== undefined && request.status !== null) {
    result.status = request.status as 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  }

  return result;
};

// Array validation helpers
export const validateContactArray = (data: unknown): Contact[] => {
  if (!isArray(data)) {
    throw new ValidationError('Expected an array of contacts');
  }
  return data.map((item, index) => {
    try {
      return validateContact(item);
    } catch (error) {
      throw new ValidationError(`Invalid contact at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
};

export const validateConversationArray = (data: unknown): Conversation[] => {
  if (!isArray(data)) {
    throw new ValidationError('Expected an array of conversations');
  }
  return data.map((item, index) => {
    try {
      return validateConversation(item);
    } catch (error) {
      throw new ValidationError(`Invalid conversation at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
};

export const validateMessageArray = (data: unknown): Message[] => {
  if (!isArray(data)) {
    throw new ValidationError('Expected an array of messages');
  }
  return data.map((item, index) => {
    try {
      return validateMessage(item);
    } catch (error) {
      throw new ValidationError(`Invalid message at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
};

export const validateCampaignArray = (data: unknown): Campaign[] => {
  if (!isArray(data)) {
    throw new ValidationError('Expected an array of campaigns');
  }
  return data.map((item, index) => {
    try {
      return validateCampaign(item);
    } catch (error) {
      throw new ValidationError(`Invalid campaign at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
};