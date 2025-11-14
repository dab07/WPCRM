import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppService } from '@/lib/whatsapp';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const whatsappService = createWhatsAppService();

export async function POST(request: NextRequest) {
  try {
    const { conversationId, message, agentId } = await request.json();

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get conversation and contact
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, contacts(*)')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const contact = conversation.contacts;

    // Send via WhatsApp
    const result = await whatsappService.sendMessage({
      to: contact.phone_number,
      message: message,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      );
    }

    // Save message to database
    const { data: savedMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        content: message,
        message_type: 'text',
        delivery_status: 'sent',
        whatsapp_message_id: result.messageId,
      })
      .select()
      .single();

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_from: 'agent',
        status: 'agent_assigned',
        assigned_agent_id: agentId || conversation.assigned_agent_id,
      })
      .eq('id', conversationId);

    return NextResponse.json({
      success: true,
      message: savedMessage,
      whatsappMessageId: result.messageId,
    });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
