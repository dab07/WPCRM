import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';

/**
 * PATCH /api/campaigns/update
 * General-purpose campaign field update (caption, scheduled_at, image_url).
 * Used by the Edit Campaign modal in the UI.
 */
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseClient(true);

  try {
    const body = await request.json() as {
      campaignId: string;
      message_template?: string;
      scheduled_at?: string | null;
      image_url?: string | null;
      image_status?: string;
    };

    const { campaignId, message_template, scheduled_at, image_url, image_status } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (message_template !== undefined) payload.message_template = message_template;
    if (scheduled_at !== undefined) payload.scheduled_at = scheduled_at;
    if (image_url !== undefined) {
      payload.image_url = image_url;
      payload.image_status = image_status ?? (image_url ? 'generated' : 'not_generated');
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(payload)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: data });
  } catch (error) {
    console.error('[campaigns/update] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
