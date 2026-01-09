import { AbstractBaseService } from '../base/BaseService';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { Conversation, CreateConversationRequest, UpdateConversationRequest } from '../../types/api/conversations';
import type { Message, CreateMessageRequest, UpdateMessageRequest } from '../../types/api/messages';
import type { QueryOptions } from '../../types/services/base';

export class ConversationsService extends AbstractBaseService<Conversation> {
  protected tableName = 'conversations';
  private supabase = getSupabaseClient();

  async list(options?: QueryOptions): Promise<Conversation[]> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      // Apply filters if provided
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply sorting
      if (options?.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder === 'asc' 
        });
      } else {
        query = query.order('last_message_at', { ascending: false });
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch conversations: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(id: string): Promise<Conversation> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Conversation with id ${id} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch conversation: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: CreateConversationRequest): Promise<Conversation> {
    try {
      const { data: conversation, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...data,
          status: data.status || 'active',
          ai_confidence: data.ai_confidence || 0,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw this.createError('CREATE_ERROR', `Failed to create conversation: ${error.message}`, error);
      }

      return conversation;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: UpdateConversationRequest): Promise<Conversation> {
    try {
      const { data: conversation, error } = await this.supabase
        .from(this.tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Conversation with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update conversation: ${error.message}`, error);
      }

      return conversation;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.createError('DELETE_ERROR', `Failed to delete conversation: ${error.message}`, error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Message handling methods
  async getMessages(conversationId: string, options?: QueryOptions): Promise<Message[]> {
    try {
      let query = this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);

      // Apply sorting (default to chronological order)
      if (options?.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder === 'asc' 
        });
      } else {
        query = query.order('created_at', { ascending: true });
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch messages: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async addMessage(data: CreateMessageRequest): Promise<Message> {
    try {
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          ...data,
          delivery_status: data.delivery_status || 'pending',
          metadata: data.metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw this.createError('CREATE_ERROR', `Failed to create message: ${error.message}`, error);
      }

      // Update conversation's last_message_at
      await this.updateLastMessageTime(data.conversation_id);

      return message;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateMessage(id: string, data: UpdateMessageRequest): Promise<Message> {
    try {
      const { data: message, error } = await this.supabase
        .from('messages')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Message with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update message: ${error.message}`, error);
      }

      return message;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Domain-specific methods
  async findByContactId(contactId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('contact_id', contactId)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to find conversations by contact: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByStatus(status: Conversation['status']): Promise<Conversation[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to find conversations by status: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateStatus(id: string, status: Conversation['status']): Promise<Conversation> {
    try {
      return await this.update(id, { status });
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateAIConfidence(id: string, confidence: number): Promise<Conversation> {
    try {
      if (confidence < 0 || confidence > 1) {
        throw this.createError('VALIDATION_ERROR', 'AI confidence must be between 0 and 1');
      }

      return await this.update(id, { ai_confidence: confidence });
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updateLastMessageTime(conversationId: string): Promise<void> {
    try {
      await this.supabase
        .from(this.tableName)
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    } catch (error) {
      // Log error but don't throw - this is a secondary operation
      console.error('Failed to update last message time:', error);
    }
  }

  async getActiveConversations(): Promise<Conversation[]> {
    try {
      return await this.findByStatus('active');
    } catch (error) {
      this.handleError(error);
    }
  }

  async getConversationsRequiringAttention(): Promise<Conversation[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .in('status', ['active', 'ai_handled'])
        .lt('ai_confidence', 0.7) // Low confidence conversations
        .order('last_message_at', { ascending: false });

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch conversations requiring attention: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getWithContact(conversationId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, contact:contacts(*)')
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Conversation with id ${conversationId} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch conversation with contact: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findActiveByContact(contactId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('contact_id', contactId)
        .in('status', ['active', 'ai_handled'])
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to find active conversation by contact: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getConversationsNeedingFollowUp(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, contact:contacts(*)')
        .in('status', ['active', 'ai_handled'])
        .eq('last_message_from', 'customer')
        .not('last_message_at', 'is', null);

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch conversations needing follow-up: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getSentFollowUps(conversationId: string, sinceDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('metadata')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'ai')
        .not('metadata->follow_up_rule_id', 'is', null)
        .gte('created_at', sinceDate);

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch sent follow-ups: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }
}