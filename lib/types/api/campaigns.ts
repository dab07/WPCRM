// Campaign-related type definitions
export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  scheduled_at?: string | null;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  failed_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  message_template: string;
  target_tags: string[];
  scheduled_at?: string;
  status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
}

export interface UpdateCampaignRequest {
  name?: string;
  message_template?: string;
  target_tags?: string[];
  scheduled_at?: string | null;
  status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
}