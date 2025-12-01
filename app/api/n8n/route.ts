import { NextRequest, NextResponse } from 'next/server';

const N8N_BASE_URL = process.env.N8N_BASE_URL || process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.NEXT_PUBLIC_N8N_API_KEY || '';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint') || '/api/v1/workflows';

  try {
    const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('n8n proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to n8n' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint') || '/webhook';
  const body = await request.json();

  try {
    const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('n8n proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to n8n' },
      { status: 500 }
    );
  }
}
