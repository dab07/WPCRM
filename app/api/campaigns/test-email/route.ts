import { NextRequest, NextResponse } from 'next/server';
import { OmnisendService } from '../../../../lib/services/external/OmnisendService';

/**
 * POST /api/campaigns/test-email
 * Sends a single test email to one address via Omnisend.
 * For testing only — not gated by auth.
 *
 * Body (all optional):
 * {
 *   to?:      string  // defaults to 7novharshit@gmail.com
 *   subject?: string
 *   body?:    string
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const to: string      = body.to      ?? '7novharshit@gmail.com';
  const subject: string = body.subject ?? '🧪 Test Email — Zavops CRM';
  const emailBody: string = body.body  ??
    `Hi there,\n\nThis is a test email from Zavops CRM to verify Omnisend delivery is working.\n\nIf you received this, everything is set up correctly! ✅\n\nThanks,\nZavops CRM`;

  const omnisend = new OmnisendService();

  // 1. Upsert this single contact as subscribed so they receive the campaign
  console.log(`[Test Email] Upserting ${to} into Omnisend…`);
  try {
    await omnisend.upsertContact({
      email: to,
      firstName: 'Harshit',
      status: 'subscribed',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, step: 'upsert', error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // 2. Fire a campaign — Omnisend will send it to all subscribed contacts
  //    (which at minimum includes the one we just upserted)
  console.log(`[Test Email] Firing Omnisend campaign to ${to}…`);
  const result = await omnisend.sendEmailCampaign({
    name: `Test Email ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
    subject,
    body: emailBody,
    fromName: 'Zavops CRM',
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, step: 'send', error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    to,
    omnisend_campaign_id: result.campaignId,
    message: `Campaign fired — Omnisend will deliver to ${to} and any other subscribed contacts.`,
  });
}
