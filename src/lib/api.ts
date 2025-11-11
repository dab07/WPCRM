// MongoDB API client configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// API client helper
export const api = {
  async get(endpoint: string) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async post(endpoint: string, data?: unknown) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async put(endpoint: string, data?: unknown) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async delete(endpoint: string) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },
};

export interface Agent {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'agent';
  is_active: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags: string[];
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  assigned_agent_id?: string;
  status: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
  last_message_at: string;
  last_message_from: 'customer' | 'agent' | 'ai';
  ai_confidence_score?: number;
  handover_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'ai' | 'system';
  sender_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'document';
  media_url?: string;
  whatsapp_message_id?: string;
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags?: string[];
  target_contact_ids?: string[];
  scheduled_at: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
  total_recipients: number;
  sent_count: number;
  created_by?: string;
  created_at: string;
  completed_at?: string;
}

export interface FollowUpRule {
  id: string;
  name: string;
  trigger_condition: string;
  days_threshold: number;
  message_template: string;
  is_active: boolean;
  created_by?: string;
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
}
