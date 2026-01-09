import { NextResponse } from 'next/server';
import { serviceRegistry } from '../../../../lib/services/ServiceRegistry';

/**
 * Cron job to send follow-up messages for inactive conversations
 * Run this every 3 days via N8N scheduler or daily for more frequent checks
 * 
 * Business logic is now handled by FollowUpBusinessService
 */
export async function GET() {
  try {
    console.log('[Follow-ups] 🔄 Starting follow-up check...');

    const result = await serviceRegistry.followUpBusiness.executeFollowUpWorkflow();

    if (result.rateLimited) {
      console.log(`[Follow-ups] ⏸️ Rate limited. Wait ${result.nextAllowedInMinutes} minutes before next execution.`);
      return NextResponse.json(result, { status: 429 });
    }

    console.log(`[Follow-ups] ✅ Completed: ${result.message}`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Follow-ups] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}