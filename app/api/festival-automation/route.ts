import { NextRequest, NextResponse } from 'next/server';
import { campaignOrchestrator } from '../../../lib/campaign-orchestrator';

// This endpoint is called daily by N8N at 9 AM
// Processes all scheduled campaigns for today
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (optional)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    // Skip auth check for testing - remove this in production
    console.log('[Festival Automation] Auth header:', authHeader);
    console.log('[Festival Automation] Expected token:', expectedToken ? 'Set' : 'Not set');
    
    // Temporarily disable auth for testing
    // if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Process all campaigns including festivals
    const result = await campaignOrchestrator.processCampaigns('n8n_cron');

    return NextResponse.json({ 
      success: true, 
      message: 'Campaign orchestration completed successfully',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Campaign orchestration error:', error);
    return NextResponse.json(
      { 
        error: 'Campaign orchestration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint to check scheduled campaigns (for debugging)
export async function GET() {
  try {
    const campaigns = await campaignOrchestrator.getCampaigns();
    const scheduledToday = campaigns.filter(c => 
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

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaigns', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}