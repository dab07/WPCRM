import { NextRequest, NextResponse } from 'next/server';

/**
 * WhatsApp testing endpoint
 * This endpoint is for testing WhatsApp integration functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[WhatsApp Test] Received request:', body);

    // Test WhatsApp functionality
    // This is a placeholder - implement specific WhatsApp testing logic as needed
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp test completed successfully',
      data: body
    });

  } catch (error) {
    console.error('[WhatsApp Test] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'WhatsApp test endpoint is active',
    timestamp: new Date().toISOString()
  });
}