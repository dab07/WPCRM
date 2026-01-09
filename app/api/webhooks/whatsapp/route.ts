import { NextRequest, NextResponse } from 'next/server';

/**
 * WhatsApp webhook endpoint
 * This endpoint handles incoming webhooks from WhatsApp Business API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[WhatsApp Webhook] Received webhook:', body);

    // Process WhatsApp webhook
    // This is a placeholder - implement specific WhatsApp webhook logic as needed
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp webhook processed successfully'
    });

  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}