// Campaign-related type definitions

export type CampaignStatus =
  | 'draft'
  | 'pending'
  | 'to_be_approved'
  | 'approved'
  | 'executed'
  | 'rejected';

export type ImageStatus = 'not_generated' | 'generating' | 'generated';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** Which delivery channels this campaign uses — stored as comma-separated list */
export type CampaignChannel =
  // New provider-based values
  | 'gallabox'          // WhatsApp via Gallabox
  | 'omnisend_email'    // Email via Omnisend
  | 'omnisend_push'     // Push Notifications via Omnisend
  | 'omnisend_sms'      // SMS via Omnisend
  // Legacy values (kept for backward compat reading old data)
  | 'whatsapp'
  | 'email'
  | 'both';

/** Set of channels selected for a campaign */
export type ChannelSet = Set<CampaignChannel>;

/** Human-readable labels per channel */
export const CHANNEL_LABELS: Record<string, string> = {
  gallabox: 'Gallabox',
  omnisend_email: 'Omnisend · Email',
  omnisend_push: 'Omnisend · Push',
  omnisend_sms: 'Omnisend · SMS',
  // legacy
  whatsapp: 'WhatsApp',
  email: 'Email',
  both: 'WhatsApp + Email',
};

/** Convert old single-channel value to new channel array */
export function normalizeChannels(channel?: CampaignChannel | string | null): string[] {
  if (!channel) return ['gallabox'];
  if (channel === 'whatsapp') return ['gallabox'];
  if (channel === 'email') return ['omnisend_email'];
  if (channel === 'both') return ['gallabox', 'omnisend_email'];
  // New multi-value stored as comma-separated e.g. "gallabox,omnisend_email"
  return channel.split(',').map(c => c.trim()).filter(Boolean);
}

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
  // Channel & email fields
  channel?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
  email_attachments?: any | null;
  /** @deprecated use channel instead */
  send_email?: boolean | null;
  // WhatsApp specific features
  wa_campaign_type?: 'standard' | 'discount' | 'url_button' | null;
  wa_button_text?: string | null;
  wa_button_url?: string | null;
  discount_code?: string | null;
  discount_percentage?: number | null;
  brand_label?: string | null;
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
  channel?: string;
  email_subject?: string;
  email_body?: string;
  email_attachments?: any[];
  send_email?: boolean;
  wa_campaign_type?: 'standard' | 'discount' | 'url_button';
  wa_button_text?: string;
  wa_button_url?: string;
  discount_code?: string;
  discount_percentage?: number;
  brand_label?: string;
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
  channel?: string;
  email_subject?: string | null;
  email_body?: string | null;
  email_attachments?: any[] | null;
  wa_campaign_type?: 'standard' | 'discount' | 'url_button' | null;
  wa_button_text?: string | null;
  wa_button_url?: string | null;
  discount_code?: string | null;
  discount_percentage?: number | null;
  brand_label?: string | null;
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