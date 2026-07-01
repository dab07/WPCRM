import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';

/**
 * PATCH /api/campaigns/update
 * General-purpose campaign field update (caption, scheduled_at, image_url, email fields).
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
      channel?: string;
      send_email?: boolean;
      email_subject?: string | null;
      email_body?: string | null;
      email_attachments?: any[] | null;
      wa_campaign_type?: 'standard' | 'discount' | 'url_button' | null;
      discount_percentage?: number | null;
      discount_code?: string | null;
      wa_button_text?: string | null;
      wa_button_url?: string | null;
    };

    const {
      campaignId,
      message_template,
      scheduled_at,
      image_url,
      image_status,
      channel,
      send_email,
      email_subject,
      email_body,
      email_attachments,
    } = body;

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
    // channel is the source of truth; keep send_email in sync for backward compat
    if (channel !== undefined) {
      payload.channel = channel;
      payload.send_email = channel.includes('omnisend_email') || channel === 'email' || channel === 'both';
    } else if (send_email !== undefined) {
      payload.send_email = send_email;
      payload.channel = send_email ? 'omnisend_email' : 'gallabox';
    }
    if (email_subject !== undefined) payload.email_subject = email_subject;
    if (email_body !== undefined) payload.email_body = email_body;
    if (email_attachments !== undefined) payload.email_attachments = email_attachments;
    if (body.wa_campaign_type !== undefined) payload.wa_campaign_type = body.wa_campaign_type;
    if (body.discount_percentage !== undefined) payload.discount_percentage = body.discount_percentage;
    if (body.discount_code !== undefined) payload.discount_code = body.discount_code;
    if (body.wa_button_text !== undefined) payload.wa_button_text = body.wa_button_text;
    if (body.wa_button_url !== undefined) payload.wa_button_url = body.wa_button_url;

    // Move from pending to to_be_approved so it can be deployed
    const { data: current } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (current && current.status === 'pending') {
      payload.status = 'to_be_approved';
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
