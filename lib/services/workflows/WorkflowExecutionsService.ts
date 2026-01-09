import { AbstractBaseService } from '../base/BaseService';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { QueryOptions } from '../../types/services/base';

export interface WorkflowExecution {
  id: string;
  workflow_name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowExecutionRequest {
  workflow_name: string;
  status?: WorkflowExecution['status'];
  input_data?: Record<string, any>;
}

export interface UpdateWorkflowExecutionRequest {
  status?: WorkflowExecution['status'];
  completed_at?: string;
  execution_time_ms?: number;
  output_data?: Record<string, any>;
  error_message?: string;
}

export class WorkflowExecutionsService extends AbstractBaseService<WorkflowExecution> {
  protected tableName = 'workflow_executions';
  private supabase = getSupabaseClient();

  async list(options?: QueryOptions): Promise<WorkflowExecution[]> {
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
        query = query.order('started_at', { ascending: false });
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch workflow executions: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(id: string): Promise<WorkflowExecution> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Workflow execution with id ${id} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch workflow execution: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: CreateWorkflowExecutionRequest): Promise<WorkflowExecution> {
    try {
      const { data: execution, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...data,
          status: data.status || 'running',
          started_at: new Date().toISOString(),
          input_data: data.input_data || {}
        })
        .select()
        .single();

      if (error) {
        throw this.createError('CREATE_ERROR', `Failed to create workflow execution: ${error.message}`, error);
      }

      return execution;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: UpdateWorkflowExecutionRequest): Promise<WorkflowExecution> {
    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // If completing the execution, calculate execution time
      if (data.status === 'completed' || data.status === 'failed') {
        if (!data.completed_at) {
          updateData.completed_at = new Date().toISOString();
        }
        
        // Calculate execution time if not provided
        if (!data.execution_time_ms) {
          const execution = await this.get(id);
          const startTime = new Date(execution.started_at).getTime();
          const endTime = new Date(updateData.completed_at).getTime();
          updateData.execution_time_ms = endTime - startTime;
        }
      }

      const { data: execution, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Workflow execution with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update workflow execution: ${error.message}`, error);
      }

      return execution;
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
        throw this.createError('DELETE_ERROR', `Failed to delete workflow execution: ${error.message}`, error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Domain-specific methods
  async getRunningExecutions(): Promise<WorkflowExecution[]> {
    try {
      return await this.list({ 
        filters: { status: 'running' },
        sortBy: 'started_at',
        sortOrder: 'desc'
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async getExecutionsByWorkflow(workflowName: string, limit?: number): Promise<WorkflowExecution[]> {
    try {
      const options: QueryOptions = {
        filters: { workflow_name: workflowName },
        sortBy: 'started_at',
        sortOrder: 'desc'
      };

      if (limit) {
        options.pageSize = limit;
        options.page = 1;
      }

      return await this.list(options);
    } catch (error) {
      this.handleError(error);
    }
  }

  async completeExecution(id: string, outputData?: Record<string, any>): Promise<WorkflowExecution> {
    try {
      const updateData: UpdateWorkflowExecutionRequest = {
        status: 'completed'
      };
      
      if (outputData !== undefined) {
        updateData.output_data = outputData;
      }
      
      return await this.update(id, updateData);
    } catch (error) {
      this.handleError(error);
    }
  }

  async failExecution(id: string, errorMessage: string): Promise<WorkflowExecution> {
    try {
      return await this.update(id, {
        status: 'failed',
        error_message: errorMessage
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelExecution(id: string): Promise<WorkflowExecution> {
    try {
      return await this.update(id, {
        status: 'cancelled'
      });
    } catch (error) {
      this.handleError(error);
    }
  }
}