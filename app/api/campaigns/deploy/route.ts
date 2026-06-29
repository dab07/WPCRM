import { NextRequest, NextResponse } from 'next/server';
import { CampaignOrchestrator } from '../../../../lib/services/campaigns/CampaignOrchestrator';
import { getSupabaseClient } from '../../../../supabase/supabase';

/**
 * POST /api/campaigns/deploy
 *
 * Deploys an approved campaign to its configured channel(s):
 *   - WhatsApp → Gallabox
 *   - Email   → Omnisend
 *   - Both    → Gallabox + Omnisend
 *
 * Request body: { campaignId: string }
 *
 * This is a user-initiated deploy from the UI — the campaign must have
 * status = 'approved'. The orchestrator handles all channel routing,
 * contact targeting, and attribute mapping internally.
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    // Pre-flight: verify the campaign exists and is in 'approved' status
    const supabase = getSupabaseClient(true);
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status, channel, send_email')
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: `Campaign not found: ${campaignId}` },
        { status: 404 }
      );
    }

    if (campaign.status !== 'approved') {
      return NextResponse.json(
        { error: `Campaign must be approved before deploying. Current status: "${campaign.status}"` },
        { status: 400 }
      );
    }

    const effectiveChannel = campaign.channel ?? (campaign.send_email ? 'both' : 'whatsapp');

    console.log(
      `[Deploy] Deploying campaign "${campaign.name}" (${campaignId}) via ${effectiveChannel}`
    );

    // Delegate to the orchestrator — it handles all channel routing,
    // contact upsert, message personalization, and status updates.
    const orchestrator = new CampaignOrchestrator();
    const result = await orchestrator.executeSingleCampaign(campaignId);

    console.log(
      `[Deploy] ✅ "${campaign.name}" deployed — ${result.sent} sent`
    );

    return NextResponse.json({
      success: true,
      campaignId: result.campaignId,
      campaignName: result.campaignName,
      channel: effectiveChannel,
      sent: result.sent,
      delivered: result.delivered,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Deploy] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal error';
    const statusCode = errorMessage.includes('not found')
      ? 404
      : errorMessage.includes('already')
      ? 400
      : 500;

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
