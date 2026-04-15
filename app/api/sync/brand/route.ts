import { NextRequest, NextResponse } from 'next/server';
import { BrandSyncOrchestrator } from '@/lib/services/sync/BrandSyncOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, updatedSince } = body;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    console.log(`[Sync API] Starting brand sync for ${brandId}`);
    const orchestrator = new BrandSyncOrchestrator();
    const result = await orchestrator.syncBrandData(brandId, updatedSince);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Brand sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
