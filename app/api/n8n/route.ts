import { NextRequest, NextResponse } from 'next/server';

/**
 * N8N integration endpoint
 * This endpoint handles communication with N8N workflows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle N8N webhook or API calls
    console.log('[N8N] Received request:', body);

    // Process the N8N request based on the body content
    // This is a placeholder - implement specific N8N logic as needed
    
    return NextResponse.json({
      success: true,
      message: 'N8N request processed successfully'
    });

  } catch (error) {
    console.error('[N8N] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'N8N integration endpoint is active',
    timestamp: new Date().toISOString()
  });
}