// [NEW: intelligence-pipeline] — added 2026-04-11
// [UPDATED: multi-tenant-isolation] — added 2026-04-18
import { NextRequest, NextResponse } from 'next/server';
import { CampaignExecutionService } from '@/lib/services/intelligence/CampaignExecutionService';
import { resolveBrandContext, assertBrandOwnership } from '@/lib/middleware/brandContext';
import { supabaseAdmin } from '../../../../supabase/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'opportunityId is required' }, { status: 400 });
    }

    // Fetch opportunity to get brand_id, then validate caller owns that brand
    const { data: opp, error } = await supabaseAdmin
      .from('opportunities')
      .select('brand_id')
      .eq('id', opportunityId)
      .single();

    if (error || !opp) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    }

    const ctx = await resolveBrandContext(request, opp.brand_id);
    assertBrandOwnership(opp.brand_id, ctx, 'opportunity');

    console.log(`[CampaignExec API] Executing campaign for opportunity ${opportunityId} (brand ${ctx.brandId})`);
    const service = new CampaignExecutionService();
    const result = await service.executeCampaign(opportunityId);

    return NextResponse.json({ success: true, ...result, hasErrors: result.errors.length > 0 });
  } catch (error) {
    console.error('[CampaignExec API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Campaign execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
