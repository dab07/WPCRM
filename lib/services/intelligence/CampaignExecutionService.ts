// [NEW: intelligence-pipeline] — added 2026-04-11
// Equivalent to Inngest: executeCampaign — runs after content confirmed by brand.
// Creates Klaviyo email campaign, schedules Omnisend SMS, syncs Meta custom audience.
// Logs execution IDs back to campaign_assets table.

import { supabaseAdmin } from '../../../supabase/supabase';
import { KlaviyoService } from '../external/KlaviyoService';
import { OmnisendService } from '../external/OmnisendService';
import { MetaAdsService } from '../external/MetaAdsService';
import type { CampaignAsset, Opportunity, ExecuteCampaignResult } from './types';

export class CampaignExecutionError extends Error {
  constructor(
    message: string,
    public readonly opportunityId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CampaignExecutionError';
  }
}

export class CampaignExecutionService {
  private supabase = supabaseAdmin;
  private klaviyo: KlaviyoService;
  private omnisend: OmnisendService;
  private metaAds: MetaAdsService;

  constructor() {
    this.klaviyo = new KlaviyoService();
    this.omnisend = new OmnisendService();
    this.metaAds = new MetaAdsService();
  }

  /**
   * Main entry point — called after brand confirms content.
   * Executes all confirmed assets across their respective channels.
   */
  async executeCampaign(opportunityId: string): Promise<ExecuteCampaignResult> {
    console.log(`[CampaignExec] Executing campaign for opportunity ${opportunityId}`);

    const opportunity = await this.getOpportunity(opportunityId);
    const assets = await this.getConfirmedAssets(opportunityId);

    if (assets.length === 0) {
      throw new CampaignExecutionError(
        `No confirmed assets found for opportunity ${opportunityId}`,
        opportunityId
      );
    }

    const result: ExecuteCampaignResult = {
      opportunityId,
      executedAt: new Date().toISOString(),
      errors: [],
    };

    // Execute each channel in parallel, collecting errors without failing fast
    await Promise.all(assets.map(asset => this.executeAsset(asset, opportunity, result)));

    // Update opportunity status to executed
    await this.supabase
      .from('opportunities')
      .update({ status: 'executed', updated_at: new Date().toISOString() })
      .eq('id', opportunityId);

    console.log(`[CampaignExec] Completed for opportunity ${opportunityId}. Errors: ${result.errors.length}`);
    return result;
  }

  private async getOpportunity(id: string): Promise<Opportunity> {
    const { data, error } = await this.supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new CampaignExecutionError(`Opportunity ${id} not found`, id);
    }

    return data as Opportunity;
  }

  private async getConfirmedAssets(opportunityId: string): Promise<CampaignAsset[]> {
    const { data, error } = await this.supabase
      .from('campaign_assets')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'confirmed');

    if (error) {
      throw new CampaignExecutionError(
        `Failed to fetch confirmed assets: ${error.message}`,
        opportunityId
      );
    }

    return (data ?? []) as CampaignAsset[];
  }

  private async executeAsset(
    asset: CampaignAsset,
    opportunity: Opportunity,
    result: ExecuteCampaignResult
  ): Promise<void> {
    // Mark as executing
    await this.supabase
      .from('campaign_assets')
      .update({ status: 'executing', updated_at: new Date().toISOString() })
      .eq('id', asset.id);

    try {
      switch (asset.channel) {
        case 'email':
          await this.executeEmailCampaign(asset, opportunity, result);
          break;
        case 'sms':
          await this.executeSMSCampaign(asset, opportunity, result);
          break;
        case 'meta_ads':
          await this.executeMetaAdsCampaign(asset, opportunity, result);
          break;
      }

      // Mark as executed
      await this.supabase
        .from('campaign_assets')
        .update({ status: 'executed', updated_at: new Date().toISOString() })
        .eq('id', asset.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`[${asset.channel}] ${msg}`);
      console.error(`[CampaignExec] ${asset.channel} execution failed:`, err);

      // Revert to confirmed so it can be retried
      await this.supabase
        .from('campaign_assets')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', asset.id);
    }
  }

  private async executeEmailCampaign(
    asset: CampaignAsset,
    opportunity: Opportunity,
    result: ExecuteCampaignResult
  ): Promise<void> {
    // Fetch the Klaviyo list ID from brand sync metadata
    const { data: meta } = await this.supabase
      .from('brand_sync_metadata')
      .select('lists')
      .eq('brand_id', opportunity.brand_id)
      .eq('source', 'klaviyo')
      .single();

    const lists = (meta?.lists ?? []) as Array<{ id: string; name: string }>;
    const listId = lists[0]?.id;

    if (!listId) {
      throw new Error('No Klaviyo list found for brand — cannot create email campaign');
    }

    const campaign = await this.klaviyo.createEmailCampaign({
      name: opportunity.title,
      listId,
      subject: asset.subject ?? opportunity.title,
      fromEmail: 'noreply@brand.com', // TODO: pull from brand settings
      fromName: 'Brand',
      htmlContent: asset.html_content ?? '',
    });

    result.klaviyoCampaignId = campaign.id;

    await this.supabase
      .from('campaign_assets')
      .update({ execution_id: campaign.id })
      .eq('id', asset.id);
  }

  private async executeSMSCampaign(
    asset: CampaignAsset,
    opportunity: Opportunity,
    result: ExecuteCampaignResult
  ): Promise<void> {
    const campaign = await this.omnisend.createSMSCampaign({
      name: opportunity.title,
      content: asset.sms_content ?? '',
    });

    result.omnisendCampaignId = campaign.campaignID;

    await this.supabase
      .from('campaign_assets')
      .update({ execution_id: campaign.campaignID })
      .eq('id', asset.id);
  }

  private async executeMetaAdsCampaign(
    asset: CampaignAsset,
    opportunity: Opportunity,
    result: ExecuteCampaignResult
  ): Promise<void> {
    // Fetch customer emails for this brand to build the audience
    const { data: customers } = await this.supabase
      .from('customers')
      .select('email, phone')
      .eq('brand_id', opportunity.brand_id)
      .not('email', 'is', null);

    const emails = (customers ?? []).map(c => c.email).filter(Boolean) as string[];
    const phones = (customers ?? []).map(c => c.phone).filter(Boolean) as string[];

    // Create or reuse a custom audience
    const audienceName = `${opportunity.title} — ${new Date().toISOString().slice(0, 10)}`;
    const audience = await this.metaAds.createCustomAudience({ name: audienceName });

    if (emails.length > 0) {
      await this.metaAds.syncAudienceMembers({
        audienceId: audience.id,
        emails,
        ...(phones.length > 0 && { phones }),
      });
    }

    result.metaAudienceId = audience.id;

    await this.supabase
      .from('campaign_assets')
      .update({ execution_id: audience.id })
      .eq('id', asset.id);
  }
}
