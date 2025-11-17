// API Types and Interfaces

export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags: string[];
  metadata: Record<string, any>;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  status: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  assigned_agent_id?: string;
  ai_confidence_score: number;
  last_message_at?: string;
  last_message_from?: 'customer' | 'agent' | 'ai';
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  whatsapp_message_id?: string;
  sender_type: 'customer' | 'agent' | 'ai';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  media_url?: string;
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
  ai_intent?: string;
  ai_confidence?: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  scheduled_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUpRule {
  id: string;
  name: string;
  trigger_condition: 'inactivity' | 'tag_added' | 'keyword_match';
  inactivity_hours?: number;
  target_tags: string[];
  keywords: string[];
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trigger {
  id: string;
  name: string;
  event_type: 'message_received' | 'keyword_detected' | 'tag_added' | 'inactivity';
  conditions: Record<string, any>;
  action_type: 'send_message' | 'assign_agent' | 'add_tag' | 'trigger_workflow';
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface BusinessCard {
  id: string;
  contact_id: string;
  conversation_id?: string;
  extracted_data: {
    name?: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    designation?: string;
  };
  raw_text?: string;
  image_url?: string;
  confidence_score?: number;
  created_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  trigger_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
  created_at: string;
}
