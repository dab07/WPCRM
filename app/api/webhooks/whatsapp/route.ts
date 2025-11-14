import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppService } from '../../../../lib/whatsapp';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const whatsappService = createWhatsAppService();

// GET: Webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

  const result = whatsappService.verifyWebhook(
    mode || '',
    token || '',
    challenge || '',
    verifyToken
  );

  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Receive messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse incoming message
    const message = whatsappService.parseWebhookMessage(body);
    
    if (!message || !message.text) {
      return NextResponse.json({ success: true });
    }

    const phoneNumber = message.from;
    const messageContent = message.text.body;

    // Find or create contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (!contact) {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone_number: phoneNumber,
          name: phoneNumber,
          source: 'whatsapp',
          tags: ['new'],
        })
        .select()
        .single();
      
      contact = newContact;
    }

    if (!contact) {
      throw new Error('Failed to create contact');
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          status: 'active',
          channel: 'whatsapp',
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer',
        })
        .select()
        .single();
      
      conversation = newConversation;
    } else {
      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_from: 'customer',
          status: 'active',
        })
        .eq('id', conversation.id);
    }

    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    // Save message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_type: 'customer',
      content: messageContent,
      message_type: 'text',
      delivery_status: 'delivered',
      whatsapp_message_id: message.id,
    });

    // Check if AI should respond
    const shouldAIRespond = await checkAIResponse(conversation.id, messageContent);
    
    if (shouldAIRespond) {
      // Trigger AI response (you can implement this with Gemini API)
      await triggerAIResponse(conversation.id, contact.id, messageContent);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function checkAIResponse(conversationId: string, message: string): Promise<boolean> {
  // Check if conversation is assigned to agent
  const { data: conversation } = await supabase
    .from('conversations')
    .select('assigned_agent_id, status')
    .eq('id', conversationId)
    .single();

  // Don't auto-respond if assigned to agent
  if (conversation?.assigned_agent_id) {
    return false;
  }

  // Check AI intents
  const { data: intents } = await supabase
    .from('ai_intents')
    .select('*')
    .eq('is_active', true);

  if (!intents) return true;

  // Simple keyword matching
  const lowerMessage = message.toLowerCase();
  for (const intent of intents) {
    const keywords = intent.keywords as string[];
    if (keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
      return true;
    }
  }

  return true; // Default to AI response
}

async function triggerAIResponse(conversationId: string, contactId: string, message: string) {
  try {
    // This is a placeholder - implement with Gemini API
    const aiResponse = await generateAIResponse(message);
    
    if (!aiResponse) return;

    // Save AI message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'ai',
      content: aiResponse.message,
      message_type: 'text',
      delivery_status: 'pending',
      ai_confidence: aiResponse.confidence,
    });

    // Send via WhatsApp
    const { data: contact } = await supabase
      .from('contacts')
      .select('phone_number')
      .eq('id', contactId)
      .single();

    if (contact) {
      const result = await whatsappService.sendMessage({
        to: contact.phone_number,
        message: aiResponse.message,
      });

      if (result.success) {
        await supabase
          .from('messages')
          .update({ delivery_status: 'sent' })
          .eq('conversation_id', conversationId)
          .eq('sender_type', 'ai')
          .eq('delivery_status', 'pending');
      }
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_from: 'ai',
        ai_confidence: aiResponse.confidence,
      })
      .eq('id', conversationId);

  } catch (error) {
    console.error('AI response error:', error);
  }
}

async function generateAIResponse(message: string): Promise<{ message: string; confidence: number } | null> {
  // Placeholder - implement with Gemini API
  // You can use the GEMINI_API_KEY from environment
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful customer service assistant. Respond to this customer message professionally and concisely: "${message}"`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (aiMessage) {
      return {
        message: aiMessage,
        confidence: 0.85, // You can implement confidence scoring
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
  }

  return null;
}
