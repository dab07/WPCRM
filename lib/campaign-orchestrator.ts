import { format, parseISO } from 'date-fns';
import { generateAIResponse } from './gemini';
import { supabaseAdmin } from '../supabase/supabase';

export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
}

export interface Contact {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  company?: string;
  tags: string[];
  metadata: any;
}

export class CampaignOrchestrator {
  private supabase = supabaseAdmin;

  constructor() {
    // No need to initialize supabase here anymore
  }

  /**
   * Main function called by N8N daily at 9 AM
   * Processes all scheduled campaigns for today
   */
  async processCampaigns(source: string = 'n8n_schedule_trigger') {
    try {
      console.log(`[${source}] Starting campaign processing...`);
      
      // Get campaigns scheduled for today
      const scheduledCampaigns = await this.getTodaysScheduledCampaigns();
      
      if (scheduledCampaigns.length === 0) {
        console.log('No campaigns scheduled for today');
        return { processed: 0, sent: 0, failed: 0 };
      }

      let totalSent = 0;
      let totalFailed = 0;

      // Process each campaign
      for (const campaign of scheduledCampaigns) {
        const result = await this.executeCampaign(campaign);
        totalSent += result.sent;
        totalFailed += result.failed;
      }

      console.log(`Campaign processing completed: ${scheduledCampaigns.length} campaigns, ${totalSent} sent, ${totalFailed} failed`);
      
      return {
        processed: scheduledCampaigns.length,
        sent: totalSent,
        failed: totalFailed
      };

    } catch (error) {
      console.error('Error in campaign processing:', error);
      throw error;
    }
  }

  /**
   * Get campaigns scheduled for today
   */
  private async getTodaysScheduledCampaigns(): Promise<Campaign[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data: campaigns, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_at', `${today}T00:00:00`)
      .lt('scheduled_at', `${today}T23:59:59`);

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      return [];
    }

