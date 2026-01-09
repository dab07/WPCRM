// Conversation-related type definitions
export interface Conversation {
  id: string;
  contact_id: string;
  status: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  channel: string;
  ai_confidence: number;
  assigned_agent_id?: string;
  last_message_at: string;
  last_message_from?: 'user' | 'ai' | 'agent' | 'customer';
  created_at: string;
  updated_at: string;
}

export interface CreateConversationRequest {
  contact_id: string;
  status?: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  channel?: string;
  ai_confidence?: number;
  assigned_agent_id?: string;
  last_message_at?: string;
  last_message_from?: 'user' | 'ai' | 'agent' | 'customer';
}

export interface UpdateConversationRequest {
  status?: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  ai_confidence?: number;
  assigned_agent_id?: string;
  last_message_at?: string;
  last_message_from?: 'user' | 'ai' | 'agent' | 'customer';
}