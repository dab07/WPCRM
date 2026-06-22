/**
 * POST /api/test/send
 *
 * Quick smoke-test for Gallabox (WhatsApp) and Omnisend (email) integrations.
 *
 * Body:
 * {
 *   channel: "whatsapp" | "email" | "both",
 *
 *   // WhatsApp fields (required when channel = "whatsapp" | "both")
 *   phone:      "919876543210",   // international format, no +
 *   message:    "Hello from CRM test!",
 *   channelId?: "your-gallabox-channel-id",  // optional
 *
 *   // Email fields (required when channel = "email" | "both")
 *   subject?:  "Test Email",
 *   body?:     "This is a test email from the CRM.",
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGallaboxService } from '../../../../lib/services/external/GallaboxService';
import { getOmnisendService } from '../../../../lib/services/external/OmnisendService';

export async function POST(request: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { channel = 'both', phone, message, channelId, subject, emailBody } = body;
  const results: Record<string, any> = {};

  // ── WhatsApp via Gallabox ──────────────────────────────────────────────────
  if (channel === 'whatsapp' || channel === 'both') {
    if (!phone || !message) {
      return NextResponse.json(
        { error: 'phone and message are required for WhatsApp test' },
        { status: 400 }
      );
    }

    try {
      const gallabox = await getGallaboxService();
      const result = await gallabox.sendMessage({
        to: phone,
        channelId: channelId ?? undefined,
        type: 'text',
        text: message,
      });
      results.whatsapp = result;
    } catch (err) {
      results.whatsapp = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ── Email via Omnisend ─────────────────────────────────────────────────────
  if (channel === 'email' || channel === 'both') {
    try {
      const omnisend = await getOmnisendService();
      const result = await omnisend.sendEmailCampaign({
        name: `CRM Test Email — ${new Date().toISOString()}`,
        subject: subject ?? 'CRM Test Email',
        body: emailBody ?? 'This is a test email sent from the CRM integration test endpoint.',
        fromName: 'CRM Test',
      });
      results.email = result;
    } catch (err) {
      results.email = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  const allOk = Object.values(results).every((r: any) => r?.success === true);

  return NextResponse.json(
    { success: allOk, results },
    { status: allOk ? 200 : 207 }   // 207 = partial success
  );
}
