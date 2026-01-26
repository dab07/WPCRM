import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    console.log('[Campaign Orchestrator API] Received request:', JSON.stringify(body, null, 2));
    
    const { campaignId, action, source, timestamp } = body;

    const orchestrator = new CampaignOrchestrator();

    // Handle scheduled processing from N8N
    if (action === 'process_scheduled') {
      console.log(`[Campaign Orchestrator API] Processing scheduled campaigns from ${source} at ${timestamp}`);
      
      try {
        const result = await orchestrator.processCampaigns(source);
        
        return NextResponse.json({
          success: true,
          processed: result.processed || 0,
          sent: result.sent || 0,
          failed: result.failed || 0,
          timestamp: new Date().toISOString(),
          source,
          message: `Successfully processed ${result.processed} campaigns and sent ${result.sent} messages`
        });
      } catch (error) {
        console.error('[Campaign Orchestrator API] Error processing campaigns:', error);
        return NextResponse.json({
          success: false,
          processed: 0,
          sent: 0,
          failed: 0,
          timestamp: new Date().toISOString(),
          source,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to process scheduled campaigns'
        }, { status: 500 });
      }
    }

    // Handle single campaign execution (requires campaignId)
    if (!campaignId) {
      console.log('[Campaign Orchestrator API] No campaignId provided and action is not process_scheduled');
      return NextResponse.json(
        { 
          error: 'Campaign ID is required for single campaign execution',
          received_action: action,
          available_actions: ['process_scheduled', 'single_campaign']
        },
        { status: 400 }
      );
    }

    try {
      console.log(`[Campaign Orchestrator API] Executing single campaign: ${campaignId}`);
      const result = await orchestrator.executeSingleCampaign(campaignId);

      return NextResponse.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('[Campaign Orchestrator API] Error executing single campaign:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Campaign Orchestrator API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
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
