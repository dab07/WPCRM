import { NextRequest, NextResponse } from 'next/server';
import { 
  extractBusinessCardFromText, 
  generateAIResponse, 
  detectIntent 
} from '../../../../../lib/services/external/GeminiService';
import { sendWhatsAppMessage } from '../../../../../lib/services/external/WhatsAppService';
import { supabaseAdmin } from '../../../../../supabase/supabase';

const supabase = supabaseAdmin;

/**
 * POST - Receive messages from N8N (after WhatsApp webhook processing)
 * This endpoint expects N8N to send the processed WhatsApp message data
 */
export async function POST(request: NextRequest) {
  try {
    // Verify N8N API key
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.N8N_API_KEY;
    
    if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      console.log('[N8N Webhook] ❌ Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[N8N Webhook] 📨 Received:', JSON.stringify(body, null, 2));

    const { from, message, messageId, messageType, contactProfile } = body;

    if (!from || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create contact
    const contact = await getOrCreateContact(from, contactProfile);

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
    console.error('[N8N Webhook] ❌ Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function getOrCreateContact(phoneNumber: string, whatsappContact?: any) {
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (!contact) {
    const name = whatsappContact?.name || phoneNumber;
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
    console.log('[N8N Webhook] 👤 New contact created:', contact.id);
  }

  return contact;
}

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
    console.log('[N8N Webhook] 💬 New conversation created:', conversation.id);
  }

  return conversation;
}

async function handleTextMessage(
  text: string,
  contact: any,
  conversation: any,
  messageId: string
) {
  console.log('[N8N Webhook] 📝 Text message:', text);

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
  
  if (aiResponse.success && aiResponse.data?.response) {
    // Send AI response
    const result = await sendWhatsAppMessage({
      to: contact.phone_number,
      message: aiResponse.data.response
    });

    if (result.success) {
      // Save AI response to database
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          whatsapp_message_id: result.messageId,
          sender_type: 'ai',
          content: aiResponse.data.response,
          message_type: 'text',
          delivery_status: 'sent',
          ai_confidence: aiResponse.confidence
        });

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          status: 'ai_handled',
          ai_confidence_score: aiResponse.confidence,
          last_message_at: new Date().toISOString(),
          last_message_from: 'ai'
        })
        .eq('id', conversation.id);
    }
  }
}

async function handleImageMessage(
  _imageData: any,
  _contact: any,
  _conversation: any,
  _messageId: string
) {
  console.log('[N8N Webhook] 🖼️ Image message received');
  // TODO: Implement image handling similar to the WhatsApp webhook
}

async function handleBusinessCardExtraction(
  text: string,
  contact: any,
  conversation: any,
  imageUrl: string | null
) {
  console.log('[N8N Webhook] 💼 Processing business card...');

  const extractionResult = await extractBusinessCardFromText(text);

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

    // Update contact
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

    // Send confirmation
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

    console.log('[N8N Webhook] ✅ Business card saved');
  }
}