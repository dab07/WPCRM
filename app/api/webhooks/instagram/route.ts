import { NextRequest, NextResponse } from 'next/server';

/**
 * Instagram webhook endpoint
 * This endpoint handles incoming webhooks from Instagram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Instagram Webhook] Received webhook:', body);

    // Process Instagram webhook
    // This is a placeholder - implement specific Instagram webhook logic as needed
    
    return NextResponse.json({
      success: true,
      message: 'Instagram webhook processed successfully'
    });

  } catch (error) {
    console.error('[Instagram Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Instagram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}