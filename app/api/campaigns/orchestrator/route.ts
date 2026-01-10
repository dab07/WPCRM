import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator, type Campaign } from '../../../../lib/services/campaigns/CampaignOrchestrator';

/**
 * Unified Campaign Orchestrator API
 * Handles both scheduled campaigns (N8N cron) and manual campaign execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, campaignId, source } = body;

    // Verify authentication for N8N requests
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    // For N8N cron jobs, verify the token
    if (source === 'n8n_cron' || source === 'n8n_schedule_trigger') {
      if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        console.log('[Campaign Orchestrator] Unauthorized N8N request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Create orchestrator instance lazily
    const orchestrator = new CampaignOrchestrator();
    let result;

    switch (action) {
      case 'process_scheduled':
        // Process all scheduled campaigns for today (called by N8N daily)
        console.log('[Campaign Orchestrator] Processing scheduled campaigns...');
        result = await orchestrator.processCampaigns(source || 'api');
        break;

      case 'execute_campaign':
        // Execute a specific campaign immediately (manual trigger)
        if (!campaignId) {
          return NextResponse.json(
            { error: 'Campaign ID required for execute_campaign action' },
            { status: 400 }
          );
        }
        console.log(`[Campaign Orchestrator] Executing campaign: ${campaignId}`);
        result = await orchestrator.executeSingleCampaign(campaignId);
        break;

      default:
        // Default behavior: process scheduled campaigns (for backward compatibility)
        console.log('[Campaign Orchestrator] Default: Processing scheduled campaigns...');
        result = await orchestrator.processCampaigns(source || 'api');
        break;
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign orchestration completed successfully',
      action: action || 'process_scheduled',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Campaign Orchestrator] Error:', error);
    return NextResponse.json(
      {
        error: 'Campaign orchestration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for debugging and status checks
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';

    // Create orchestrator instance lazily
    const orchestrator = new CampaignOrchestrator();

    switch (action) {
      case 'scheduled_today':
        // Get campaigns scheduled for today
        const campaigns: Campaign[] = await orchestrator.getCampaigns();
        const scheduledToday = campaigns.filter((c: Campaign) => 
          c.status === 'scheduled' && 
          c.scheduled_at && 
          new Date(c.scheduled_at).toDateString() === new Date().toDateString()
        );
        
        return NextResponse.json({
          success: true,
          total_campaigns: campaigns.length,
          scheduled_today: scheduledToday.length,
          campaigns: scheduledToday
        });

      case 'status':
      default:
        // General status
        const allCampaigns: Campaign[] = await orchestrator.getCampaigns();
        const stats = {
          total: allCampaigns.length,
          draft: allCampaigns.filter((c: Campaign) => c.status === 'draft').length,
          scheduled: allCampaigns.filter((c: Campaign) => c.status === 'scheduled').length,
          running: allCampaigns.filter((c: Campaign) => c.status === 'running').length,
          completed: allCampaigns.filter((c: Campaign) => c.status === 'completed').length,
          paused: allCampaigns.filter((c: Campaign) => c.status === 'paused').length
        };

        return NextResponse.json({
          success: true,
          stats,
          endpoint: 'Campaign Orchestrator API',
          actions: {
            POST: {
              process_scheduled: 'Process all scheduled campaigns for today',
              execute_campaign: 'Execute a specific campaign (requires campaignId)'
            },
            GET: {
              '?action=status': 'Get campaign statistics',
              '?action=scheduled_today': 'Get campaigns scheduled for today'
            }
          }
        });
    }

  } catch (error) {
    console.error('[Campaign Orchestrator] GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch campaign data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}