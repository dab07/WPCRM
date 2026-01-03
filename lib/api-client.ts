import { supabase } from '../supabase/supabase';
import type { Contact, Conversation, Message, Campaign, FollowUpRule, Trigger, BusinessCard } from './api';


export const api = {
  // Contacts
  contacts: {
    list: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
    
    get: async (id: string) => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    
    create: async (contact: Partial<Contact>) => {
      const response = await fetch('/api/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create contact');
      }
      return response.json();
    },
    
    update: async (id: string, updates: Partial<Contact>) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
  },

  // Conversations
  conversations: {
    list: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*)')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    
    get: async (id: string) => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    
    updateStatus: async (id: string, status: string) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // Messages
  messages: {
    list: async (conversationId: string) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    
    send: async (conversationId: string, message: string, agentId?: string) => {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message, agentId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      return response.json();
    },
  },

  // Campaigns
  campaigns: {
    list: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    
    get: async (id: string) => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    
    create: async (campaign: Partial<Campaign>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    
    execute: async (campaignId: string) => {
      const response = await fetch('/api/campaigns/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute campaign');
      }
      return response.json();
    },
    
    update: async (id: string, updates: Partial<Campaign>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
  },

  // Follow-up Rules
  followUpRules: {
    list: async () => {
      const { data, error } = await supabase
        .from('follow_up_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FollowUpRule[];
    },
    
    create: async (rule: Partial<FollowUpRule>) => {
      const { data, error } = await supabase
        .from('follow_up_rules')
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data as FollowUpRule;
    },
    
    update: async (id: string, updates: Partial<FollowUpRule>) => {
      const { data, error } = await supabase
        .from('follow_up_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FollowUpRule;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('follow_up_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    
    trigger: async () => {
      const response = await fetch('/api/cron/follow-ups');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger follow-ups');
      }
      return response.json();
    },
  },

  // Triggers
  triggers: {
    list: async () => {
      const { data, error } = await supabase
        .from('triggers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Trigger[];
    },
    
    create: async (trigger: Partial<Trigger>) => {
      const { data, error } = await supabase
        .from('triggers')
        .insert(trigger)
        .select()
        .single();
      if (error) throw error;
      return data as Trigger;
    },
    
    update: async (id: string, updates: Partial<Trigger>) => {
      const { data, error } = await supabase
        .from('triggers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Trigger;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('triggers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
  },

  // Business Cards
  businessCards: {
    list: async () => {
      const { data, error } = await supabase
        .from('business_cards')
        .select('*, contact:contacts(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    
    get: async (id: string) => {
      const { data, error } = await supabase
        .from('business_cards')
        .select('*, contact:contacts(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  },

  // Workflow Executions
  workflowExecutions: {
    list: async () => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  },
};

// Export types
export type ConversationWithContact = Conversation & {
  contact: Contact;
};

export type { Contact, Conversation, Message, Campaign, FollowUpRule, Trigger, BusinessCard };
