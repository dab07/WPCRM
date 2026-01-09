import type { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '../../types/api/campaigns';
import type { BaseService } from '../../types/services/base';

export interface CampaignsService extends BaseService<Campaign> {
  findByStatus(status: Campaign['status']): Promise<Campaign[]>;
  findByTags(tags: string[]): Promise<Campaign[]>;
  execute(id: string): Promise<void>;
  schedule(id: string, scheduledAt: string): Promise<Campaign>;
}

export type { Campaign, CreateCampaignRequest, UpdateCampaignRequest };