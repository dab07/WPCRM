import { AbstractBaseService } from '../base/BaseService';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { QueryOptions } from '../../types/services/base';

export interface Trigger {
  id: string;
  name: string;
  event_type: string;
  type: string; // For backward compatibility with components
  condition: string; // For backward compatibility with components  
  action: string; // For backward compatibility with components
  conditions: Record<string, any>;
  actions: Record<string, any>;
  action_config?: Record<string, any>;
  action_type?: string;
  execution_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTriggerRequest {
  name: string;
  event_type: string;
  type?: string;
  condition?: string;
  action?: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  action_config?: Record<string, any>;
  action_type?: string;
  is_active?: boolean;
}

export interface UpdateTriggerRequest {
  name?: string;
  event_type?: string;
  type?: string;
  condition?: string;
  action?: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  action_config?: Record<string, any>;
  action_type?: string;
  execution_count?: number;
  is_active?: boolean;
}

export class TriggersService extends AbstractBaseService<Trigger> {
  protected tableName = 'triggers';
  private supabase = getSupabaseClient();

  async list(options?: QueryOptions): Promise<Trigger[]> {
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
        throw this.createError('FETCH_ERROR', `Failed to fetch triggers: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(id: string): Promise<Trigger> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Trigger with id ${id} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch trigger: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: CreateTriggerRequest): Promise<Trigger> {
    try {
      const { data: trigger, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...data,
          is_active: data.is_active ?? true,
          execution_count: 0
        })
        .select()
        .single();

      if (error) {
        throw this.createError('CREATE_ERROR', `Failed to create trigger: ${error.message}`, error);
      }

      return trigger;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: UpdateTriggerRequest): Promise<Trigger> {
    try {
      const { data: trigger, error } = await this.supabase
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
          throw this.createError('NOT_FOUND', `Trigger with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update trigger: ${error.message}`, error);
      }

      return trigger;
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
        throw this.createError('DELETE_ERROR', `Failed to delete trigger: ${error.message}`, error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Domain-specific methods
  async getActiveTriggers(): Promise<Trigger[]> {
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

  async getTriggersByEventType(eventType: string): Promise<Trigger[]> {
    try {
      return await this.list({ 
        filters: { event_type: eventType, is_active: true },
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async activateTrigger(id: string): Promise<Trigger> {
    try {
      return await this.update(id, { is_active: true });
    } catch (error) {
      this.handleError(error);
    }
  }

  async deactivateTrigger(id: string): Promise<Trigger> {
    try {
      return await this.update(id, { is_active: false });
    } catch (error) {
      this.handleError(error);
    }
  }

  async incrementExecutionCount(id: string): Promise<Trigger> {
    try {
      const trigger = await this.get(id);
      return await this.update(id, { 
        execution_count: (trigger.execution_count || 0) + 1 
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async resetExecutionCount(id: string): Promise<Trigger> {
    try {
      return await this.update(id, { execution_count: 0 });
    } catch (error) {
      this.handleError(error);
    }
  }
}