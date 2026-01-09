import { NextRequest, NextResponse } from 'next/server';

/**
 * N8N webhook endpoint
 * This endpoint handles incoming webhooks from N8N workflows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[N8N Webhook] Received webhook:', body);

    // Process N8N webhook
    // This is a placeholder - implement specific N8N webhook logic as needed
    
    return NextResponse.json({
      success: true,
      message: 'N8N webhook processed successfully'
    });

  } catch (error) {
    console.error('[N8N Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'N8N webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}