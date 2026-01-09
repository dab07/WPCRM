// Application constants
export const CONVERSATION_STATUSES = {
  ACTIVE: 'active',
  AI_HANDLED: 'ai_handled',
  AGENT_ASSIGNED: 'agent_assigned',
  CLOSED: 'closed',
} as const;

export const MESSAGE_SENDER_TYPES = {
  USER: 'user',
  AI: 'ai',
  AGENT: 'agent',
} as const;

export const MESSAGE_DELIVERY_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const AI_CONFIDENCE_THRESHOLD = 0.8;
export const MAX_MESSAGE_LENGTH = 4096;