import { GeminiService } from '../external/GeminiService';
import { WhatsAppService, getWhatsAppService } from '../external/WhatsAppService';
import { CampaignImageService } from '../external/CampaignImageService';
import { supabaseAdmin } from '../../../supabase/supabase';

export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  scheduled_at: string | null;
  sent_count: number;
  delivered_count: number;
  read_count: number;
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

export class CampaignOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly campaignId?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CampaignOrchestratorError';
  }
}

export class CampaignOrchestrator {
  private supabase = supabaseAdmin;
  private geminiService: GeminiService;
  private campaignImageService: CampaignImageService;
  private whatsappService: WhatsAppService | null = null;

  constructor() {
    this.geminiService = new GeminiService();
    this.campaignImageService = new CampaignImageService();
    // Don't initialize WhatsApp service here - do it lazily
  }

  private getWhatsAppService(): WhatsAppService {
    if (!this.whatsappService) {
      this.whatsappService = getWhatsAppService();
    }
    return this.whatsappService;
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

      // Process each campaign
      for (const campaign of scheduledCampaigns) {
        try {
          const result = await this.executeCampaign(campaign);
          totalSent += result.sent;
        } catch (error) {
          console.error(`Failed to execute campaign ${campaign.id}:`, error);
        }
      }

      console.log(`Campaign processing completed: ${scheduledCampaigns.length} campaigns, ${totalSent} sent`);
      
      return {
        processed: scheduledCampaigns.length,
        sent: totalSent
      };

    } catch (error) {
      console.error('Error in campaign processing:', error);
      throw new CampaignOrchestratorError(
        'Failed to process campaigns',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get campaigns scheduled for today
   */
  private async getTodaysScheduledCampaigns(): Promise<Campaign[]> {
    try {
      // Get all scheduled campaigns first
      const { data: campaigns, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'scheduled');

      if (error) {
        throw new CampaignOrchestratorError(
          `Failed to fetch scheduled campaigns: ${error.message}`,
          undefined,
          error
        );
      }

      const today = new Date().toDateString();
      console.log(`[Campaign Orchestrator] Looking for campaigns scheduled for: ${today}`);

      // Filter campaigns scheduled for today and ready to run
      const todaysCampaigns = (campaigns || []).filter((campaign: Campaign) => {
        if (!campaign.scheduled_at) return false;
        
        const scheduledDate = new Date(campaign.scheduled_at);
        const scheduledDateString = scheduledDate.toDateString();
        const isToday = scheduledDateString === today;
        const isTimeToRun = scheduledDate <= new Date();
      
        
        return isToday && isTimeToRun;
      });

      console.log(`[Campaign Orchestrator] Found ${todaysCampaigns.length} campaigns scheduled for today`);
      return todaysCampaigns;
    } catch (error) {
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      throw new CampaignOrchestratorError(
        'Error fetching scheduled campaigns',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
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
        return { sent: 0, failed: 0, delivered: 0 };
      }

      // Single update: set status to running and total recipients
      await this.supabase
        .from('campaigns')
        .update({ 
          status: 'running'
        })
        .eq('id', campaign.id);

      let sentCount = 0;
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

            // Generate campaign image using Gemini AI
            const imageResult = await this.campaignImageService.generateCampaignImage({
              campaignName: campaign.name,
              theme: campaign.name.includes('Festival') ? 'Celebrate with us!' : null
            });

            // Send WhatsApp message with image and caption
            const sendParams: any = {
              to: contact.phone_number,
              message: personalizedMessage
            };

            if (imageResult?.success && imageResult.imageBase64) {
              sendParams.type = 'image';
              sendParams.imageBase64 = imageResult.imageBase64;
              sendParams.imageCaption = personalizedMessage;
              sendParams.imageMimeType = 'image/jpeg';
            } else {
              // Fallback to text if image generation fails
              console.warn(`[Campaign] Image generation failed for ${contact.phone_number}, sending text only`);
              sendParams.type = 'text';
              sendParams.message = `🎉 ${campaign.name}\n\n${personalizedMessage}\n\n📱 Powered by Zavops`;
            }

            const result = await this.getWhatsAppService().sendMessage(sendParams);
            
            if (result.success) {
              // Prepare message record for batch insert
              const conversationId = await this.getOrCreateConversationId(contact.id);
              if (conversationId) {
                messageRecords.push({
                  conversation_id: conversationId,
                  whatsapp_message_id: result.messageId,
                  sender_type: 'ai',
                  content: personalizedMessage,
                  message_type: imageResult?.success ? 'image' : 'text',
                  delivery_status: 'sent'
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
        
        batchResults.forEach(result => {
          if (result.success) {
            batchSent++;
            sentCount++;
            deliveredCount++; // Assume delivered if sent successfully
          }
          // Note: Failed messages are not tracked in the current schema
        });

        console.log(`[Campaign ${campaign.name}] Batch completed: ${batchSent} sent`);

        // Update campaign progress every batch with explicit logging
        try {
          const { error: updateError } = await this.supabase
            .from('campaigns')
            .update({
              sent_count: sentCount,
              delivered_count: deliveredCount,
              read_count: 0
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`[Campaign] Error updating counts:`, updateError);
          } else {
            console.log(`[Campaign ${campaign.name}] Updated counts: sent=${sentCount}, delivered=${deliveredCount}`);
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
      /*
      todo
      if sent count. = 0, then directly throw error 
      */
      // Final campaign update with comprehensive logging
      console.log(`[Campaign ${campaign.name}] Final update: sent=${sentCount}, delivered=${deliveredCount}`);
      
      const { error: finalUpdateError } = await this.supabase
        .from('campaigns')
        .update({
          status: 'completed',
          sent_count: sentCount,
          delivered_count: deliveredCount,
          read_count: 0
        })
        .eq('id', campaign.id);

      if (finalUpdateError) {
        throw new CampaignOrchestratorError(
          `Failed to update campaign status: ${finalUpdateError.message}`,
          campaign.id,
          finalUpdateError
        );
      }

      console.log(`Campaign ${campaign.name} completed successfully: ${sentCount} sent, ${deliveredCount} delivered`);
      
      return { sent: sentCount, delivered: deliveredCount };

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
        
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      
      throw new CampaignOrchestratorError(
        `Failed to execute campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        campaign.id,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get contacts eligible for campaign based on targeting
   */
  private async getEligibleContacts(campaign: Campaign): Promise<Contact[]> {
    try {
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
        throw new CampaignOrchestratorError(
          `Failed to fetch contacts: ${error.message}`,
          campaign.id,
          error
        );
      }

      return contacts || [];
    } catch (error) {
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      throw new CampaignOrchestratorError(
        'Error fetching eligible contacts',
        campaign.id,
        error instanceof Error ? error : undefined
      );
    }
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

        const aiResponse = await this.geminiService.generateAIResponse(prompt);
        
        if (aiResponse.success && aiResponse.data?.response) {
          message = aiResponse.data.response;
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
    try {
      const { error } = await this.supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId);

      if (error) {
        throw new CampaignOrchestratorError(
          `Failed to update campaign status: ${error.message}`,
          campaignId,
          error
        );
      }
    } catch (error) {
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      throw new CampaignOrchestratorError(
        'Error updating campaign status',
        campaignId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Manual campaign creation (for UI)
   */
  async createCampaign(campaignData: {
    name: string;
    message_template: string;
    target_tags?: string[] | undefined;
    scheduled_at?: string | undefined;
  }) {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .insert({
          ...campaignData,
          status: campaignData.scheduled_at ? 'scheduled' : 'draft',
          sent_count: 0,
          delivered_count: 0,
          read_count: 0
        })
        .select()
        .single();

      if (error) {
        throw new CampaignOrchestratorError(
          `Failed to create campaign: ${error.message}`,
          undefined,
          error
        );
      }

      return data;
    } catch (error) {
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      throw new CampaignOrchestratorError(
        'Error creating campaign',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
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
        throw new CampaignOrchestratorError(
          `Campaign not found: ${campaignId}`,
          campaignId,
          error || undefined
        );
      }

      if (campaign.status === 'running') {
        throw new CampaignOrchestratorError(
          'Campaign is already running',
          campaignId
        );
      }

      if (campaign.status === 'completed') {
        throw new CampaignOrchestratorError(
          'Campaign is already completed',
          campaignId
        );
      }

      // Execute the campaign
      const result = await this.executeCampaign(campaign);
      
      console.log(`Single campaign ${campaignId} completed: ${result.sent} sent`);
      
      return {
        processed: 1,
        sent: result.sent,
        delivered: result.delivered,
        campaignId: campaignId,
        campaignName: campaign.name
      };

    } catch (error) {
      console.error(`Error executing single campaign ${campaignId}:`, error);
      
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      
      throw new CampaignOrchestratorError(
        `Failed to execute single campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        campaignId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get all campaigns for UI
   */
  async getCampaigns() {
    try {
      const { data, error } = await this.supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new CampaignOrchestratorError(
          `Failed to fetch campaigns: ${error.message}`,
          undefined,
          error
        );
      }

      return data || [];
    } catch (error) {
      if (error instanceof CampaignOrchestratorError) {
        throw error;
      }
      throw new CampaignOrchestratorError(
        'Error fetching campaigns',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Legacy exports for backward compatibility
export async function processCampaigns(source?: string) {
  const orchestrator = new CampaignOrchestrator();
  return orchestrator.processCampaigns(source);
}

export async function createCampaign(campaignData: {
  name: string;
  message_template: string;
  target_tags?: string[];
  scheduled_at?: string;
}) {
  const orchestrator = new CampaignOrchestrator();
  return orchestrator.createCampaign(campaignData);
}

export async function executeSingleCampaign(campaignId: string) {
  const orchestrator = new CampaignOrchestrator();
  return orchestrator.executeSingleCampaign(campaignId);
}

export async function getCampaigns() {
  const orchestrator = new CampaignOrchestrator();
  return orchestrator.getCampaigns();
}