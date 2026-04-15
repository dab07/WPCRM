import { NextRequest, NextResponse } from 'next/server';
import { IntelligenceOrchestrator } from '@/lib/services/intelligence/IntelligenceOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    console.log(`[Intelligence API] Running intelligence for brand ${brandId}`);
    const orchestrator = new IntelligenceOrchestrator();
    const opportunities = await orchestrator.runIntelligence(brandId);

    return NextResponse.json({
      success: true,
      brandId,
      opportunitiesDetected: opportunities.length,
      opportunities,
    });
  } catch (error) {
    console.error('[Intelligence API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Intelligence run failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
