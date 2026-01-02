import { NextRequest, NextResponse } from 'next/server';
import {supabase} from '../../../../supabase/supabase';
import { sendWelcomeMessage } from '../../../../lib/whatsapp-cloud';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/contacts/create - Request received');
    const body = await request.json();
    console.log('[API] Request body:', { name: body.name, phone: body.phone_number });

    const { name, phone_number, email, company, tags, source } = body;

    if (!name || !phone_number) {
      console.error('[API] Validation failed: Missing required fields');
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      );
    }

    // Create contact in database
    console.log('[API] Creating contact in database...');
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        name,
        phone_number,
        email: email || null,
        company: company || null,
        tags: tags ? [...tags, 'broadcast'] : ['broadcast'],
        source: source || 'manual',
      })
      .select()
      .single();

    if (contactError) {
      console.error('[API] Database error:', contactError);
      return NextResponse.json(
        { error: contactError.message },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Contact created:', contact.id);

    // Send welcome message via WhatsApp Cloud API
    console.log('[API] 📱 Sending welcome message via WhatsApp Cloud API');
    const messageResult = await sendWelcomeMessage(phone_number, name);

    if (messageResult.success) {
      console.log('[API] ✅ Welcome message sent:', messageResult.messageId);

      // Create conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          status: 'active',
          channel: 'whatsapp',
          last_message_at: new Date().toISOString(),
          last_message_from: 'agent',
        })
        .select()
        .single();

      // Save message to database
      if (conversation) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_type: 'agent',
          content: 'Welcome message sent',
          message_type: 'text',
          delivery_status: 'sent',
          whatsapp_message_id: messageResult.messageId,
        });
      }

      return NextResponse.json({
        success: true,
        contact,
        message: 'Contact created and welcome message sent',
        messageId: messageResult.messageId,
      });
    } else {
      console.error('[API] ⚠️ Message failed:', messageResult.error);

      return NextResponse.json({
        success: true,
        contact,
        warning: 'Contact created but welcome message failed',
        error: messageResult.error,
      });
    }
  } catch (error: any) {
    console.error('[API] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
