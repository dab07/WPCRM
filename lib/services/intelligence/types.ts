export type LifecycleStage =
  | 'pre_purchase'   // carts, subscribers, browsers
  | 'first_purchase' // 1 order, review pending, low LTV
  | 'post_purchase'; // repeat, at-risk, churned

export interface CustomerSegmentCounts {
  prePurchase: number;
  firstPurchase: number;
  postPurchase: number;
  atRisk: number;
  churned: number;
}

export interface OpportunityBrief {
  stage: LifecycleStage;
  title: string;
  description: string;
  targetSegment: string;
  estimatedReach: number;
  suggestedChannels: Array<'email' | 'sms' | 'meta_ads'>;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface Opportunity {
  id: string;
  brand_id: string;
  stage: LifecycleStage;
  title: string;
  description: string;
  target_segment: string;
  estimated_reach: number;
  suggested_channels: string[];
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'content_generated' | 'executed';
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignAsset {
  id: string;
  opportunity_id: string;
  brand_id: string;
  channel: 'email' | 'sms' | 'meta_ads';
  subject?: string;       // email only
  html_content?: string;  // email only
  sms_content?: string;   // sms only
  ad_copy?: string;       // meta ads only
  ad_headline?: string;   // meta ads only
  safety_check_passed: boolean;
  safety_check_notes?: string;
  execution_id?: string;  // set after executeCampaign
  status: 'draft' | 'confirmed' | 'executing' | 'executed';
  created_at: string;
  updated_at: string;
}

export interface GenerateContentResult {
  opportunityId: string;
  assets: CampaignAsset[];
}

export interface ExecuteCampaignResult {
  opportunityId: string;
  klaviyoCampaignId?: string;
  omnisendCampaignId?: string;
  metaAudienceId?: string;
  executedAt: string;
  errors: string[];
}
