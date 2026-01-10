// Campaign-related type definitions
export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  scheduled_at?: string | null;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  message_template: string;
  target_tags: string[];
  scheduled_at?: string;
  status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
}

export interface UpdateCampaignRequest {
  name?: string;
  message_template?: string;
  target_tags?: string[];
  scheduled_at?: string | null;
  status?: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
}