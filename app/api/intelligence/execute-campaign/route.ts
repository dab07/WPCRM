import { NextRequest, NextResponse } from 'next/server';
import { CampaignExecutionService } from '@/lib/services/intelligence/CampaignExecutionService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId) {
      return NextResponse.json(
        { success: false, error: 'opportunityId is required' },
        { status: 400 }
      );
    }

    console.log(`[CampaignExec API] Executing campaign for opportunity ${opportunityId}`);
    const service = new CampaignExecutionService();
    const result = await service.executeCampaign(opportunityId);

    return NextResponse.json({
      success: true,
      ...result,
      hasErrors: result.errors.length > 0,
    });
  } catch (error) {
    console.error('[CampaignExec API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Campaign execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
