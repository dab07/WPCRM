import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../supabase/supabase';
import { CampaignOrchestrator } from '../../../../lib/services/campaigns/CampaignOrchestrator';

/**
 * GET/POST /api/cron/campaigns
 *
 * Campaign lifecycle engine — run this daily (e.g. Vercel Cron at 09:00).
 *
 * What it does in order:
 *  1. PROMOTE  — draft → pending for campaigns entering the 3-month rolling window
 *  2. SEND     — approved campaigns whose scheduled_at date is today get executed
 *               (sends WhatsApp messages via CampaignOrchestrator, marks executed)
 *
 * Secure with CRON_SECRET env var. Pass as ?secret=<value> or
 * Authorization: Bearer <value> header.
 */

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → open (dev only)

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient(true);
  const now = new Date();
  const results = {
    promoted: 0,
    sent: 0,
    errors: [] as string[],
    timestamp: now.toISOString(),
  };

  // ── 1. PROMOTE: draft → pending ──────────────────────────────────────────
  // A campaign enters the 3-month window when its scheduled_at is within
  // the next 90 days from today.
  try {
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 90);

    const { data: promoted, error: promoteErr } = await supabase
      .from('campaigns')
      .update({ status: 'pending', updated_at: now.toISOString() })
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', windowEnd.toISOString())
      .gte('scheduled_at', now.toISOString()) // not already past
      .select('id, name, scheduled_at');

    if (promoteErr) {
      results.errors.push(`Promote error: ${promoteErr.message}`);
    } else {
      results.promoted = promoted?.length ?? 0;
      if (results.promoted > 0) {
        console.log(
          `[Cron Campaigns] Promoted ${results.promoted} draft → pending:`,
          promoted?.map((c) => c.name).join(', ')
        );
      }
    }
  } catch (err) {
    results.errors.push(`Promote exception: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. SEND: approved campaigns scheduled for today ──────────────────────
  // Match on calendar date (not exact timestamp) so campaigns fire on the
  // correct day regardless of what time the cron runs.
  try {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: toSend, error: fetchErr } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('status', 'approved')
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString());

    if (fetchErr) {
      results.errors.push(`Fetch approved error: ${fetchErr.message}`);
    } else if (toSend && toSend.length > 0) {
      console.log(
        `[Cron Campaigns] Sending ${toSend.length} approved campaign(s):`,
        toSend.map((c) => c.name).join(', ')
      );

      const orchestrator = new CampaignOrchestrator();

      for (const campaign of toSend) {
        try {
          const result = await orchestrator.executeSingleCampaign(campaign.id);
          results.sent += result.sent;
          console.log(
            `[Cron Campaigns] ✅ "${campaign.name}" executed — ${result.sent} messages sent`
          );
        } catch (execErr) {
          const msg = execErr instanceof Error ? execErr.message : String(execErr);
          results.errors.push(`Execute "${campaign.name}": ${msg}`);
          console.error(`[Cron Campaigns] ❌ Failed to execute "${campaign.name}":`, execErr);

          // Mark as pending so it can be retried / re-approved
          await supabase
            .from('campaigns')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', campaign.id);
        }
      }
    } else {
      console.log('[Cron Campaigns] No approved campaigns scheduled for today.');
    }
  } catch (err) {
    results.errors.push(`Send exception: ${err instanceof Error ? err.message : String(err)}`);
  }

  const status = results.errors.length > 0 ? 207 : 200;
  return NextResponse.json({ success: results.errors.length === 0, ...results }, { status });
}

// Support manual POST trigger (e.g. from n8n or admin UI)
export async function POST(request: NextRequest) {
  return GET(request);
}
