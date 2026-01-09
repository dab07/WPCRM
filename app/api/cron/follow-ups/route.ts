import { NextResponse } from 'next/server';
import { serviceRegistry } from '../../../../lib/services/ServiceRegistry';

/**
 * Cron-specific endpoint for follow-up automation
 * This endpoint is designed to be called by external cron services like Vercel Cron
 */
export async function GET() {
  try {
    console.log('[Cron Follow-ups] 🔄 Starting scheduled follow-up check...');

    const result = await serviceRegistry.followUpBusiness.executeFollowUpWorkflow();

    if (result.rateLimited) {
      console.log(`[Cron Follow-ups] ⏸️ Rate limited. Wait ${result.nextAllowedInMinutes} minutes before next execution.`);
      return NextResponse.json(result, { status: 429 });
    }

    console.log(`[Cron Follow-ups] ✅ Completed: ${result.message}`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Cron Follow-ups] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST() {
  return GET();
}