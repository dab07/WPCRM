import { NextRequest, NextResponse } from 'next/server';
import { 
  extractBusinessCardFromText, 
  extractBusinessCardFromImage, 
  generateAIResponse, 
  detectIntent 
} from '../../../../../lib/services/external/GeminiService';
import { sendWhatsAppMessage, sendInteractiveMessage } from '../../../../../lib/services/external/WhatsAppService';
import { supabaseAdmin } from '../../../../../supabase/supabase';

const supabase = supabaseAdmin;

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
    } else if (messageType === 'interactive') {
      await handleInteractiveMessage(message, contact, conversation, messageId);
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

  // Handle scheduling intents
  if (intent === 'schedule_call') {
    const callMessage = `📞 *Quick Call Scheduled*

Perfect! I'll arrange a quick 15-30 minute consultation call for you.

Our team will contact you within 24 hours to schedule a convenient time.

In the meantime:
🌐 Learn more: https://zavops.com
📧 Email us: contact@zavops.com

Is there anything specific you'd like to discuss during the call?`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: callMessage
    });
    return;
  }

  if (intent === 'schedule_meeting') {
    const meetingMessage = `🤝 *Detailed Meeting Request*

Excellent! I'll set up a comprehensive meeting to discuss your business needs in detail.

Our business development team will reach out within 24 hours to schedule.

What we'll cover:
• Your current challenges
• Growth opportunities  
• Custom solutions for your business
• Next steps

🌐 More info: https://zavops.com
📧 Contact: contact@zavops.com

What specific areas would you like to focus on?`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: meetingMessage
    });
    return;
  }

  if (intent === 'talk_to_expert') {
    const expertMessage = `💬 *Expert Consultation*

Great choice! I'm connecting you with one of our specialists.

Our expert will be available to chat with you shortly. They can help with:
• Technical questions
• Solution recommendations
• Custom requirements
• Implementation guidance

🌐 Visit: https://zavops.com
📧 Direct contact: expert@zavops.com

What's your main area of interest or challenge?`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: expertMessage
    });
    return;
  }

  // Handle greeting intent with ZavOps information
  if (intent === 'greeting') {
    console.log('[Webhook] 👋 Processing greeting intent');
    
    // Get the greeting response from database
    const { data: aiIntent } = await supabase
      .from('ai_intents')
      .select('response_template')
      .eq('intent_name', 'greeting')
      .eq('is_active', true)
      .single();

    const greetingMessage = aiIntent?.response_template || 
      "Hello! 👋 Welcome to ZavOps! We're excited to connect with you.\nVisit our website: https://zavops.com";

    console.log('[Webhook] Sending greeting message:', greetingMessage.substring(0, 50) + '...');

    // Send first message (greeting from database)
    const result = await sendWhatsAppMessage({
      to: contact.phone_number,
      message: greetingMessage
    });

    console.log('[Webhook] Greeting message result:', result);

    if (result.success) {
      // Save response to database
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          whatsapp_message_id: result.messageId,
          sender_type: 'ai',
          content: greetingMessage,
          message_type: 'text',
          delivery_status: 'sent',
          ai_intent: 'greeting_response',
          ai_confidence: 0.95
        });

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          status: 'ai_handled',
          ai_confidence_score: 0.95,
          last_message_at: new Date().toISOString(),
          last_message_from: 'ai'
        })
        .eq('id', conversation.id);

      console.log('[Webhook] 🕐 Scheduling interactive widget in 3 seconds...');

      // Send follow-up message with interactive buttons after a short delay
      setTimeout(async () => {
        console.log('[Webhook] 🔘 Sending interactive widget...');
        
        // Send interactive message with buttons
        const result2 = await sendInteractiveMessage(
          contact.phone_number,
          "Ready to grow your business? Let's connect! Choose how you'd like to proceed:",
          [
            { id: 'schedule_call', title: '📞 Schedule Call' },
            { id: 'schedule_meeting', title: '🤝 Book Meeting' },
            { id: 'talk_expert', title: '💬 Talk to Expert' }
          ],
          '🗓️ Schedule with ZavOps',
          'Visit zavops.com for more info'
        );

        console.log('[Webhook] Interactive widget result:', result2);

        if (result2.success) {
          // Save follow-up message to database
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              whatsapp_message_id: result2.messageId,
              sender_type: 'ai',
              content: 'Interactive scheduling widget sent',
              message_type: 'interactive',
              delivery_status: 'sent',
              ai_intent: 'scheduling_widget',
              ai_confidence: 0.95
            });
          console.log('[Webhook] ✅ Interactive widget sent and saved to database');
        } else {
          console.error('[Webhook] ❌ Failed to send interactive widget:', result2.error);
        }
      }, 3000); // 3 second delay
    } else {
      console.error('[Webhook] ❌ Failed to send greeting message:', result.error);
    }
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
 * Handle interactive message (button clicks)
 */
async function handleInteractiveMessage(
  message: any,
  contact: any,
  conversation: any,
  messageId: string
) {
  console.log('[Webhook] 🔘 Interactive message received');

  const interactive = message.interactive;
  const buttonReply = interactive?.button_reply;
  const listReply = interactive?.list_reply;
  
  let selectedId = '';
  let selectedTitle = '';

  if (buttonReply) {
    selectedId = buttonReply.id;
    selectedTitle = buttonReply.title;
  } else if (listReply) {
    selectedId = listReply.id;
    selectedTitle = listReply.title;
  }

  console.log('[Webhook] Button clicked:', selectedId, selectedTitle);

  // Save the interaction to database
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      whatsapp_message_id: messageId,
      sender_type: 'customer',
      content: `Button clicked: ${selectedTitle}`,
      message_type: 'interactive',
      delivery_status: 'delivered',
      ai_intent: selectedId,
      metadata: { button_id: selectedId, button_title: selectedTitle }
    });

  // Handle different button actions
  if (selectedId === 'schedule_call') {
    const callMessage = `📞 *Call Scheduling*

Perfect! I'll arrange a quick consultation call for you.

Our team will contact you within 24 hours to schedule a convenient time.

What's the best time to reach you?
• Morning (9 AM - 12 PM)
• Afternoon (12 PM - 5 PM)  
• Evening (5 PM - 8 PM)

📧 Email: contact@zavops.com
🌐 Website: zavops.com`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: callMessage
    });

  } else if (selectedId === 'schedule_meeting') {
    const meetingMessage = `🤝 *Meeting Scheduling*

Excellent! I'll set up a comprehensive meeting to discuss your business needs.

Our business development team will reach out within 24 hours.

Please share:
• Your preferred meeting format (In-person/Video call)
• Best days/times for you
• Specific topics you'd like to discuss

📧 Email: contact@zavops.com
🌐 Website: zavops.com`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: meetingMessage
    });

  } else if (selectedId === 'talk_expert') {
    const expertMessage = `💬 *Expert Consultation*

Great choice! I'm connecting you with one of our specialists.

An expert will be available to chat with you shortly.

In the meantime, feel free to share:
• Your main challenge or goal
• Your industry/business type
• Any specific questions you have

📧 Direct contact: expert@zavops.com
🌐 Website: zavops.com`;

    await sendWhatsAppMessage({
      to: contact.phone_number,
      message: expertMessage
    });
  }

  // Update conversation
  await supabase
    .from('conversations')
    .update({
      status: 'ai_handled',
      last_message_at: new Date().toISOString(),
      last_message_from: 'customer'
    })
    .eq('id', conversation.id);
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