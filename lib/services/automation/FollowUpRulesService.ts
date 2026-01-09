import { AbstractBaseService } from '../base/BaseService';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { QueryOptions } from '../../types/services/base';

export interface FollowUpRule {
  id: string;
  name: string;
  trigger_condition: 'inactivity' | 'tag_added' | 'keyword_match';
  inactivity_hours?: number;
  message_template: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowUpRuleRequest {
  name: string;
  trigger_condition: FollowUpRule['trigger_condition'];
  inactivity_hours?: number;
  message_template: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateFollowUpRuleRequest {
  name?: string;
  trigger_condition?: FollowUpRule['trigger_condition'];
  inactivity_hours?: number;
  message_template?: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  is_active?: boolean;
}

export class FollowUpRulesService extends AbstractBaseService<FollowUpRule> {
  protected tableName = 'follow_up_rules';
  private supabase = getSupabaseClient();

  async list(options?: QueryOptions): Promise<FollowUpRule[]> {
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
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch follow-up rules: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(id: string): Promise<FollowUpRule> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Follow-up rule with id ${id} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch follow-up rule: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: CreateFollowUpRuleRequest): Promise<FollowUpRule> {
    try {
      const { data: rule, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...data,
          is_active: data.is_active ?? true,
          conditions: data.conditions || {},
          actions: data.actions || {}
        })
        .select()
        .single();

      if (error) {
        throw this.createError('CREATE_ERROR', `Failed to create follow-up rule: ${error.message}`, error);
      }

      return rule;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: UpdateFollowUpRuleRequest): Promise<FollowUpRule> {
    try {
      const { data: rule, error } = await this.supabase
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
          throw this.createError('NOT_FOUND', `Follow-up rule with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update follow-up rule: ${error.message}`, error);
      }

      return rule;
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
        throw this.createError('DELETE_ERROR', `Failed to delete follow-up rule: ${error.message}`, error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Domain-specific methods
  async getActiveRules(): Promise<FollowUpRule[]> {
    try {
      return await this.list({ 
        filters: { is_active: true },
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async getRulesByTriggerCondition(condition: FollowUpRule['trigger_condition']): Promise<FollowUpRule[]> {
    try {
      return await this.list({ 
        filters: { trigger_condition: condition, is_active: true },
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async activateRule(id: string): Promise<FollowUpRule> {
    try {
      return await this.update(id, { is_active: true });
    } catch (error) {
      this.handleError(error);
    }
  }

  async deactivateRule(id: string): Promise<FollowUpRule> {
    try {
      return await this.update(id, { is_active: false });
    } catch (error) {
      this.handleError(error);
    }
  }

  async getInactivityRules(): Promise<FollowUpRule[]> {
    try {
      return await this.getRulesByTriggerCondition('inactivity');
    } catch (error) {
      this.handleError(error);
    }
  }

  async getTagBasedRules(): Promise<FollowUpRule[]> {
    try {
      return await this.getRulesByTriggerCondition('tag_added');
    } catch (error) {
      this.handleError(error);
    }
  }

  async getKeywordMatchRules(): Promise<FollowUpRule[]> {
    try {
      return await this.getRulesByTriggerCondition('keyword_match');
    } catch (error) {
      this.handleError(error);
    }
  }

  async getActiveInactivityRules(): Promise<FollowUpRule[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .eq('trigger_condition', 'inactivity')
        .order('inactivity_hours', { ascending: true });

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch active inactivity rules: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  // Trigger follow-up execution
  async triggerFollowUps(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/automation/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger follow-ups');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }
}