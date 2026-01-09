import { NextRequest, NextResponse } from 'next/server';

/**
 * Instagram testing endpoint
 * This endpoint is for testing Instagram integration functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Instagram Test] Received request:', body);

    // Test Instagram functionality
    // This is a placeholder - implement specific Instagram testing logic as needed
    
    return NextResponse.json({
      success: true,
      message: 'Instagram test completed successfully',
      data: body
    });

  } catch (error) {
    console.error('[Instagram Test] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Instagram test endpoint is active',
    timestamp: new Date().toISOString()
  });
}