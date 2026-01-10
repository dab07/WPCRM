import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator } from '../../../../lib/services/campaigns/CampaignOrchestrator';

/**
 * Execute a campaign - delegates to the campaign orchestrator
 * This endpoint is for manual campaign execution from the UI
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      );
    }

    // Create orchestrator instance lazily
    const orchestrator = new CampaignOrchestrator();
    
    // Use the orchestrator for consistent campaign execution
    const result = await orchestrator.executeSingleCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: `Campaign "${result.campaignName}" executed successfully`,
      sentCount: result.sent,
      campaignId: result.campaignId
    });

  } catch (error) {
    console.error('[Campaign Execute] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal error';
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('already') ? 400 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}