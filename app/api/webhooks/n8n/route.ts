import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';

// ---------------------------------------------------------------------------
// Payload shapes sent by n8n workflows
// ---------------------------------------------------------------------------

interface IntelligenceReadyPayload {
  event: 'intelligence_ready';
  brand_id: string;
  brand_name: string;
  opportunities_count: number;
  generated_at: string;
}

type N8nWebhookPayload = IntelligenceReadyPayload | Record<string, unknown>;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as N8nWebhookPayload;

    console.log('[N8N Webhook] Received:', JSON.stringify(body));

    const event = (body as Record<string, unknown>).event as string | undefined;

    if (event === 'intelligence_ready') {
      const payload = body as IntelligenceReadyPayload;

      if (!payload.brand_id || !payload.brand_name) {
        return NextResponse.json(
          { error: 'Missing brand_id or brand_name in intelligence_ready payload' },
          { status: 400 }
        );
      }

      // Persist a lightweight notification record so the dashboard can surface it.
      // Uses brand_sync_metadata with source = 'intelligence_notification' as a
      // lightweight audit trail — no new table required.
      const { error: dbError } = await supabaseAdmin
        .from('brand_sync_metadata')
        .upsert(
          {
            brand_id:  payload.brand_id,
            source:    'intelligence_notification',
            metrics: {
              event:               'intelligence_ready',
              opportunities_count: payload.opportunities_count,
              generated_at:        payload.generated_at,
              notified_at:         new Date().toISOString(),
            },
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'brand_id,source' }
        );

      if (dbError) {
        console.error('[N8N Webhook] Failed to persist intelligence notification:', dbError);
        // Non-fatal — still return 200 so n8n doesn't retry endlessly
      }

      console.log(
        `[N8N Webhook] intelligence_ready for brand ${payload.brand_name} ` +
        `(${payload.brand_id}): ${payload.opportunities_count} opportunities`
      );

      return NextResponse.json({
        success: true,
        event:   'intelligence_ready',
        brand_id: payload.brand_id,
        opportunities_count: payload.opportunities_count,
      });
    }

    // -----------------------------------------------------------------------
    // Unknown / generic event — log and acknowledge
    // -----------------------------------------------------------------------
    console.log('[N8N Webhook] Unhandled event type:', event ?? '(none)');
    return NextResponse.json({ success: true, message: 'Webhook acknowledged' });

  } catch (error) {
    console.error('[N8N Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status:    'N8N webhook endpoint is active',
    timestamp: new Date().toISOString(),
    events:    ['intelligence_ready'],
  });
}
