import { GeminiService } from '../external/GeminiService';
import { WhatsAppService, getWhatsAppService } from '../external/WhatsAppService';
import { CampaignImageService } from '../external/CampaignImageService';
import { supabaseAdmin } from '../../../supabase/supabase';
import { getQuarter } from '@/lib/types/api/campaigns';
import { OmnisendService } from '../external/OmnisendService';

export interface Campaign {
  id: string;
  name: string;
  message_template: string;
  target_tags: string[];
  status: 'draft' | 'pending' | 'to_be_approved' | 'approved' | 'executed';
  scheduled_at: string | null;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  festival?: string | null;
  image_url?: string | null;
  executed_at?: string | null;
  /** 'whatsapp' | 'email' | 'both' — source of truth for delivery channel */
  channel?: 'whatsapp' | 'email' | 'both' | null;
  email_subject?: string | null;
  email_body?: string | null;
  email_attachments?: any | null;
  /** @deprecated use channel */
  send_email?: boolean | null;
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
  private omnisendService: OmnisendService;
  private whatsappService: WhatsAppService | null = null;

  constructor() {
    this.geminiService = new GeminiService();
    this.campaignImageService = new CampaignImageService();
    this.omnisendService = new OmnisendService();
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
      const scheduledCampaigns = await this.getTodaysScheduledCampaigns();

      if (scheduledCampaigns.length === 0) {
        console.log('No campaigns scheduled for today');
        return { processed: 0, sent: 0, failed: 0, whatsapp_sent: 0, email_sent: 0, campaigns: [] };
      }

      let totalSent = 0;
      let whatsappSent = 0;
      let emailSent = 0;
      let failed = 0;
      const campaignResults: { id: string; name: string; channel: string; sent: number; status: string }[] = [];

      for (const campaign of scheduledCampaigns) {
        const effectiveChannel: string =
          campaign.channel === 'email' ? 'email'
          : campaign.channel === 'both' ? 'both'
          : campaign.channel === 'whatsapp' ? 'whatsapp'
          : 'whatsapp';

        try {
          const result = await this.executeCampaign(campaign);
          totalSent += result.sent;

          // Attribute sent count to channel(s)
          if (effectiveChannel === 'whatsapp') whatsappSent += result.sent;
          else if (effectiveChannel === 'email') emailSent += result.sent;
          else { whatsappSent += result.sent; emailSent += result.sent; } // both

          campaignResults.push({ id: campaign.id, name: campaign.name, channel: effectiveChannel, sent: result.sent, status: 'executed' });
        } catch (error) {
          failed++;
          console.error(`Failed to execute campaign ${campaign.id}:`, error);
          campaignResults.push({ id: campaign.id, name: campaign.name, channel: effectiveChannel, sent: 0, status: 'failed' });
        }
      }

      console.log(`Campaign processing completed: ${scheduledCampaigns.length} campaigns, ${totalSent} sent (WA: ${whatsappSent}, Email: ${emailSent})`);

      return {
        processed: scheduledCampaigns.length,
        sent: totalSent,
        failed,
        whatsapp_sent: whatsappSent,
        email_sent: emailSent,
        campaigns: campaignResults,
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
        .eq('status', 'approved');

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
        await this.updateCampaignStatus(campaign.id, 'executed');
        return { sent: 0, failed: 0, delivered: 0 };
      }

      // Single update: set status to pending (in-progress marker) and total recipients
      await this.supabase
        .from('campaigns')
        .update({ 
          status: 'approved' // keep approved while sending; flip to executed at end
        })
        .eq('id', campaign.id);

      let sentCount = 0;
      let deliveredCount = 0;
      const messageRecords: any[] = [];

      // ── Resolve effective channel ───────────────────────────────────────────
      const effectiveChannel: 'whatsapp' | 'email' | 'both' =
        campaign.channel === 'email' ? 'email'
        : campaign.channel === 'both' ? 'both'
        : campaign.channel === 'whatsapp' ? 'whatsapp'
        : campaign.send_email ? 'both'
        : 'whatsapp';

      const sendWhatsApp = effectiveChannel === 'whatsapp' || effectiveChannel === 'both';
      const sendEmail    = effectiveChannel === 'email'    || effectiveChannel === 'both';

      // ── STEP 1: Omnisend email — sync contacts then broadcast ONCE ─────────
      // Omnisend is a broadcast platform. We:
      //   a) Upsert every eligible contact (that has an email) into Omnisend
      //      as 'subscribed' so they appear in the audience.
      //   b) Fire ONE campaign to all subscribed contacts.
      // This must happen before the WhatsApp batch loop so the email is sent
      // regardless of per-contact WhatsApp success/failure.
      let emailCampaignFired = false;
      if (sendEmail && campaign.email_subject && campaign.email_body) {
        const emailContacts = contacts.filter((c) => c.email);
        console.log(`[Campaign ${campaign.name}] Syncing ${emailContacts.length} contacts into Omnisend…`);

        // Upsert each contact into Omnisend so they are in the audience
        for (const contact of emailContacts) {
          try {
            const nameParts = (contact.name ?? '').split(' ');
            await this.omnisendService.upsertContact({
              email: contact.email ?? undefined,
              firstName: nameParts[0] ?? undefined,
              lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined,
              tags: contact.tags ?? [],
              status: 'subscribed',
            });
          } catch (err) {
            console.warn(`[Campaign] Omnisend upsert failed for ${contact.email}:`, err);
          }
        }

        // Build email HTML — attach campaign image if available
        const imageHtml = (campaign.image_url && !campaign.image_url.startsWith('data:'))
          ? `<div style="text-align:center;margin-bottom:24px"><img src="${campaign.image_url}" alt="${campaign.name}" style="max-width:600px;width:100%;border-radius:8px"/></div>`
          : '';

        const bodyHtml = imageHtml + campaign.email_body
          .replace(/\{\{name\}\}/g, 'there')          // Omnisend personalisation via merge tags not supported here
          .replace(/\{\{company\}\}/g, '')
          .replace(/\n/g, '<br>');

        // Fire one Omnisend campaign to all subscribed contacts
        const omnisendResult = await this.omnisendService.sendEmailCampaign({
          name: `${campaign.name} — ${new Date().toISOString().slice(0, 10)}`,
          subject: campaign.email_subject,
          body: bodyHtml,
          fromName: 'Zavops CRM',
        });

        if (omnisendResult.success) {
          emailCampaignFired = true;
          console.log(`[Campaign ${campaign.name}] ✅ Omnisend campaign fired: ${omnisendResult.campaignId}`);
        } else {
          console.error(`[Campaign ${campaign.name}] ❌ Omnisend campaign failed:`, omnisendResult.error);
        }
      }

      // ── Resolve campaign image ONCE before the batch loop ──────────────────
      // Only needed when WhatsApp is in the channel mix.
      let campaignImageBase64: string | null = null;
      let campaignImageMimeType = 'image/png';

      if (campaign.image_url && !campaign.image_url.startsWith('data:')) {
        // Fetch the image from Supabase Storage URL and convert to base64
        try {
          const imgResponse = await fetch(campaign.image_url);
          if (imgResponse.ok) {
            const arrayBuffer = await imgResponse.arrayBuffer();
            campaignImageBase64 = Buffer.from(arrayBuffer).toString('base64');
            campaignImageMimeType = imgResponse.headers.get('content-type') || 'image/png';
            console.log(`[Campaign ${campaign.name}] Using pre-approved image from storage`);
          }
        } catch (err) {
          console.warn(`[Campaign ${campaign.name}] Failed to fetch approved image, will regenerate:`, err);
        }
      } else if (campaign.image_url?.startsWith('data:')) {
        // Already a base64 data URL stored as fallback
        const match = campaign.image_url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          campaignImageMimeType = match[1]!;
          campaignImageBase64 = match[2]!;
          console.log(`[Campaign ${campaign.name}] Using pre-approved base64 image`);
        }
      }

