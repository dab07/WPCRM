// API client and type definitions for the CRM

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type Definitions
export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags: string[];
  source: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  status: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  channel: string;
  assigned_agent_id?: string;
  last_message_at: string;
  last_message_from: 'customer' | 'agent' | 'ai';
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithContact extends Conversation {
  contact: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'ai';
  content: string;
  message_type: 'text' | 'image' | 'document';
  delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  ai_confidence?: number;
  whatsapp_message_id?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  target_tags: string[];
  message_template: string;
  scheduled_at?: string;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUpRule {
  id: string;
  name: string;
  description?: string;
  trigger_condition: 'no_response' | 'tag_added' | 'time_based';
  time_threshold_hours?: number;
  target_tags?: string[];
  action_type: 'send_message' | 'assign_agent' | 'add_tag' | 'trigger_workflow';
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trigger {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'keyword' | 'inactivity' | 'tag_change' | 'sentiment';
  trigger_config: Record<string, any>;
  action_type: 'send_message' | 'assign_agent' | 'add_tag' | 'trigger_workflow';
  action_config: Record<string, any>;
  is_active: boolean;
  execution_count?: number;
  success_rate?: number;
  last_executed?: string;
  created_at: string;
  updated_at: string;
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
}

export interface Agent {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AIIntent {
  id: string;
  intent_name: string;
  keywords: string[];
  response_template: string;
  confidence_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Helper Functions
class API {
  async get(endpoint: string) {
    try {
      // Parse endpoint to extract table and filters
      const [path, queryString] = endpoint.split('?');
      const table = path.replace(/^\//, '');
      
      let query = supabase.from(table).select('*');

      // Parse query parameters
      if (queryString) {
        const params = new URLSearchParams(queryString);
        
        params.forEach((value, key) => {
          if (key.endsWith('_gte')) {
            const field = key.replace('_gte', '');
            query = query.gte(field, value);
          } else if (key.endsWith('_lte')) {
            const field = key.replace('_lte', '');
            query = query.lte(field, value);
          } else if (key === 'limit') {
            query = query.limit(parseInt(value));
          } else if (key === 'order') {
            query = query.order(value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('API GET error:', error);
      throw error;
    }
  }

  async post(endpoint: string, body: any) {
    try {
      const table = endpoint.replace(/^\//, '');
      const { data, error } = await supabase.from(table).insert(body).select().single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('API POST error:', error);
      throw error;
    }
  }

  async put(endpoint: string, body: any) {
    try {
      const [table, id] = endpoint.replace(/^\//, '').split('/');
      const { data, error } = await supabase
        .from(table)
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('API PUT error:', error);
      throw error;
    }
  }

  async delete(endpoint: string) {
    try {
      const [table, id] = endpoint.replace(/^\//, '').split('/');
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('API DELETE error:', error);
      throw error;
    }
  }
}

export const api = new API();
