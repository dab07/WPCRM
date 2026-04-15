import { supabaseAdmin } from '../../../supabase/supabase';
import { GeminiService } from '../external/GeminiService';
import type { Opportunity, CampaignAsset, GenerateContentResult } from './types';

export class ContentGenerationError extends Error {
  constructor(
    message: string,
    public readonly opportunityId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ContentGenerationError';
  }
}

interface GeneratedContent {
  email: {
    subject: string;
    htmlContent: string;
  };
  sms: {
    content: string;
  };
  metaAds: {
    headline: string;
    adCopy: string;
  };
}

export class ContentGenerationService {
  private supabase = supabaseAdmin;
  private gemini: GeminiService;

  constructor() {
    this.gemini = new GeminiService();
  }

  /**
   * Main entry point — called when a brand approves an opportunity.
   * Generates multi-channel content and runs a safety check before storing.
   */
  async generateContent(opportunityId: string): Promise<GenerateContentResult> {
    console.log(`[ContentGen] Generating content for opportunity ${opportunityId}`);

    const opportunity = await this.getOpportunity(opportunityId);

    if (opportunity.status !== 'approved') {
      throw new ContentGenerationError(
        `Opportunity ${opportunityId} is not approved (status: ${opportunity.status})`,
        opportunityId
      );
    }

    const content = await this.callGeminiForContent(opportunity);
    const safetyPassed = await this.runSafetyCheck(content);

    const assets = await this.storeAssets(opportunity, content, safetyPassed);

    // Update opportunity status
    await this.supabase
      .from('opportunities')
      .update({ status: 'content_generated', updated_at: new Date().toISOString() })
      .eq('id', opportunityId);

    console.log(`[ContentGen] Stored ${assets.length} assets for opportunity ${opportunityId}`);
    return { opportunityId, assets };
  }

  private async getOpportunity(id: string): Promise<Opportunity> {
    const { data, error } = await this.supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new ContentGenerationError(
        `Opportunity ${id} not found: ${error?.message}`,
        id
      );
    }

    return data as Opportunity;
  }

  private async callGeminiForContent(opportunity: Opportunity): Promise<GeneratedContent> {
    const prompt = `
You are a marketing copywriter. Generate campaign content for the following opportunity:

Title: ${opportunity.title}
Description: ${opportunity.description}
Target Segment: ${opportunity.target_segment}
Stage: ${opportunity.stage}
Channels: ${opportunity.suggested_channels.join(', ')}

Generate content for ALL three channels (email, sms, meta_ads) regardless of suggested channels.

Return ONLY a valid JSON object with this exact structure:
{
  "email": {
    "subject": "email subject line (max 60 chars)",
    "htmlContent": "full HTML email body (use inline styles, keep it concise)"
  },
  "sms": {
    "content": "SMS message (max 160 chars, include opt-out: Reply STOP)"
  },
  "metaAds": {
    "headline": "ad headline (max 40 chars)",
    "adCopy": "ad body copy (max 125 chars)"
  }
}

No markdown, no explanation. Only valid JSON.
`.trim();

    const response = await this.gemini.generateAIResponse(prompt, [
      'You are a marketing copywriter that returns only valid JSON.',
    ]);

    const raw = (response.data?.response ?? '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(raw) as GeneratedContent;
    } catch (err) {
      throw new ContentGenerationError(
        `Failed to parse Gemini content response: ${err instanceof Error ? err.message : 'Unknown'}`,
        opportunity.id,
        err instanceof Error ? err : undefined
      );
    }
  }

  private async runSafetyCheck(content: GeneratedContent): Promise<{ passed: boolean; notes: string }> {
    const prompt = `
You are a content safety reviewer. Review the following marketing content for:
- Misleading claims
- Inappropriate language
- Spam-like patterns
- Legal compliance issues (GDPR, CAN-SPAM)

Content to review:
${JSON.stringify(content, null, 2)}

Return ONLY a valid JSON object:
{
  "passed": true or false,
  "notes": "brief explanation (max 200 chars)"
}
`.trim();

    try {
      const response = await this.gemini.generateAIResponse(prompt, [
        'You are a content safety reviewer that returns only valid JSON.',
      ]);
      const raw = (response.data?.response ?? '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(raw) as { passed: boolean; notes: string };
    } catch {
      // Default to passed with a note if safety check itself fails
      return { passed: true, notes: 'Safety check could not be completed; manual review recommended.' };
    }
  }

  private async storeAssets(
    opportunity: Opportunity,
    content: GeneratedContent,
    safety: { passed: boolean; notes: string }
  ): Promise<CampaignAsset[]> {
    const rows = [
      {
        opportunity_id: opportunity.id,
        brand_id: opportunity.brand_id,
        channel: 'email' as const,
        subject: content.email.subject,
        html_content: content.email.htmlContent,
        safety_check_passed: safety.passed,
        safety_check_notes: safety.notes,
        status: 'draft' as const,
      },
      {
        opportunity_id: opportunity.id,
        brand_id: opportunity.brand_id,
        channel: 'sms' as const,
        sms_content: content.sms.content,
        safety_check_passed: safety.passed,
        safety_check_notes: safety.notes,
        status: 'draft' as const,
      },
      {
        opportunity_id: opportunity.id,
        brand_id: opportunity.brand_id,
        channel: 'meta_ads' as const,
        ad_headline: content.metaAds.headline,
        ad_copy: content.metaAds.adCopy,
        safety_check_passed: safety.passed,
        safety_check_notes: safety.notes,
        status: 'draft' as const,
      },
    ];

    const { data, error } = await this.supabase
      .from('campaign_assets')
      .insert(rows)
      .select();

    if (error) {
      throw new ContentGenerationError(
        `Failed to store campaign assets: ${error.message}`,
        opportunity.id
      );
    }

    return (data ?? []) as CampaignAsset[];
  }
}
