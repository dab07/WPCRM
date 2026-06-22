import { NextResponse } from 'next/server';
import { OpportunityEngine } from '@/lib/services/intelligence/OpportunityEngine';

export async function GET(request: Request) {
  try {
    // In production, you would authenticate this request (e.g. verify Vercel Cron secret)
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId') || 'default-client-id';

    const engine = new OpportunityEngine();
    const opportunities = await engine.runDailyScan(clientId);

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities
    });
  } catch (error: any) {
    console.error('Daily scan failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
