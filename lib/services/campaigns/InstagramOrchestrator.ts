import { 
  InstagramPost,
  InstagramService
} from '../external/InstagramService';
import { GeminiService } from '../external/GeminiService';
import { WhatsAppService, getWhatsAppService } from '../external/WhatsAppService';
import { supabaseAdmin } from '../../../supabase/supabase';

export interface InstagramBroadcastResult {
  success: boolean;
  postId?: string;
  totalContacts: number;
  successfulSends: number;
  failedSends: number;
  errors: string[];
}

export class InstagramOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'InstagramOrchestratorError';
  }
}

export class InstagramOrchestrator {
  private instagramService: InstagramService;
  private geminiService: GeminiService;
  private whatsappService: WhatsAppService | null = null;

  constructor() {
    this.instagramService = new InstagramService();
    this.geminiService = new GeminiService();
    // Don't initialize WhatsApp service here - do it lazily
  }

  private getWhatsAppService(): WhatsAppService {
    if (!this.whatsappService) {
      this.whatsappService = getWhatsAppService();
    }
    return this.whatsappService;
  }

  /**
   * Main orchestrator for Instagram reel broadcasts
   * This function is called when a new Instagram reel is posted
   */
  async processInstagramPost(
    post: InstagramPost,
    instagramAccountId: string
  ): Promise<InstagramBroadcastResult> {
    const result: InstagramBroadcastResult = {
      success: false,
      totalContacts: 0,
      successfulSends: 0,
      failedSends: 0,
      errors: []
    };

    try {
      // 1. Find the social media account by Instagram account ID
      const { data: socialAccount, error: accountError } = await supabaseAdmin
        .from('social_media_accounts')
        .select('*')
        .eq('platform', 'instagram')
        .eq('account_id', instagramAccountId)
        .single();

      if (accountError || !socialAccount) {
        const errorMsg = `Instagram account not found in database: ${instagramAccountId}`;
        result.errors.push(errorMsg);
        throw new InstagramOrchestratorError(errorMsg, accountError || undefined);
      }

      // 2. Store the Instagram post in database using the UUID
      const storedPost = await this.instagramService.storeInstagramPost(post, socialAccount.id);
      result.postId = storedPost.id;

      // 3. Get broadcast rules for this account
      const postType = post.media_type === 'VIDEO' ? 'reel' : 'post';
      const broadcastRules = await this.instagramService.getBroadcastRules(socialAccount.id, postType);

      if (broadcastRules.length === 0) {
        const errorMsg = 'No active broadcast rules found for this post type';
        result.errors.push(errorMsg);
        return result;
      }

      // 4. Process each broadcast rule
      for (const rule of broadcastRules) {
        try {
          // Check if post matches hashtag filters
          if (!this.instagramService.matchesHashtagFilters(post.hashtags || [], rule.hashtag_filters)) {
            console.log(`Post doesn't match hashtag filters for rule: ${rule.name}`);
            continue;
          }

          // Get target contacts based on rule tags
          const targetContacts = await this.instagramService.getTargetContacts(rule.target_contact_tags);
          result.totalContacts += targetContacts.length;

          // Generate AI message for this post
          const aiResponse = await this.geminiService.generateInstagramMessage(
            post.permalink,
            post.caption || '',
            post.hashtags || [],
            rule.ai_context_prompt
          );

          if (!aiResponse.success || !aiResponse.data) {
            const errorMsg = `Failed to generate AI message for rule: ${rule.name}`;
            result.errors.push(errorMsg);
            continue;
          }

          // Send to each target contact
          for (const contact of targetContacts) {
            try {
              // Personalize message with contact name
              const personalizedMessage = aiResponse.data.replace(
                /\{name\}/g, 
                contact.name || 'there'
              );

              // Send WhatsApp message
              const whatsappResult = await this.getWhatsAppService().sendMessage({
                to: contact.phone_number,
                message: personalizedMessage
              });

              // Log the broadcast attempt
              await this.instagramService.logBroadcast(
                storedPost.id,
                rule.id,
                contact.id,
                personalizedMessage,
                whatsappResult.messageId,
                whatsappResult.success ? 'sent' : 'failed',
                whatsappResult.error
              );

              if (whatsappResult.success) {
                result.successfulSends++;
              } else {
                result.failedSends++;
                result.errors.push(`Failed to send to ${contact.name}: ${whatsappResult.error}`);
              }

              // Add small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));

            } catch (contactError: any) {
              result.failedSends++;
              const errorMsg = `Error processing contact ${contact.name}: ${contactError.message}`;
              result.errors.push(errorMsg);
              console.error('[Instagram Orchestrator]', errorMsg, contactError);
            }
          }

        } catch (ruleError: any) {
          const errorMsg = `Error processing rule ${rule.name}: ${ruleError.message}`;
          result.errors.push(errorMsg);
          console.error('[Instagram Orchestrator]', errorMsg, ruleError);
        }
      }

      result.success = result.successfulSends > 0;
      return result;

    } catch (error: any) {
      if (error instanceof InstagramOrchestratorError) {
        throw error;
      }
      
      const errorMsg = `Main orchestrator error: ${error.message}`;
      result.errors.push(errorMsg);
      console.error('[Instagram Orchestrator]', errorMsg, error);
      
      throw new InstagramOrchestratorError(errorMsg, error);
    }
  }

  /**
   * Trigger Instagram broadcast via N8N webhook
   * This function can be called from N8N workflows
   */
  async triggerInstagramBroadcast(webhookData: {
    instagram_post_id: string;
    media_type: string;
    media_url: string;
    permalink: string;
    caption?: string;
    account_id: string;
  }): Promise<InstagramBroadcastResult> {
    
    // Convert webhook data to InstagramPost format
    const post: InstagramPost = {
      id: webhookData.instagram_post_id,
      media_type: webhookData.media_type as 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM',
      media_url: webhookData.media_url,
      permalink: webhookData.permalink,
      timestamp: new Date().toISOString(),
      ...(webhookData.caption && { caption: webhookData.caption }),
      hashtags: webhookData.caption ? this.extractHashtags(webhookData.caption) : []
    };

    return await this.processInstagramPost(post, webhookData.account_id);
  }

  /**
   * Extract hashtags from caption
   */
  private extractHashtags(caption: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    return caption.match(hashtagRegex) || [];
  }
}

// Legacy exports for backward compatibility
export async function processInstagramPost(
  post: InstagramPost,
  instagramAccountId: string
): Promise<InstagramBroadcastResult> {
  const orchestrator = new InstagramOrchestrator();
  return orchestrator.processInstagramPost(post, instagramAccountId);
}

export async function triggerInstagramBroadcast(webhookData: {
  instagram_post_id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  caption?: string;
  account_id: string;
}): Promise<InstagramBroadcastResult> {
  const orchestrator = new InstagramOrchestrator();
  return orchestrator.triggerInstagramBroadcast(webhookData);
}