import { createClient } from '@supabase/supabase-js';
import { format, isToday, parseISO } from 'date-fns';
import { generateAIResponse } from './gemini';

interface Campaign {
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

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  company?: string;
  tags: string[];
  metadata: any;
}

export class CampaignOrchestrator {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Main function called by N8N daily at 9 AM
   * Processes all scheduled campaigns for today
   */
  async processCampaigns(source: string = 'n8n_cron') {
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
    return (campaigns || []).filter(campaign => {
      if (!campaign.scheduled_at) return false;
      const scheduledTime = parseISO(campaign.scheduled_at);
      return scheduledTime <= new Date();
    });
  }

  /**
   * Execute a single campaign
   */
  private async executeCampaign(campaign: Campaign) {
    try {
      console.log(`Executing campaign: ${campaign.name}`);

      // Update campaign status to running
      await this.updateCampaignStatus(campaign.id, 'running');

      // Get eligible contacts
      const contacts = await this.getEligibleContacts(campaign);
      
      if (contacts.length === 0) {
        console.log(`No eligible contacts for campaign: ${campaign.name}`);
        await this.updateCampaignStatus(campaign.id, 'completed');
        return { sent: 0, failed: 0 };
      }

      // Update total recipients
      await this.supabase
        .from('campaigns')
        .update({ total_recipients: contacts.length })
        .eq('id', campaign.id);

      let sentCount = 0;
      let failedCount = 0;

      // Send messages to each contact
      for (const contact of contacts) {
        try {
          // Generate personalized message using Gemini AI
          const personalizedMessage = await this.generatePersonalizedMessage(
            campaign.message_template,
            contact,
            campaign.name
          );

          // Send WhatsApp message
          await this.sendWhatsAppMessage(contact.phone_number, personalizedMessage);
          
          // Create message record
          await this.createMessageRecord(contact.id, personalizedMessage, campaign.name);
          
          sentCount++;
          
        } catch (error) {
          console.error(`Failed to send message to ${contact.phone_number}:`, error);
          failedCount++;
        }
      }

      // Update campaign with final counts
      await this.supabase
        .from('campaigns')
        .update({
          status: 'completed',
          sent_count: sentCount,
          failed_count: failedCount,
          delivered_count: sentCount // Assume delivered for now
        })
        .eq('id', campaign.id);

      console.log(`Campaign ${campaign.name} completed: ${sentCount} sent, ${failedCount} failed`);
      
      return { sent: sentCount, failed: failedCount };

    } catch (error) {
      console.error(`Error executing campaign ${campaign.name}:`, error);
      await this.updateCampaignStatus(campaign.id, 'paused');
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
Enhance this message for a WhatsApp campaign called "${campaignName}":
Base message: "${message}"
Customer details: Name: ${contact.name}, Company: ${contact.company || 'N/A'}

Make it more personal and engaging while keeping it professional and concise (max 150 words).
Include appropriate emojis and maintain a warm, friendly tone.
`;

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
    // TODO: Integrate with your WhatsApp Business API
    // This is a placeholder - replace with actual WhatsApp API call
    
    console.log(`Sending to ${phoneNumber}: ${message}`);
    
    // Example implementation:
    // const response = await fetch('/api/whatsapp/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: phoneNumber,
    //     message: message
    //   })
    // });
    
    // if (!response.ok) {
    //   throw new Error(`WhatsApp API error: ${response.status}`);
    // }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Create message record for tracking
   */
  private async createMessageRecord(contactId: string, content: string, campaignName: string) {
    try {
      // Get or create conversation
      let { data: conversation } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .single();

      if (!conversation) {
        const { data: newConversation, error: createError } = await this.supabase
          .from('conversations')
          .insert({
            contact_id: contactId,
            status: 'ai_handled',
            last_message_from: 'ai',
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (createError || !newConversation) {
          console.error('Error creating conversation:', createError);
          return; // Exit early if we can't create conversation
        }
        
        conversation = newConversation;
      }

      // Ensure conversation exists before creating message
      if (!conversation || !conversation.id) {
        console.error('No valid conversation found for contact:', contactId);
        return;
      }

      // Create message record
      await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'ai',
          content: content,
          message_type: 'text',
          ai_intent: `campaign_${campaignName}`,
          delivery_status: 'sent'
        });

    } catch (error) {
      console.error('Error creating message record:', error);
      // Don't throw - message was sent successfully
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