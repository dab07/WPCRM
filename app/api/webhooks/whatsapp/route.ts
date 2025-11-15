import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: Webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Receive messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse WhatsApp webhook format
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
