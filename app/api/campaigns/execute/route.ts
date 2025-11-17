import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '../../../../lib/whatsapp-cloud';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Execute a campaign - send messages to all targeted contacts
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      );
    }

    // Get campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Campaign already running or completed' },
        { status: 400 }
      );
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'running' })
      .eq('id', campaignId);

    // Get target contacts
    let query = supabase.from('contacts').select('*');

    if (campaign.target_tags && campaign.target_tags.length > 0) {
      query = query.contains('tags', campaign.target_tags);
    }

    const { data: contacts } = await query;

    if (!contacts || contacts.length === 0) {
      await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          total_recipients: 0
        })
        .eq('id', campaignId);

      return NextResponse.json({
        success: true,
        message: 'No contacts found for campaign'
      });
    }

    // Update total recipients
    await supabase
      .from('campaigns')
      .update({ total_recipients: contacts.length })
      .eq('id', campaignId);

    let sentCount = 0;
    let failedCount = 0;

    // Send messages
    for (const contact of contacts) {
      // Personalize message
      let message = campaign.message_template
        .replace(/\{\{name\}\}/g, contact.name)
        .replace(/\{\{company\}\}/g, contact.company || '')
        .replace(/\{\{email\}\}/g, contact.email || '');

      const result = await sendWhatsAppMessage({
        to: contact.phone_number,
        message
      });

      if (result.success) {
        sentCount++;

        // Get or create conversation
        let { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('contact_id', contact.id)
          .eq('status', 'active')
          .single();

        if (!conversation) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              contact_id: contact.id,
              status: 'active',
              last_message_at: new Date().toISOString(),
              last_message_from: 'agent'
            })
            .select()
            .single();
          conversation = newConv!;
        }

        // Save message
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            whatsapp_message_id: result.messageId,
            sender_type: 'agent',
            content: message,
            message_type: 'text',
            delivery_status: 'sent',
            metadata: { campaign_id: campaignId }
          });

        // Update conversation
        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_from: 'agent'
          })
          .eq('id', conversation.id);
      } else {
        failedCount++;
      }

      // Update campaign progress
      await supabase
        .from('campaigns')
        .update({
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq('id', campaignId);

      // Rate limiting - wait 1 second between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark campaign as completed
    await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: contacts.length
    });

  } catch (error) {
    console.error('[Campaign] Error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
