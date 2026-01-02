import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Instagram webhook endpoint is working',
    timestamp: new Date().toISOString(),
    url: request.url
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Test Instagram] Received POST:', body);
    
    return NextResponse.json({ 
      success: true,
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Test Instagram] Error:', error);
    return NextResponse.json({ error: 'Failed to parse body' }, { status: 400 });
  }
}