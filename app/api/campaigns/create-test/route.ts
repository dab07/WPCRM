import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator } from '@/lib/services/campaigns/CampaignOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const orchestrator = new CampaignOrchestrator();
    
    // Create a test campaign scheduled for today
    const today = new Date();
    const scheduledTime = new Date(today);
    scheduledTime.setHours(today.getHours() + 1); // Schedule for 1 hour from now
    
    const campaign = await orchestrator.createCampaign({
      name: 'Test Campaign - Image + Text',
      message_template: 'Hello {{name}}! 🎉 This is a test campaign with image and personalized message. Thank you for being part of our community!',
      target_tags: [], // Empty means all contacts
      scheduled_at: scheduledTime.toISOString()
    });

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Test campaign created successfully',
      scheduled_for: scheduledTime.toISOString()
    });

  } catch (error) {
    console.error('[Create Test Campaign] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Create test campaign endpoint is ready',
    usage: 'POST to this endpoint to create a test campaign'
  });
}