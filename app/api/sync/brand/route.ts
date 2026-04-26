// [NEW: brand-sync] — added 2026-04-11
// [UPDATED: multi-tenant-isolation] — added 2026-04-18
import { NextRequest, NextResponse } from 'next/server';
import { BrandSyncOrchestrator } from '@/lib/services/sync/BrandSyncOrchestrator';
import { withBrandContext } from '@/lib/middleware/brandContext';
import type { BrandContext } from '@/lib/types/api/auth';

export const POST = withBrandContext(async (request: NextRequest, ctx: BrandContext) => {
  try {
    const body = await request.json();
    const { updatedSince } = body;

    console.log(`[Sync API] Starting brand sync for ${ctx.brandId} by user ${ctx.userId}`);
    const orchestrator = new BrandSyncOrchestrator();
    const result = await orchestrator.syncBrandData(ctx.brandId, updatedSince);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Brand sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
