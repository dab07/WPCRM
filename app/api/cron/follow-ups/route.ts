import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '../../../../lib/whatsapp-cloud';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Cron job to send follow-up messages for inactive conversations
 * Run this every hour via cron or n8n scheduler
 */
export async function GET() {
  try {
    console.log('[Follow-ups] 🔄 Starting follow-up check...');

    // Get active follow-up rules
    const { data: rules } = await supabase
      .from('follow_up_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_condition', 'inactivity');

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules' });
    }

    let totalSent = 0;

    for (const rule of rules) {
      const inactivityHours = rule.inactivity_hours || 72; // Default 3 days
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - inactivityHours);

      // Find inactive conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*)')
        .eq('status', 'active')
        .eq('last_message_from', 'customer')
        .lt('last_message_at', cutoffTime.toISOString());

      if (!conversations || conversations.length === 0) {
        continue;
      }

      console.log(`[Follow-ups] Found ${conversations.length} inactive conversations for rule: ${rule.name}`);

      for (const conversation of conversations) {
        // Check if we already sent a follow-up recently
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .eq('sender_type', 'ai')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentMessages && recentMessages.length > 0) {
          continue; // Skip if we sent a message in the last 24 hours
        }

        // Send follow-up message
        const message = rule.message_template.replace('{{name}}', conversation.contact.name);

        const result = await sendWhatsAppMessage({
          to: conversation.contact.phone_number,
          message
        });

        if (result.success) {
          // Save message to database
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              whatsapp_message_id: result.messageId,
              sender_type: 'ai',
              content: message,
              message_type: 'text',
              delivery_status: 'sent',
              metadata: { follow_up_rule_id: rule.id }
            });

          // Update conversation
          await supabase
            .from('conversations')
            .update({
              last_message_at: new Date().toISOString(),
              last_message_from: 'ai'
            })
            .eq('id', conversation.id);

          totalSent++;
          console.log(`[Follow-ups] ✅ Sent to ${conversation.contact.name}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} follow-up messages`
    });

  } catch (error) {
    console.error('[Follow-ups] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
