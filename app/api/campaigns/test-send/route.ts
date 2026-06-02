import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../supabase/supabase';
import { getWhatsAppService } from '../../../../lib/services/external/WhatsAppService';
import { OmnisendService } from '../../../../lib/services/external/OmnisendService';

/**
 * POST /api/campaigns/test-send
 *
 * Creates a test campaign record and sends it to all contacts in the
 * contacts table that have a phone number (WhatsApp) and/or email address.
 *
 * Body (all optional — sensible defaults are used):
 * {
 *   subject?:       string   // email subject
 *   message?:       string   // WhatsApp message text
 *   emailBody?:     string   // email body (plain text or HTML)
 *   channel?:       'whatsapp' | 'email' | 'both'   // default: 'both'
 *   limitContacts?: number   // cap how many contacts to hit (default: no limit)
 * }
 *
 * Returns a summary of what was sent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const channel: 'whatsapp' | 'email' | 'both' = body.channel ?? 'both';
    const subject: string = body.subject ?? '🧪 Test Campaign — Zavops CRM';
    const whatsappMessage: string =
      body.message ??
      `Hi {{name}} 👋\n\nThis is a test campaign from Zavops CRM.\nWe're testing our WhatsApp + Email automation pipeline.\n\nIgnore if you're not expecting this. 🙏`;
    const emailBody: string =
      body.emailBody ??
      `Hi {{name}},\n\nThis is a test email from Zavops CRM.\n\nWe're verifying that our email delivery via Omnisend is working correctly as part of our campaign automation setup.\n\nYou can safely ignore this message.\n\nThanks,\nZavops CRM`;

    const limitContacts: number | null = body.limitContacts ?? null;

    // ── 1. Fetch contacts ───────────────────────────────────────────────────
    let query = supabaseAdmin
      .from('contacts')
      .select('id, name, phone_number, email, first_name, last_name, tags');

    if (limitContacts) query = query.limit(limitContacts);

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      return NextResponse.json({ error: `Failed to fetch contacts: ${contactsError.message}` }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found in the database.' }, { status: 404 });
    }

    console.log(`[Test Campaign] Found ${contacts.length} contacts. Channel: ${channel}`);

    // ── 2. Insert a test campaign record ────────────────────────────────────
    const { data: campaignRow, error: campaignErr } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name: `Test Campaign ${new Date().toISOString().slice(0, 10)}`,
        festival: 'Test',
        message_template: whatsappMessage,
        target_tags: [],
        status: 'approved',
        channel,
        send_email: channel === 'email' || channel === 'both',
        email_subject: subject,
        email_body: emailBody,
        email_attachments: [],
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        scheduled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (campaignErr || !campaignRow) {
      return NextResponse.json({ error: `Failed to create campaign record: ${campaignErr?.message}` }, { status: 500 });
    }

    const campaignId = campaignRow.id;

    // ── 3. Send WhatsApp messages ────────────────────────────────────────────
    const waResults: { contact: string; status: string; error?: string | undefined }[] = [];

    if (channel === 'whatsapp' || channel === 'both') {
      const whatsapp = getWhatsAppService();

      for (const contact of contacts) {
        if (!contact.phone_number) {
          waResults.push({ contact: contact.name, status: 'skipped', error: 'no phone number' });
          continue;
        }

        const personalised = whatsappMessage
          .replace(/\{\{name\}\}/g, contact.first_name ?? contact.name ?? 'Friend');

        try {
          const result = await whatsapp.sendMessage({
            to: contact.phone_number,
            message: personalised,
            type: 'text',
          });

          waResults.push({
            contact: contact.name,
            status: result.success ? 'sent' : 'failed',
            error: result.success ? undefined : result.error,
          });

          // Gentle rate-limit: 200ms between sends
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          waResults.push({
            contact: contact.name,
            status: 'error',
            error: err instanceof Error ? err.message : 'unknown',
          });
        }
      }
    }

    // ── 4. Send Omnisend email campaign (broadcast to all subscribed) ────────
    let emailResult: { success: boolean; campaignId?: string; error?: string } = { success: false };

    if (channel === 'email' || channel === 'both') {
      // First upsert all contacts with emails into Omnisend so they appear in the audience
      const omnisend = new OmnisendService();
      const emailContacts = contacts.filter((c) => c.email);

      console.log(`[Test Campaign] Upserting ${emailContacts.length} email contacts into Omnisend…`);

      for (const contact of emailContacts) {
        try {
          await omnisend.upsertContact({
            email: contact.email,
            firstName: contact.first_name ?? contact.name?.split(' ')[0],
            lastName: contact.last_name ?? contact.name?.split(' ').slice(1).join(' '),
            tags: contact.tags ?? [],
            status: 'subscribed', // must be subscribed to receive campaigns
          });
        } catch (err) {
          console.warn(`[Test Campaign] Failed to upsert ${contact.email}:`, err);
        }
      }

      // Fire the campaign to all subscribed contacts
      emailResult = await omnisend.sendEmailCampaign({
        name: `Test Campaign ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
        subject,
        body: emailBody.replace(/\{\{name\}\}/g, 'there'), // Omnisend personalisation uses its own merge tags
        fromName: 'Zavops CRM',
      });

      console.log('[Test Campaign] Omnisend result:', emailResult);
    }

    // ── 5. Update campaign record with final counts ──────────────────────────
    const waSent = waResults.filter((r) => r.status === 'sent').length;

    await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'executed',
        sent_count: waSent,
        delivered_count: waSent,
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // ── 6. Return summary ────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      campaignId,
      channel,
      contacts_total: contacts.length,
      whatsapp: channel !== 'email' ? {
        attempted: waResults.length,
        sent: waSent,
        failed: waResults.filter((r) => r.status === 'failed' || r.status === 'error').length,
        skipped: waResults.filter((r) => r.status === 'skipped').length,
        details: waResults,
      } : null,
      email: channel !== 'whatsapp' ? {
        omnisend_campaign_id: emailResult.campaignId ?? null,
        success: emailResult.success,
        error: emailResult.error ?? null,
        contacts_upserted: contacts.filter((c) => c.email).length,
        note: 'Omnisend broadcasts to all subscribed contacts. Contacts were upserted before sending.',
      } : null,
    });

  } catch (err) {
    console.error('[Test Campaign] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
