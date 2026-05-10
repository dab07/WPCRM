import { AbstractBaseService } from '../base/BaseService';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '../../types/api/campaigns';
import type { Contact } from '../../types/api/contacts';
import type { QueryOptions } from '../../types/services/base';

export class CampaignsService extends AbstractBaseService<Campaign> {
  protected tableName = 'campaigns';
  private supabase = getSupabaseClient();

  async list(options?: QueryOptions): Promise<Campaign[]> {
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
        throw this.createError('FETCH_ERROR', `Failed to fetch campaigns: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(id: string): Promise<Campaign> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Campaign with id ${id} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch campaign: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: CreateCampaignRequest): Promise<Campaign> {
    try {
      const { data: campaign, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...data,
          status: data.status || 'draft',
          sent_count: 0,
          delivered_count: 0,
          read_count: 0
        })
        .select()
        .single();

      if (error) {
        throw this.createError('CREATE_ERROR', `Failed to create campaign: ${error.message}`, error);
      }

      return campaign;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: UpdateCampaignRequest): Promise<Campaign> {
    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: campaign, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Campaign with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update campaign: ${error.message}`, error);
      }

      return campaign;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // Cannot delete an approved or executed campaign
      const campaign = await this.get(id);
      if (campaign.status === 'approved' || campaign.status === 'executed') {
        throw this.createError('VALIDATION_ERROR', 'Cannot delete an approved or executed campaign');
      }

      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.createError('DELETE_ERROR', `Failed to delete campaign: ${error.message}`, error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Campaign orchestration methods
  async getTargetContacts(campaignId: string): Promise<Contact[]> {
    try {
      const campaign = await this.get(campaignId);
      
      const { data, error } = await this.supabase
        .from('contacts')
        .select('*')
        .overlaps('tags', campaign.target_tags);

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch target contacts: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async scheduleCampaign(id: string, scheduledAt: string): Promise<Campaign> {
    try {
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();

      if (scheduledDate <= now) {
        throw this.createError('VALIDATION_ERROR', 'Scheduled time must be in the future');
      }

      return await this.update(id, {
        scheduled_at: scheduledAt,
        status: 'draft', // stays draft until cron promotes it
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async startCampaign(id: string): Promise<Campaign> {
    try {
      const campaign = await this.get(id);

      if (campaign.status !== 'draft' && campaign.status !== 'pending') {
        throw this.createError('VALIDATION_ERROR', 'Campaign must be draft or pending to start');
      }

      const targetContacts = await this.getTargetContacts(id);
      if (targetContacts.length === 0) {
        throw this.createError('VALIDATION_ERROR', 'Campaign has no target recipients');
      }

      return await this.update(id, { status: 'pending' });
    } catch (error) {
      this.handleError(error);
    }
  }

  /** @deprecated use update() directly */
  async pauseCampaign(id: string): Promise<Campaign> {
    return this.update(id, { status: 'pending' });
  }

  /** @deprecated use update() directly */
  async resumeCampaign(id: string): Promise<Campaign> {
    return this.update(id, { status: 'pending' });
  }

  async completeCampaign(id: string): Promise<Campaign> {
    return this.update(id, { status: 'executed' });
  }

  async updateCampaignStats(
    id: string, 
    stats: { 
      sent_count?: number; 
      delivered_count?: number; 
      read_count?: number; 
    }
  ): Promise<Campaign> {
    try {
      const campaign = await this.get(id);
      
      const updatedStats = {
        sent_count: stats.sent_count ?? campaign.sent_count ?? 0,
        delivered_count: stats.delivered_count ?? campaign.delivered_count ?? 0,
        read_count: stats.read_count ?? campaign.read_count ?? 0
      };

      // Auto-complete campaign if all messages have been processed
      let status = campaign.status;
      const totalProcessed = updatedStats.delivered_count;
      
      if (campaign.status === 'approved' && totalProcessed >= updatedStats.sent_count) {
        status = 'executed';
      }

      return await this.update(id, {
        ...updatedStats,
        status
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async incrementSentCount(id: string): Promise<Campaign> {
    try {
      const campaign = await this.get(id);
      return await this.updateCampaignStats(id, {
        sent_count: (campaign.sent_count ?? 0) + 1
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async incrementDeliveredCount(id: string): Promise<Campaign> {
    try {
      const campaign = await this.get(id);
      return await this.updateCampaignStats(id, {
        delivered_count: (campaign.delivered_count ?? 0) + 1
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async incrementReadCount(id: string): Promise<Campaign> {
    try {
      const campaign = await this.get(id);
      return await this.updateCampaignStats(id, {
        read_count: (campaign.read_count ?? 0) + 1
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async getScheduledCampaigns(): Promise<Campaign[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', 'approved')
        .order('scheduled_at', { ascending: true });

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch approved campaigns: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .in('status', ['pending', 'to_be_approved', 'approved'])
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch active campaigns: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }
}