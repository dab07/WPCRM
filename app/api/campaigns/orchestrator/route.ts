import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';
import { CampaignOrchestrator } from '../../../../lib/services/campaigns/CampaignOrchestrator';

/**
 * /api/campaigns/orchestrator
 *
 * Single unified campaign execution route. Handles two use-cases:
 *
 * ── SCHEDULED (N8N / Vercel Cron) ──────────────────────────────────────────
 *   POST  { "action": "process_scheduled", "source": "n8n_schedule_trigger" }
 *   GET   (Vercel Cron — same logic, no body needed)
 *
 *   1. PROMOTE  draft → pending for campaigns entering the 90-day window
 *   2. EXECUTE  campaigns where status = 'approved' AND scheduled_at = today
 *               Channels: 'whatsapp' | 'email' | 'both'  (falls back to send_email bool)
 *
 *   Auth: Authorization: Bearer <CRON_SECRET_TOKEN>
 *         OR ?secret=<CRON_SECRET_TOKEN>
 *
 * ── SINGLE CAMPAIGN (UI "Execute now" button) ───────────────────────────────
 *   POST  { "campaignId": "<uuid>" }
 *   Executes one specific campaign regardless of scheduled_at.
 *   No auth required — user is already authenticated via the UI session.
 *
 * Execution rule (both paths):
 *   A campaign is only sent when  status = 'approved'  AND  scheduled_at = today.
 *   The single-campaign path relaxes the date check so operators can re-run
 *   or manually trigger from the UI.
 */

// ── Auth (for scheduled / cron calls) ─────────────────────────────────────
function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET_TOKEN;
  if (!secret) return true; // no secret set → open in dev

  const auth = request.headers.get('authorization') ?? '';
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

// ── Shared: promote draft → pending ───────────────────────────────────────
async function promoteDraftCampaigns(): Promise<{ promoted: number; errors: string[] }> {
  const supabase = getSupabaseClient(true);
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 90);
  const errors: string[] = [];

  const { data: promoted, error } = await supabase
    .from('campaigns')
    .update({ status: 'pending', updated_at: now.toISOString() })
    .eq('status', 'draft')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', windowEnd.toISOString())
    .gte('scheduled_at', now.toISOString())
    .select('id, name');

  if (error) {
    errors.push(`Promote error: ${error.message}`);
  } else if (promoted && promoted.length > 0) {
    console.log(
      `[Orchestrator] Promoted ${promoted.length} draft → pending:`,
      promoted.map((c) => c.name).join(', ')
    );
  }

  return { promoted: promoted?.length ?? 0, errors };
}

