import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const orchestrator = new CampaignOrchestrator();
    const result = await orchestrator.executeSingleCampaign(campaignId);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Campaign Orchestrator API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orchestrator = new CampaignOrchestrator();
    const campaigns = await orchestrator.getCampaigns();

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length
    });

  } catch (error) {
    console.error('[Campaign Orchestrator API] Error fetching campaigns:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
