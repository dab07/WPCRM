/**
 * Gallabox Inbound Webhook Handler
 * POST /api/integrations/webhooks/gallabox
 *
 * Responsibilities:
 *  1. Receive inbound WhatsApp messages forwarded by Gallabox
 *  2. Route to AI intent detection + reply (mirrors the Meta webhook handler)
 *  3. Auto-sync unknown contacts: if the sender is NOT in Gallabox contacts,
 *     parse their message / image for business-card data and create the contact.
 *
 * Gallabox webhook body shape (simplified):
 * {
 *   "event": "whatsapp:message:in",
 *   "data": {
 *     "contact": { "id": "...", "phone": "91...", "name": "..." },
 *     "message": {
 *       "id": "...",
 *       "type": "text" | "image" | "interactive",
 *       "text": { "body": "..." },
 *       "image": { "id": "...", "url": "...", "caption": "..." }
 *     },
 *     "channel": { "id": "...", "channelName": "..." }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../supabase/supabase';
import { GeminiService } from '../../../../../lib/services/external/GeminiService';
import { getGallaboxService } from '../../../../../lib/services/external/GallaboxService';

const supabase = supabaseAdmin;
const GALLABOX_WEBHOOK_SECRET = process.env.GALLABOX_WEBHOOK_SECRET ?? '';

// ── Auth: optional shared secret in header ────────────────────────────────────
function isAuthorised(req: NextRequest): boolean {
  if (!GALLABOX_WEBHOOK_SECRET) return true; // not configured → open
  const token =
    req.headers.get('x-gallabox-signature') ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  return token === GALLABOX_WEBHOOK_SECRET;
}

// ── GET — Gallabox might send a verification ping ─────────────────────────────
export async function GET() {
  return NextResponse.json({ status: 'ok', handler: 'gallabox' });
}

// ── POST — Inbound message events ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('[Gallabox Webhook] 📨 Event:', body?.event, JSON.stringify(body?.data?.message?.type));

    const event   = body?.event ?? body?.type ?? '';
    const data    = body?.data ?? body;
    const message = data?.message ?? data?.whatsapp;
    const contactData = data?.contact ?? data?.sender;

    // Only handle inbound message events
    if (!event.includes('message') || event.includes('out')) {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (!message || !contactData?.phone) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const phone      = String(contactData.phone).replace(/^\+/, '').replace(/\D/g, '');
    const messageId  = message.id ?? `gallabox-${Date.now()}`;
    const messageType: string = message.type ?? 'text';
    const channelId  = data?.channel?.id ?? '';

    // ── 1. Ensure contact exists locally ──────────────────────────────────
    const contact = await getOrCreateContact(
      phone,
      contactData.name ?? phone,
      channelId
    );

    // ── 2. Ensure conversation exists locally ─────────────────────────────
    const conversation = await getOrCreateConversation(contact.id);

    // ── 3. Route by message type ──────────────────────────────────────────
    if (messageType === 'text') {
      await handleTextMessage(message, contact, conversation, messageId, channelId);
    } else if (messageType === 'image') {
      await handleImageMessage(message, contact, conversation, messageId, channelId);
    } else if (messageType === 'interactive') {
      await handleInteractiveMessage(message, contact, conversation, messageId, channelId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Gallabox Webhook] ❌ Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getOrCreateContact(phone: string, name: string, _channelId: string) {
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone_number', phone)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('contacts')
    .insert({
      phone_number: phone,
      name:         name || phone,
      source:       'gallabox',
      metadata:     { channel: 'gallabox' },
    })
    .select()
    .single();

  console.log('[Gallabox Webhook] 👤 New local contact:', created?.id);
  return created!;
}

async function getOrCreateConversation(contactId: string) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      contact_id:         contactId,
      status:             'active',
      last_message_at:    new Date().toISOString(),
      last_message_from:  'customer',
    })
    .select()
    .single();

  console.log('[Gallabox Webhook] 💬 New conversation:', created?.id);
  return created!;
}

// ── Auto-sync: check if the contact is in Gallabox; if not, create them ───────
async function maybeAutoSyncToGallabox(
  contact: any,
  extractedData: any,
  _channelId: string
) {
  try {
    const gallabox = await getGallaboxService();
    const existing = await gallabox.findContactByPhone(contact.phone_number);

    if (existing) {
      console.log('[Gallabox Webhook] Contact already in Gallabox:', existing.id);
      return;
    }

    // Build creation params from extracted business-card or contact data
    const params = {
      name:        extractedData?.name || contact.name || contact.phone_number,
      phone:       contact.phone_number,
      email:       extractedData?.email   || contact.email   || undefined,
      company:     extractedData?.company || contact.company || undefined,
      designation: extractedData?.designation ?? undefined,
      website:     extractedData?.website     ?? undefined,
      tags:        ['auto-synced', 'gallabox-webhook'],
    };

    const result = await gallabox.createContact(params);
    if (result.success) {
      console.log('[Gallabox Webhook] ✅ Auto-synced contact to Gallabox:', result.contactId);
      // Update local contact metadata
      await supabase
        .from('contacts')
        .update({ metadata: { ...contact.metadata, gallabox_id: result.contactId } })
        .eq('id', contact.id);
    } else {
      console.warn('[Gallabox Webhook] Auto-sync failed:', result.error);
    }
  } catch (err) {
    console.error('[Gallabox Webhook] Auto-sync error:', err);
  }
}

async function sendReply(to: string, channelId: string, text: string) {
  try {
    const gallabox = await getGallaboxService();
    return gallabox.sendMessage({ to, channelId, type: 'text', text });
  } catch (err) {
    console.error('[Gallabox Webhook] Reply failed:', err);
    return { success: false };
  }
}

async function saveInboundMessage(
  conversationId: string,
  messageId: string,
  content: string,
  type: string,
  intent?: string,
  confidence?: number,
  metadata?: any
) {
  await supabase.from('messages').insert({
    conversation_id:     conversationId,
    whatsapp_message_id: messageId,
    sender_type:         'customer',
    content,
    message_type:        type,
    delivery_status:     'delivered',
    ai_intent:           intent,
    ai_confidence:       confidence,
    metadata,
  });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), last_message_from: 'customer' })
    .eq('id', conversationId);
}

async function saveOutboundMessage(
  conversationId: string,
  messageId: string | undefined,
  content: string,
  intent: string,
  confidence: number
) {
  if (messageId) {
    await supabase.from('messages').insert({
      conversation_id:     conversationId,
      whatsapp_message_id: messageId,
      sender_type:         'ai',
      content,
      message_type:        'text',
      delivery_status:     'sent',
      ai_intent:           intent,
      ai_confidence:       confidence,
    });
  }

  await supabase
    .from('conversations')
    .update({
      status:            'ai_handled',
      ai_confidence_score: confidence,
      last_message_at:   new Date().toISOString(),
      last_message_from: 'ai',
    })
    .eq('id', conversationId);
}

// ── Text message handler ───────────────────────────────────────────────────────
async function handleTextMessage(
  message: any,
  contact: any,
  conversation: any,
  messageId: string,
  channelId: string
) {
  const text: string = message.text?.body ?? message.body ?? '';
  if (!text) return;

  const gemini = new GeminiService();
  const { intent, confidence } = gemini.detectIntent(text);

  await saveInboundMessage(conversation.id, messageId, text, 'text', intent, confidence);

  // Business card detection
  if (intent === 'business_card') {
    await handleBusinessCardText(text, contact, conversation, channelId);
    return;
  }

  // Scheduling / standard intents
  const staticReply = getStaticReply(intent);
  if (staticReply) {
    const res = await sendReply(contact.phone_number, channelId, staticReply);
    await saveOutboundMessage(conversation.id, res.messageId, staticReply, `${intent}_response`, 0.9);
    return;
  }

  // AI-generated reply
  const aiRes = await gemini.generateAIResponse(text);
  const reply = aiRes.success && aiRes.data?.response
    ? aiRes.data.response
    : 'Thank you for your message! We will get back to you shortly.';

  const res = await sendReply(contact.phone_number, channelId, reply);
  await saveOutboundMessage(conversation.id, res.messageId, reply, 'ai_response', aiRes.confidence ?? 0.6);

  // Auto-sync to Gallabox if not already there
  await maybeAutoSyncToGallabox(contact, null, channelId);
}

// ── Image message handler ─────────────────────────────────────────────────────
async function handleImageMessage(
  message: any,
  contact: any,
  conversation: any,
  messageId: string,
  channelId: string
) {
  const imageUrl: string = message.image?.url ?? message.url ?? '';
  const caption: string  = message.image?.caption ?? message.caption ?? '';

  await saveInboundMessage(
    conversation.id, messageId,
    caption || 'Image received', 'image',
    undefined, undefined,
    { image_url: imageUrl }
  );

  if (!imageUrl) {
    await sendReply(
      contact.phone_number, channelId,
      'I received your image but could not process it. Please try again or send as text.'
    );
    return;
  }

  await handleBusinessCardImage(imageUrl, caption, contact, conversation, channelId);
}

// ── Interactive button handler ────────────────────────────────────────────────
async function handleInteractiveMessage(
  message: any,
  contact: any,
  conversation: any,
  messageId: string,
  channelId: string
) {
  const buttonId    = message.interactive?.button_reply?.id    ?? message.buttonId    ?? '';
  const buttonTitle = message.interactive?.button_reply?.title ?? message.buttonTitle ?? '';

  await saveInboundMessage(
    conversation.id, messageId,
    `Button clicked: ${buttonTitle}`, 'interactive',
    buttonId, undefined,
    { button_id: buttonId, button_title: buttonTitle }
  );

  const reply = getStaticReply(buttonId) ?? `You selected: ${buttonTitle}`;
  const res   = await sendReply(contact.phone_number, channelId, reply);
  await saveOutboundMessage(conversation.id, res.messageId, reply, buttonId, 0.95);
}

// ── Business card extraction (text) ──────────────────────────────────────────
async function handleBusinessCardText(
  text: string,
  contact: any,
  conversation: any,
  channelId: string
) {
  const gemini = new GeminiService();
  const result = await gemini.extractBusinessCardFromText(text);

  if (result.success && result.data) {
    await persistBusinessCard(result.data, text, null, contact, conversation, channelId);
    await maybeAutoSyncToGallabox(contact, result.data, channelId);
  } else {
    await sendReply(
      contact.phone_number, channelId,
      'I could not read the business card. Could you send the details as text? e.g. Name, Company, Email, Phone'
    );
  }
}

// ── Business card extraction (image) ─────────────────────────────────────────
async function handleBusinessCardImage(
  imageUrl: string,
  caption: string,
  contact: any,
  conversation: any,
  channelId: string
) {
  try {
    // Download the image and convert to base64 for Gemini Vision
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const gemini = new GeminiService();
    const result = await gemini.extractBusinessCardFromImage(base64);

    if (result.success && result.data) {
      await persistBusinessCard(result.data, caption, imageUrl, contact, conversation, channelId);
      await maybeAutoSyncToGallabox(contact, result.data, channelId);
    } else {
      await sendReply(
        contact.phone_number, channelId,
        'I had trouble reading the business card image. Could you type the details instead?'
      );
    }
  } catch (err) {
    console.error('[Gallabox Webhook] Image business card error:', err);
    await sendReply(
      contact.phone_number, channelId,
      'Sorry, I could not process the image. Please send the business card details as text.'
    );
  }
}

async function persistBusinessCard(
  data: any,
  rawText: string,
  imageUrl: string | null,
  contact: any,
  conversation: any,
  channelId: string
) {
  // Save business card record
  await supabase.from('business_cards').insert({
    contact_id:      contact.id,
    conversation_id: conversation.id,
    extracted_data:  data,
    raw_text:        rawText,
    image_url:       imageUrl,
    confidence_score: 0.85,
  });

  // Update local contact with extracted data
  await supabase
    .from('contacts')
    .update({
      name:    data.name    || contact.name,
      email:   data.email   || contact.email,
      company: data.company || contact.company,
      metadata: { ...contact.metadata, business_card: data },
    })
    .eq('id', contact.id);

  // Confirmation reply
  const confirmation =
    `✅ Business card saved!\n\n` +
    `📛 Name: ${data.name || 'N/A'}\n` +
    `🏢 Company: ${data.company || 'N/A'}\n` +
    `📧 Email: ${data.email || 'N/A'}\n` +
    `📱 Phone: ${data.phone || contact.phone_number}\n\n` +
    `How can I help you today?`;

  const res = await sendReply(contact.phone_number, channelId, confirmation);
  await saveOutboundMessage(conversation.id, res.messageId, confirmation, 'business_card_saved', 0.9);

  console.log('[Gallabox Webhook] ✅ Business card persisted for contact:', contact.id);
}

function getStaticReply(intent: string): string | null {
  const knownIntents: Record<string, string> = {
    greeting:         `Hello! 👋 Welcome! We're excited to connect with you.\n\nHow can we help you today?`,
    schedule_call:    `📞 *Quick Call Scheduled*\n\nOur team will contact you within 24 hours to arrange a convenient time.\n\n📧 contact@zavops.com\n🌐 zavops.com`,
    schedule_meeting: `🤝 *Meeting Request*\n\nOur business development team will reach out within 24 hours.\n\n📧 contact@zavops.com\n🌐 zavops.com`,
    talk_to_expert:   `💬 *Expert Consultation*\n\nConnecting you with a specialist shortly.\n\n📧 expert@zavops.com\n🌐 zavops.com`,
    pricing_inquiry:  `💰 *Pricing Information*\n\nPlease reach out directly for a personalised quote.\n\n📧 contact@zavops.com\n🌐 zavops.com`,
    support_request:  `🛠️ *Support*\n\nOur support team will be with you shortly.\n\n📧 support@zavops.com`,
  };
  return knownIntents[intent] ?? null;
}
