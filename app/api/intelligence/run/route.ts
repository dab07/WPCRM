// [NEW: intelligence-pipeline] — added 2026-04-11
// [UPDATED: multi-tenant-isolation] — added 2026-04-18
import { NextRequest, NextResponse } from 'next/server';
import { IntelligenceOrchestrator } from '@/lib/services/intelligence/IntelligenceOrchestrator';
import { withBrandContext } from '@/lib/middleware/brandContext';
import type { BrandContext } from '@/lib/types/api/auth';

export const POST = withBrandContext(async (_request: NextRequest, ctx: BrandContext) => {
  try {
    console.log(`[Intelligence API] Running intelligence for brand ${ctx.brandId}`);
    const orchestrator = new IntelligenceOrchestrator();
    const opportunities = await orchestrator.runIntelligence(ctx.brandId);

    return NextResponse.json({
      success: true,
      brandId: ctx.brandId,
      opportunitiesDetected: opportunities.length,
      opportunities,
    });
  } catch (error) {
    console.error('[Intelligence API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Intelligence run failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
