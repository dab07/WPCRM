import { supabaseAdmin } from '../../../supabase/supabase';
import { GeminiService } from '../external/GeminiService';
import type {
  CustomerSegmentCounts,
  OpportunityBrief,
  Opportunity,
  LifecycleStage,
} from './types';

export class IntelligenceOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly brandId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'IntelligenceOrchestratorError';
  }
}

export class IntelligenceOrchestrator {
  private supabase = supabaseAdmin;
  private gemini: GeminiService;

  constructor() {
    this.gemini = new GeminiService();
  }

  /**
   * Main entry point — runs after syncBrandData.
   * Builds customer context, calls Gemini for opportunity detection,
   * writes results to the opportunities table.
   */
  async runIntelligence(brandId: string): Promise<Opportunity[]> {
    console.log(`[Intelligence] Running intelligence for brand ${brandId}`);

    const segmentCounts = await this.buildSegmentCounts(brandId);
    const context = await this.buildContextObject(brandId, segmentCounts);
    const opportunities = await this.detectOpportunities(brandId, context);

    console.log(`[Intelligence] Detected ${opportunities.length} opportunities for brand ${brandId}`);
    return opportunities;
  }

  private async buildSegmentCounts(brandId: string): Promise<CustomerSegmentCounts> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Pre-purchase: customers with no orders
    const { count: prePurchase } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('orders_count', 0);

    // First purchase: exactly 1 order
    const { count: firstPurchase } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('orders_count', 1);

    // Post-purchase (repeat): 2+ orders, active in last 90 days
    const { count: postPurchase } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .gte('orders_count', 2)
      .gte('external_updated_at', ninetyDaysAgo);

    // At-risk: 1+ orders, no activity in 30-90 days
    const { count: atRisk } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .gte('orders_count', 1)
      .lt('external_updated_at', thirtyDaysAgo)
      .gte('external_updated_at', ninetyDaysAgo);

    // Churned: 1+ orders, no activity in 90+ days
    const { count: churned } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .gte('orders_count', 1)
      .lt('external_updated_at', ninetyDaysAgo);

    return {
      prePurchase: prePurchase ?? 0,
      firstPurchase: firstPurchase ?? 0,
      postPurchase: postPurchase ?? 0,
      atRisk: atRisk ?? 0,
      churned: churned ?? 0,
    };
  }

  private async buildContextObject(
    brandId: string,
    segments: CustomerSegmentCounts
  ): Promise<Record<string, any>> {
    // Fetch recent abandoned carts count
    const { count: abandonedCartsCount } = await this.supabase
      .from('abandoned_carts')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    // Fetch brand sync metadata for channel context
    const { data: syncMeta } = await this.supabase
      .from('brand_sync_metadata')
      .select('source, lists, metrics, contacts_count')
      .eq('brand_id', brandId);

    const klaviyoMeta = syncMeta?.find(m => m.source === 'klaviyo');
    const omnisendMeta = syncMeta?.find(m => m.source === 'omnisend');

    return {
      brandId,
      segments,
      abandonedCartsCount: abandonedCartsCount ?? 0,
      klaviyo: {
        listsCount: klaviyoMeta?.lists?.length ?? 0,
        metrics: klaviyoMeta?.metrics ?? null,
      },
      omnisend: {
        contactsCount: omnisendMeta?.contacts_count ?? 0,
        metrics: omnisendMeta?.metrics ?? null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private async detectOpportunities(
    brandId: string,
    context: Record<string, any>
  ): Promise<Opportunity[]> {
    const prompt = `
You are a marketing intelligence engine. Analyze the following customer data context for a brand and identify the top 3 campaign opportunities.

Context:
${JSON.stringify(context, null, 2)}

For each opportunity, return a JSON object with these exact fields:
- stage: one of "pre_purchase", "first_purchase", "post_purchase"
- title: short campaign title (max 60 chars)
- description: what this campaign does (max 200 chars)
- targetSegment: which customer segment to target
- estimatedReach: estimated number of customers to reach (integer)
- suggestedChannels: array of channels, each one of "email", "sms", "meta_ads"
- priority: one of "high", "medium", "low"
- reasoning: why this opportunity is valuable (max 150 chars)

Return ONLY a valid JSON array of 3 opportunity objects. No markdown, no explanation.
`.trim();

    let opportunities: OpportunityBrief[] = [];

    try {
      // generateAIResponse uses the first arg as the customer message / prompt.
      // The second arg is conversationHistory (string[]); we pass the system context there.
      const response = await this.gemini.generateAIResponse(prompt, [
        'You are a marketing intelligence engine that returns only valid JSON arrays.',
      ]);
      const raw = response.data?.response ?? '';

      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      opportunities = JSON.parse(cleaned) as OpportunityBrief[];
    } catch (err) {
      throw new IntelligenceOrchestratorError(
        `Failed to parse Gemini opportunity response: ${err instanceof Error ? err.message : 'Unknown'}`,
        brandId,
        err instanceof Error ? err : undefined
      );
    }

    // Write to opportunities table
    const rows = opportunities.map(o => ({
      brand_id: brandId,
      stage: o.stage as LifecycleStage,
      title: o.title,
      description: o.description,
      target_segment: o.targetSegment,
      estimated_reach: o.estimatedReach,
      suggested_channels: o.suggestedChannels,
      priority: o.priority,
      reasoning: o.reasoning,
      status: 'pending_approval' as const,
    }));

    const { data, error } = await this.supabase
      .from('opportunities')
      .insert(rows)
      .select();

    if (error) {
      throw new IntelligenceOrchestratorError(
        `Failed to write opportunities to DB: ${error.message}`,
        brandId
      );
    }

    return (data ?? []) as Opportunity[];
  }
}