      // If no approved image, generate once and reuse for all contacts
      if (!campaignImageBase64) {
        console.log(`[Campaign ${campaign.name}] No approved image found, generating once via Gemini`);
        const onceImageResult = await this.campaignImageService.generateCampaignImage({
          campaignName: campaign.name,
          theme: campaign.festival ?? campaign.name,
        });
        if (onceImageResult?.success && onceImageResult.imageBase64) {
          campaignImageBase64 = onceImageResult.imageBase64;
          campaignImageMimeType = onceImageResult.mimeType ?? 'image/png';
        }
      }

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

            let whatsappSuccess = false;

            // ── WhatsApp send ──────────────────────────────────────────────
            if (sendWhatsApp) {
              const sendParams: any = {
                to: contact.phone_number,
                message: personalizedMessage,
              };

              if (campaignImageBase64) {
                sendParams.type = 'image';
                sendParams.imageBase64 = campaignImageBase64;
                sendParams.imageCaption = personalizedMessage;
                sendParams.imageMimeType = campaignImageMimeType;
              } else {
                console.warn(`[Campaign] No image for ${contact.phone_number}, sending text only`);
                sendParams.type = 'text';
                sendParams.message = `🎉 ${campaign.name}\n\n${personalizedMessage}`;
              }

              const result = await this.getWhatsAppService().sendMessage(sendParams);
              whatsappSuccess = result.success;

              if (result.success) {
                const conversationId = await this.getOrCreateConversationId(contact.id);
                if (conversationId) {
                  messageRecords.push({
                    conversation_id: conversationId,
                    whatsapp_message_id: result.messageId,
                    sender_type: 'ai',
                    content: personalizedMessage,
                    message_type: campaignImageBase64 ? 'image' : 'text',
                    delivery_status: 'sent',
                  });
                }
              } else {
                console.error(`[Campaign] WhatsApp failed for ${contact.phone_number}: ${result.error}`);
              }
            }

