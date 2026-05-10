// Campaign-related type definitions

export type CampaignStatus =
  | 'draft'
  | 'pending'
  | 'to_be_approved'
  | 'approved'
  | 'executed';

export type ImageStatus = 'not_generated' | 'generating' | 'generated';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  scheduled_at?: string | null;
  status: CampaignStatus;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  // Festival campaign fields
  festival?: string | null;
  image_url?: string | null;
  image_status?: ImageStatus;
  executed_at?: string | null;
  target_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  message_template: string;
  target_tags: string[];
  scheduled_at?: string;
  status?: CampaignStatus;
  festival?: string;
  image_url?: string;
  image_status?: ImageStatus;
  target_count?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  message_template?: string;
  target_tags?: string[];
  scheduled_at?: string | null;
  status?: CampaignStatus;
  festival?: string | null;
  image_url?: string | null;
  image_status?: ImageStatus;
  executed_at?: string | null;
  target_count?: number;
  sent_count?: number;
}

// Helper: derive quarter from a date string
export function getQuarter(dateStr: string): Quarter {
  const month = new Date(dateStr).getMonth() + 1; // 1-12
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

// Helper: days away from today (negative = past)
export function getDaysAway(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}