// ── Shared: execute today's approved campaigns ─────────────────────────────
async function executeScheduledCampaigns(source: string): Promise<{
  sent: number;
  whatsapp_sent: number;
  email_sent: number;
  failed: number;
  campaigns: { id: string; name: string; channel: string; sent: number; status: string }[];
  errors: string[];
}> {
  const supabase = getSupabaseClient(true);
  const orchestrator = new CampaignOrchestrator();
  const now = new Date();

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const errors: string[] = [];
  const campaignResults: { id: string; name: string; channel: string; sent: number; status: string }[] = [];
  let sent = 0, whatsapp_sent = 0, email_sent = 0, failed = 0;

  const { data: toSend, error: fetchErr } = await supabase
    .from('campaigns')
    .select('id, name, channel, send_email')
    .eq('status', 'approved')
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString());

  if (fetchErr) {
    errors.push(`Fetch error: ${fetchErr.message}`);
    return { sent, whatsapp_sent, email_sent, failed, campaigns: [], errors };
  }

  if (!toSend || toSend.length === 0) {
    console.log(`[Orchestrator] No approved campaigns scheduled for today (source: ${source}).`);
    return { sent, whatsapp_sent, email_sent, failed, campaigns: [], errors };
  }

  console.log(
    `[Orchestrator] Executing ${toSend.length} campaign(s) from ${source}:`,
    toSend.map((c) => `${c.name} [${c.channel ?? (c.send_email ? 'both' : 'whatsapp')}]`).join(', ')
  );

  for (const campaign of toSend) {
    const effectiveChannel = campaign.channel ?? (campaign.send_email ? 'both' : 'whatsapp');
    try {
      const result = await orchestrator.executeSingleCampaign(campaign.id);
      sent += result.sent;

      const hasWhatsApp = effectiveChannel.includes('gallabox') || effectiveChannel === 'whatsapp' || effectiveChannel === 'both';
      const hasEmail = effectiveChannel.includes('omnisend_email') || effectiveChannel === 'email' || effectiveChannel === 'both';

      if (hasWhatsApp) whatsapp_sent += result.sent;
      if (hasEmail) email_sent += result.sent;

      campaignResults.push({ id: campaign.id, name: campaign.name, channel: effectiveChannel, sent: result.sent, status: 'executed' });
      console.log(`[Orchestrator] ✅ "${campaign.name}" — ${result.sent} sent`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed++;
      errors.push(`"${campaign.name}": ${msg}`);
      campaignResults.push({ id: campaign.id, name: campaign.name, channel: effectiveChannel, sent: 0, status: 'failed' });
      console.error(`[Orchestrator] ❌ "${campaign.name}" failed:`, msg);

      // Keep campaign status as approved on error so it stays in Approved tab and can be retried
      await supabase
        .from('campaigns')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', campaign.id);
    }
  }

  return { sent, whatsapp_sent, email_sent, failed, campaigns: campaignResults, errors };
}

// ── GET — Vercel Cron ──────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { promoted, errors: promoteErrors } = await promoteDraftCampaigns();
    const exec = await executeScheduledCampaigns('vercel_cron');
    const allErrors = [...promoteErrors, ...exec.errors];

    return NextResponse.json({
      success: allErrors.length === 0,
      promoted,
      ...exec,
      errors: allErrors,
      timestamp: new Date().toISOString(),
    }, { status: allErrors.length > 0 ? 207 : 200 });
  } catch (err) {
    console.error('[Orchestrator] GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ── POST — N8N scheduled trigger OR single-campaign UI execute ─────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { campaignId, action, source = 'unknown' } = body;

    // ── Path A: single campaign execution (UI) ─────────────────────────────
    // No auth check — user is already authenticated via the browser session.
    if (campaignId) {
      console.log(`[Orchestrator] Single campaign execution: ${campaignId}`);
      const orchestrator = new CampaignOrchestrator();
      const result = await orchestrator.executeSingleCampaign(campaignId);
      return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
    }

    // ── Path B: scheduled / cron trigger (N8N, manual) ────────────────────
    // Requires CRON_SECRET_TOKEN.
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'process_scheduled' || !action) {
      const { promoted, errors: promoteErrors } = await promoteDraftCampaigns();
      const exec = await executeScheduledCampaigns(source);
      const allErrors = [...promoteErrors, ...exec.errors];

      return NextResponse.json({
        success: allErrors.length === 0,
        promoted,
        processed: exec.campaigns.length,
        sent: exec.sent,
        whatsapp_sent: exec.whatsapp_sent,
        email_sent: exec.email_sent,
        failed: exec.failed,
        campaigns: exec.campaigns,
        errors: allErrors,
        timestamp: new Date().toISOString(),
        source,
        message: [
          `Promoted ${promoted} draft(s).`,
          exec.campaigns.length > 0
            ? `Executed ${exec.campaigns.length} campaign(s) — WA: ${exec.whatsapp_sent}, Email: ${exec.email_sent}.`
            : 'No campaigns due today.',
          exec.failed > 0 ? `⚠️ ${exec.failed} failed.` : '',
        ].filter(Boolean).join(' '),
      }, { status: allErrors.length > 0 ? 207 : 200 });
    }

    return NextResponse.json(
      { error: `Unknown action "${action}"`, available_actions: ['process_scheduled'] },
      { status: 400 }
    );

  } catch (err) {
    console.error('[Orchestrator] POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
