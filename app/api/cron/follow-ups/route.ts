import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '../../../../lib/whatsapp-cloud';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Rate limiting: Track last execution time
let lastExecutionTime = 0;
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between executions

/**
 * Cron job to send follow-up messages for inactive conversations
 * Run this every hour via cron or n8n scheduler
 * 
 * Logic:
 * 1. Find conversations where last message was from customer
 * 2. Calculate hours since last customer message
 * 3. Match to appropriate follow-up rule based on inactivity duration
 * 4. Ensure we don't send duplicate follow-ups for the same rule
 */
export async function GET() {
  // Rate limiting check
  const now = Date.now();
  if (now - lastExecutionTime < MIN_INTERVAL_MS) {
    const waitTime = Math.ceil((MIN_INTERVAL_MS - (now - lastExecutionTime)) / 1000);
    console.log(`[Follow-ups] ⏸️ Rate limited. Wait ${waitTime}s before next execution.`);
    return NextResponse.json({ 
      message: `Rate limited. Please wait ${waitTime} seconds.`,
      nextAllowedIn: waitTime 
    }, { status: 429 });
  }
  
  lastExecutionTime = now;
  try {
    console.log('[Follow-ups] 🔄 Starting follow-up check...');

    // Get active follow-up rules sorted by inactivity hours (ascending)
    const { data: rules } = await supabase
      .from('follow_up_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_condition', 'inactivity')
      .order('inactivity_hours', { ascending: true });

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules' });
    }

    console.log(`[Follow-ups] Found ${rules.length} active rules`);

    // Find all active conversations where last message was from customer
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .in('status', ['active', 'ai_handled'])
      .eq('last_message_from', 'customer')
      .not('last_message_at', 'is', null);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ message: 'No conversations to check' });
    }

    console.log(`[Follow-ups] Checking ${conversations.length} conversations`);

    let totalSent = 0;
    const now = new Date();

    for (const conversation of conversations) {
      // Calculate hours since last customer message
      const lastMessageTime = new Date(conversation.last_message_at);
      const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

      // Get all follow-up messages we've already sent for this conversation
      const { data: sentFollowUps } = await supabase
        .from('messages')
        .select('metadata')
        .eq('conversation_id', conversation.id)
        .eq('sender_type', 'ai')
        .not('metadata->follow_up_rule_id', 'is', null)
        .gte('created_at', conversation.last_message_at); // Only count follow-ups after last customer message

      const sentRuleIds = new Set(
        sentFollowUps?.map(m => m.metadata?.follow_up_rule_id).filter(Boolean) || []
      );

      // Find the appropriate rule based on inactivity duration
      // Rules are sorted by inactivity_hours ascending (e.g., 72h, 168h, 336h)
      let applicableRule = null;

      for (const rule of rules) {
        const requiredHours = rule.inactivity_hours || 72;
        
        // Check if enough time has passed for this rule
        if (hoursSinceLastMessage >= requiredHours) {
          // Check if we haven't sent this rule yet
          if (!sentRuleIds.has(rule.id)) {
            applicableRule = rule;
            break; // Use the first matching rule (shortest duration not yet sent)
          }
        }
      }

      if (!applicableRule) {
        continue; // No applicable rule for this conversation
      }

      // Send follow-up message
      const message = applicableRule.message_template
        .replace(/\{\{name\}\}/g, conversation.contact.name || 'there')
        .replace(/\{\{company\}\}/g, conversation.contact.company || '');

      console.log(`[Follow-ups] Sending ${applicableRule.name} to ${conversation.contact.name} (${hoursSinceLastMessage.toFixed(1)}h inactive)`);

      const result = await sendWhatsAppMessage({
        to: conversation.contact.phone_number,
        message
      });

      if (result.success) {
        // Save message to database with rule tracking
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            whatsapp_message_id: result.messageId,
            sender_type: 'ai',
            content: message,
            message_type: 'text',
            delivery_status: 'sent',
            metadata: { 
              follow_up_rule_id: applicableRule.id,
              follow_up_rule_name: applicableRule.name,
              hours_inactive: Math.round(hoursSinceLastMessage)
            }
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
        console.log(`[Follow-ups] ✅ Sent "${applicableRule.name}" to ${conversation.contact.name}`);
      } else {
        console.error(`[Follow-ups] ❌ Failed to send to ${conversation.contact.name}:`, result.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} follow-up messages`,
      totalSent,
      totalChecked: conversations.length
    });

  } catch (error) {
    console.error('[Follow-ups] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
