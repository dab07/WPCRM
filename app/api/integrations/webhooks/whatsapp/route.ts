import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  extractBusinessCardFromText, 
  extractBusinessCardFromImage, 
  generateAIResponse, 
  detectIntent 
} from '../../../../../lib/services/external/GeminiService';
import { sendWhatsAppMessage } from '../../../../../lib/services/external/WhatsAppService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

/**
 * GET - Webhook verification (Meta requirement)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] ✅ Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Receive WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] 📨 Received:', JSON.stringify(body, null, 2));

    // Extract message data
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      // Handle status updates
      if (value?.statuses) {
        await handleStatusUpdate(value.statuses[0]);
      }
      return NextResponse.json({ success: true });
    }

    const message = messages[0];
    const from = message.from; // Phone number
    const messageId = message.id;
    const messageType = message.type;

    // Get or create contact
    const contact = await getOrCreateContact(from, value.contacts?.[0]);

    // Get or create conversation
    const conversation = await getOrCreateConversation(contact.id);

    // Handle different message types
    if (messageType === 'text') {
      await handleTextMessage(message, contact, conversation, messageId);
    } else if (messageType === 'image') {
      await handleImageMessage(message, contact, conversation, messageId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] ❌ Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Get or create contact from phone number
 */
async function getOrCreateContact(phoneNumber: string, whatsappContact?: any) {
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (!contact) {
    const name = whatsappContact?.profile?.name || phoneNumber;
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        phone_number: phoneNumber,
        name,
        source: 'whatsapp',
        metadata: { whatsapp_profile: whatsappContact }
      })
      .select()
      .single();

    contact = newContact!;
    console.log('[Webhook] 👤 New contact created:', contact.id);
  }

  return contact;
}

/**
 * Get or create conversation
 */
async function getOrCreateConversation(contactId: string) {
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'active')
    .single();

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({
        contact_id: contactId,
        status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_from: 'customer'
      })
      .select()
      .single();

    conversation = newConversation!;
    console.log('[Webhook] 💬 New conversation created:', conversation.id);
  }

  return conversation;
}

/**
 * Handle text message
 */
async function handleTextMessage(
  message: any,
  contact: any,
  conversation: any,
  messageId: string
) {
  const text = message.text.body;
  console.log('[Webhook] 📝 Text message:', text);

  // Detect intent
  const { intent, confidence } = await detectIntent(text);

  // Save message to database
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      whatsapp_message_id: messageId,
      sender_type: 'customer',
      content: text,
      message_type: 'text',
      delivery_status: 'delivered',
      ai_intent: intent,
      ai_confidence: confidence
    })
    .select()
    .single();

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_from: 'customer'
    })
    .eq('id', conversation.id);

  // Handle business card intent
  if (intent === 'business_card') {
    await handleBusinessCardExtraction(text, contact, conversation, null);
    return;
  }

  // Generate AI response
  const aiResponse = await generateAIResponse(text);
  
  // Fallback response if AI fails
  const responseMessage = aiResponse.success && aiResponse.data?.response 
    ? aiResponse.data.response 
    : "Thank you for your message! We've received it and will get back to you shortly.";
  
  // Send response
  const result = await sendWhatsAppMessage({
    to: contact.phone_number,
    message: responseMessage
  });

  if (result.success) {
    // Save response to database
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        whatsapp_message_id: result.messageId,
        sender_type: 'ai',
        content: responseMessage,
        message_type: 'text',
        delivery_status: 'sent',
        ai_confidence: aiResponse.confidence || 0.5
      });

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        status: 'ai_handled',
        ai_confidence_score: aiResponse.confidence || 0.5,
        last_message_at: new Date().toISOString(),
        last_message_from: 'ai'
      })
      .eq('id', conversation.id);
  }
}

/**
 * Handle image message (business card)
 */
async function handleImageMessage(
  message: any,
  contact: any,
  conversation: any,
  messageId: string
) {
  console.log('[Webhook] 🖼️ Image message received');

  const imageId = message.image.id;
  const caption = message.image.caption || '';

  // Save message to database
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      whatsapp_message_id: messageId,
      sender_type: 'customer',
      content: caption || 'Image received',
      message_type: 'image',
      delivery_status: 'delivered',
      metadata: { image_id: imageId }
    });

  // Download and process image
  const imageUrl = await downloadWhatsAppMedia(imageId);
  
  if (imageUrl) {
    await handleBusinessCardExtraction(caption, contact, conversation, imageUrl);
  }
}

/**
 * Handle business card extraction
 */
async function handleBusinessCardExtraction(
  text: string,
  contact: any,
  conversation: any,
  imageUrl: string | null
) {
  console.log('[Webhook] 💼 Processing business card...');

  let extractionResult;

  if (imageUrl) {
    // Extract from image
    const imageBase64 = await fetchImageAsBase64(imageUrl);
    extractionResult = await extractBusinessCardFromImage(imageBase64);
  } else {
    // Extract from text
    extractionResult = await extractBusinessCardFromText(text);
  }

  if (extractionResult.success && extractionResult.data) {
    // Save business card data
    await supabase
      .from('business_cards')
      .insert({
        contact_id: contact.id,
        conversation_id: conversation.id,
        extracted_data: extractionResult.data,
        raw_text: text,
        image_url: imageUrl,
        confidence_score: extractionResult.confidence
      });

    // Update contact with extracted data
    await supabase
      .from('contacts')
      .update({
        name: extractionResult.data.name || contact.name,
        email: extractionResult.data.email || contact.email,
        company: extractionResult.data.company || contact.company,
        metadata: {
          ...contact.metadata,
          business_card: extractionResult.data
        }
      })
      .eq('id', contact.id);

    // Send confirmation message
    const confirmationMessage = `Thank you! I've saved your business card information:\n\n` +
      `📛 Name: ${extractionResult.data.name || 'N/A'}\n` +
      `🏢 Company: ${extractionResult.data.company || 'N/A'}\n` +
      `📧 Email: ${extractionResult.data.email || 'N/A'}\n` +
      `📱 Phone: ${extractionResult.data.phone || 'N/A'}\n\n` +
      `How can I assist you today?`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: confirmationMessage
    });

    console.log('[Webhook] ✅ Business card saved');
  } else {
    // Send error message
    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: 'I had trouble reading the business card. Could you please send it again or type the information?'
    });
  }
}

/**
 * Handle status updates (delivered, read, etc.)
 */
async function handleStatusUpdate(status: any) {
  const messageId = status.id;
  const newStatus = status.status; // sent, delivered, read, failed

  await supabase
    .from('messages')
    .update({ delivery_status: newStatus })
    .eq('whatsapp_message_id', messageId);

  console.log('[Webhook] 📊 Status updated:', messageId, newStatus);
}

/**
 * Download WhatsApp media
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('[Webhook] Error downloading media:', error);
    return null;
  }
}

/**
 * Fetch image as base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
    }
  });
  
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}