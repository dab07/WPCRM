import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';
import type { CampaignStatus } from '../../../../lib/types/api/campaigns';

/**
 * PATCH /api/campaigns/update-status
 * Updates campaign status (approve, reject, etc.)
 */
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseClient(true);

  try {
    const body = await request.json();
    const { campaignId, status, image_status, image_url } = body as {
      campaignId: string;
      status?: CampaignStatus;
      image_status?: string;
      image_url?: string;
    };

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (image_status) updatePayload.image_status = image_status;
    if (image_url !== undefined) updatePayload.image_url = image_url;

    // If approving, record nothing extra; if executing, record executed_at
    if (status === 'executed') {
      updatePayload.executed_at = new Date().toISOString();
    }

    // If rejecting (back to pending), reset image
    if (status === 'pending') {
      updatePayload.image_status = 'not_generated';
      updatePayload.image_url = null;
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updatePayload)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaign: data });
  } catch (error) {
    console.error('[update-status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