    // Filter campaigns that should run now (check if scheduled time has passed)
    return (campaigns || []).filter((campaign : Campaign) => {
      if (!campaign.scheduled_at) return false;
      const scheduledTime = parseISO(campaign.scheduled_at);
      return scheduledTime <= new Date();
    });
  }

  /**
   * Execute a single campaign (optimized)
   */
  private async executeCampaign(campaign: Campaign) {
    try {
      console.log(`Executing campaign: ${campaign.name}`);

      // Get eligible contacts first
      const contacts = await this.getEligibleContacts(campaign);
      
      if (contacts.length === 0) {
        console.log(`No eligible contacts for campaign: ${campaign.name}`);
        await this.updateCampaignStatus(campaign.id, 'completed');
        return { sent: 0, failed: 0 };
      }

      // Single update: set status to running and total recipients
      await this.supabase
        .from('campaigns')
        .update({ 
          status: 'running',
          total_recipients: contacts.length 
        })
        .eq('id', campaign.id);

      let sentCount = 0;
      let failedCount = 0;
      let deliveredCount = 0;
      const messageRecords: any[] = [];

      // Process contacts in batches to reduce memory usage
      const BATCH_SIZE = 10;
      for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);
        
        console.log(`[Campaign ${campaign.name}] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(contacts.length/BATCH_SIZE)} (${batch.length} contacts)`);
        
        // Process batch in parallel (but still respect WhatsApp rate limits)
        const batchPromises = batch.map(async (contact, index) => {
          try {
            // Add staggered delay for WhatsApp rate limiting
            await new Promise(resolve => setTimeout(resolve, index * 200));

            // Generate personalized message
            const personalizedMessage = await this.generatePersonalizedMessage(
              campaign.message_template,
              contact,
              campaign.name
            );

            // Send WhatsApp message
            const result = await this.sendWhatsAppMessage(contact.phone_number, personalizedMessage);
            
            if (result.success) {
              // Prepare message record for batch insert
              const conversationId = await this.getOrCreateConversationId(contact.id);
              if (conversationId) {
                messageRecords.push({
                  conversation_id: conversationId,
                  whatsapp_message_id: result.messageId,
                  sender_type: 'ai',
                  content: personalizedMessage,
                  message_type: 'text',
                  ai_intent: `campaign_${campaign.name}`,
                  delivery_status: 'sent',
                  metadata: {
                    campaign_id: campaign.id,
                    campaign_name: campaign.name,
                    contact_id: contact.id
                  }
                });
              }
              
              return { success: true, contact: contact.id, messageId: result.messageId };
            } else {
              console.error(`[Campaign] Failed to send to ${contact.phone_number}: ${result.error}`);
              return { success: false, contact: contact.id, error: result.error };
            }
            
          } catch (error) {
            console.error(`Failed to send message to ${contact.phone_number}:`, error);
            return { success: false, contact: contact.id, error };
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Count results for this batch
        let batchSent = 0;
        let batchFailed = 0;
        
        batchResults.forEach(result => {
          if (result.success) {
            batchSent++;
            sentCount++;
            deliveredCount++; // Assume delivered if sent successfully
          } else {
            batchFailed++;
            failedCount++;
          }
        });

        console.log(`[Campaign ${campaign.name}] Batch completed: ${batchSent} sent, ${batchFailed} failed`);

        // Update campaign progress every batch with explicit logging
        try {
          const { error: updateError } = await this.supabase
            .from('campaigns')
            .update({
              sent_count: sentCount,
              failed_count: failedCount,
              delivered_count: deliveredCount
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`[Campaign] Error updating counts:`, updateError);
          } else {
            console.log(`[Campaign ${campaign.name}] Updated counts: sent=${sentCount}, failed=${failedCount}, delivered=${deliveredCount}`);
          }
        } catch (error) {
          console.error(`[Campaign] Error updating campaign progress:`, error);
        }
      }

      // Batch insert message records
      if (messageRecords.length > 0) {
        console.log(`[Campaign ${campaign.name}] Inserting ${messageRecords.length} message records`);
        const { error: insertError } = await this.supabase
          .from('messages')
          .insert(messageRecords);
        
        if (insertError) {
          console.error(`[Campaign] Error inserting messages:`, insertError);
        }
      }

      // Final campaign update with comprehensive logging
      console.log(`[Campaign ${campaign.name}] Final update: sent=${sentCount}, failed=${failedCount}, delivered=${deliveredCount}`);
      
      const { error: finalUpdateError } = await this.supabase
        .from('campaigns')
        .update({
          status: 'completed',
          sent_count: sentCount,
          failed_count: failedCount,
          delivered_count: deliveredCount
        })
        .eq('id', campaign.id);

      if (finalUpdateError) {
        console.error(`[Campaign] Error in final update:`, finalUpdateError);
        throw new Error(`Failed to update campaign status: ${finalUpdateError.message}`);
      }

      console.log(`Campaign ${campaign.name} completed successfully: ${sentCount} sent, ${failedCount} failed, ${deliveredCount} delivered`);
      
      return { sent: sentCount, failed: failedCount, delivered: deliveredCount };

    } catch (error) {
      console.error(`Error executing campaign ${campaign.name}:`, error);
      
      // Update campaign status to paused with error info
      await this.supabase
        .from('campaigns')
        .update({ 
          status: 'paused',
          // Store error info in metadata if needed
        })
        .eq('id', campaign.id);
        
      throw error;
    }
  }

  /**
   * Get contacts eligible for campaign based on targeting
   */
  private async getEligibleContacts(campaign: Campaign): Promise<Contact[]> {
    let query = this.supabase
      .from('contacts')
      .select('*');

    // Apply tag filtering if specified
    if (campaign.target_tags && campaign.target_tags.length > 0) {
      // PostgreSQL array overlap operator
      query = query.overlaps('tags', campaign.target_tags);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }

    return contacts || [];
  }

  /**
   * Generate personalized message using Gemini AI
   */
  private async generatePersonalizedMessage(
    template: string,
    contact: Contact,
    campaignName: string
  ): Promise<string> {
    try {
      // First, do basic template replacement
      let message = template
        .replace(/\{\{name\}\}/g, contact.name || 'Friend')
        .replace(/\{\{company\}\}/g, contact.company || '')
        .replace(/\{\{phone\}\}/g, contact.phone_number);

      // If template contains AI placeholders or is generic, enhance with Gemini
      if (template.includes('{{ai_enhance}}') || template.length < 50) {
        const prompt = `
You are a WhatsApp marketing expert. Enhance this campaign message to be more engaging and personal:

Campaign: "${campaignName}"
Original message: "${message}"
Customer: ${contact.name} ${contact.company ? `from ${contact.company}` : ''}

Requirements:
- Keep it under 50 words
- Make it personal and conversational
- Include 1-2 relevant emojis
- Maintain professional but friendly tone
- Include a clear call-to-action
- Make it sound natural for WhatsApp

Return only the enhanced message, no explanations.`;

        const aiResponse = await generateAIResponse(prompt);
        
        if (aiResponse.success && aiResponse.response) {
          message = aiResponse.response;
        }
      }

      return message;

    } catch (error) {
      console.error('Error generating personalized message:', error);
      // Fallback to basic template replacement
      return template
        .replace(/\{\{name\}\}/g, contact.name || 'Friend')
        .replace(/\{\{company\}\}/g, contact.company || '')
        .replace(/\{\{phone\}\}/g, contact.phone_number);
    }
  }

  /**
   * Send WhatsApp message (integrate with your WhatsApp API)
   */
  private async sendWhatsAppMessage(phoneNumber: string, message: string) {
    try {
      // Use the existing WhatsApp Cloud API function
      const { sendWhatsAppMessage } = await import('./whatsapp-cloud');
      
      console.log(`[Campaign] Sending to ${phoneNumber}: ${message.substring(0, 50)}...`);
      
      const result = await sendWhatsAppMessage({
        to: phoneNumber,
        message
      });
      
      if (!result.success) {
        throw new Error(`WhatsApp send failed: ${result.error}`);
      }
      
      console.log(`[Campaign] ✅ Message sent to ${phoneNumber}`);
      return result;
      
    } catch (error) {
      console.error(`[Campaign] ❌ Failed to send to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get or create conversation ID (optimized)
   */
  private async getOrCreateConversationId(contactId: string): Promise<string | null> {
    try {
      // Try to get existing conversation
      let { data: conversation } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .single();

      if (conversation) {
        return conversation.id;
      }

      // Create new conversation if none exists
      const { data: newConversation, error } = await this.supabase
        .from('conversations')
        .insert({
          contact_id: contactId,
          status: 'ai_handled',
          last_message_from: 'ai',
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error || !newConversation) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return newConversation.id;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      return null;
    }
  }

  /**
   * Update campaign status
   */
  private async updateCampaignStatus(campaignId: string, status: Campaign['status']) {
    await this.supabase
      .from('campaigns')
      .update({ status })
      .eq('id', campaignId);
  }

  /**
   * Manual campaign creation (for UI)
   */
  async createCampaign(campaignData: {
    name: string;
    message_template: string;
    target_tags?: string[];
    scheduled_at?: string;
  }) {
    const { data, error } = await this.supabase
      .from('campaigns')
      .insert({
        ...campaignData,
        status: campaignData.scheduled_at ? 'scheduled' : 'draft',
        total_recipients: 0,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return data;
  }

  /**
   * Execute a single campaign by ID (for manual triggers)
   */
  async executeSingleCampaign(campaignId: string) {
    try {
      console.log(`Executing single campaign: ${campaignId}`);

      // Get the specific campaign
      const { data: campaign, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      if (campaign.status === 'running') {
        throw new Error('Campaign is already running');
      }

      if (campaign.status === 'completed') {
        throw new Error('Campaign is already completed');
      }

      // Execute the campaign
      const result = await this.executeCampaign(campaign);
      
      console.log(`Single campaign ${campaignId} completed: ${result.sent} sent, ${result.failed} failed`);
      
      return {
        processed: 1,
        sent: result.sent,
        failed: result.failed,
        campaignId: campaignId,
        campaignName: campaign.name
      };

    } catch (error) {
      console.error(`Error executing single campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Get all campaigns for UI
   */
  async getCampaigns() {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    return data || [];
  }
}

// Export singleton instance
export const campaignOrchestrator = new CampaignOrchestrator();