            // ── Email send (Omnisend) ──────────────────────────────────────
            // Email is sent as a single Omnisend broadcast BEFORE the batch loop.
            // No per-contact email action needed here.
            if (sendEmail && !contact.email) {
              console.warn(`[Campaign] Note: contact ${contact.id} has no email — excluded from Omnisend broadcast`);
            }

            // Count as sent if at least one channel succeeded
            // For email-only, WhatsApp wasn't attempted — count as success if email broadcast fired
            const overallSuccess = sendWhatsApp ? whatsappSuccess : emailCampaignFired;
            return { success: overallSuccess, contact: contact.id };

          } catch (error) {
            console.error(`Failed to process contact ${contact.phone_number}:`, error);
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
          status: 'executed',
          sent_count: sentCount,
          delivered_count: deliveredCount,
          read_count: 0,
          executed_at: new Date().toISOString(),
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
      
      // Update campaign status to pending on error so it can be retried
      await this.supabase
        .from('campaigns')
        .update({ 
          status: 'pending',
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
  private async updateCampaignStatus(campaignId: string, status: Campaign['status']) {    try {
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
    send_email?: boolean;
    email_subject?: string;
    email_body?: string;
    email_attachments?: any[];
  }) {
    try {
      let initialStatus = 'draft';
      
      if (campaignData.scheduled_at) {
        const campaignQuarter = getQuarter(campaignData.scheduled_at);
        const currentQuarter = getQuarter(new Date().toISOString());
        
        if (campaignQuarter === currentQuarter) {
          initialStatus = 'pending';
        }
      }

      const { data, error } = await this.supabase
        .from('campaigns')
        .insert({
          ...campaignData,
          status: initialStatus, // pending if in current quarter, otherwise draft
          send_email: campaignData.send_email || false,
          email_subject: campaignData.email_subject || null,
          email_body: campaignData.email_body || null,
          email_attachments: campaignData.email_attachments || [],
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

      if (campaign.status === 'executed') {
        throw new CampaignOrchestratorError(
          'Campaign is already executed',
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