import { 
  storeInstagramPost, 
  getBroadcastRules, 
  getTargetContacts, 
  matchesHashtagFilters,
  logBroadcast,
  InstagramPost 
} from './instagram';
import { generateInstagramMessage } from './gemini';

export interface InstagramBroadcastResult {
  success: boolean;
  postId?: string;
  totalContacts: number;
  successfulSends: number;
  failedSends: number;
  errors: string[];
}

/**
 * Main orchestrator for Instagram reel broadcasts
 * This function is called when a new Instagram reel is posted
 */
export async function processInstagramPost(
  post: InstagramPost,
  accountId: string
): Promise<InstagramBroadcastResult> {
  const result: InstagramBroadcastResult = {
    success: false,
    totalContacts: 0,
    successfulSends: 0,
    failedSends: 0,
    errors: []
  };

  try {
    // 1. Store the Instagram post in database
    const storedPost = await storeInstagramPost(post, accountId);
    result.postId = storedPost.id;

    // 2. Get broadcast rules for this post type
    const postType = post.media_type === 'VIDEO' ? 'reel' : 'post';
    const broadcastRules = await getBroadcastRules(accountId, postType);

    if (broadcastRules.length === 0) {
      result.errors.push('No active broadcast rules found for this post type');
      return result;
    }

    // 3. Process each broadcast rule
    for (const rule of broadcastRules) {
      try {
        // Check if post matches hashtag filters
        if (!matchesHashtagFilters(post.hashtags || [], rule.hashtag_filters)) {
          console.log(`Post doesn't match hashtag filters for rule: ${rule.name}`);
          continue;
        }

        // Get target contacts based on rule tags
        const targetContacts = await getTargetContacts(rule.target_contact_tags);
        result.totalContacts += targetContacts.length;

        // Generate AI message for this post
        const aiResponse = await generateInstagramMessage(
          post.permalink,
          post.caption || '',
          post.hashtags || [],
          rule.ai_context_prompt
        );

        if (!aiResponse.success || !aiResponse.message) {
          result.errors.push(`Failed to generate AI message for rule: ${rule.name}`);
          continue;
        }

        // Send to each target contact
        for (const contact of targetContacts) {
          try {
            // Personalize message with contact name
            const personalizedMessage = aiResponse.message.replace(
              /\{name\}/g, 
              contact.name || 'there'
            );

            // Send WhatsApp message (integrate with your WhatsApp API)
            const whatsappResult = await sendWhatsAppMessage(
              contact.phone_number,
              personalizedMessage
            );

            // Log the broadcast attempt
            await logBroadcast(
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
            result.errors.push(`Error processing contact ${contact.name}: ${contactError.message}`);
          }
        }

      } catch (ruleError: any) {
        result.errors.push(`Error processing rule ${rule.name}: ${ruleError.message}`);
      }
    }

    result.success = result.successfulSends > 0;
    return result;

  } catch (error: any) {
    result.errors.push(`Main orchestrator error: ${error.message}`);
    return result;
  }
}

/**
 * Send WhatsApp message (placeholder - integrate with your WhatsApp API)
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // This is where you'd integrate with your WhatsApp Business API
    // For now, this is a placeholder that simulates the API call
    
    // Example integration with WhatsApp Business API:
    
    /*
    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      })
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messages[0].id
    };
    */
    // Placeholder simulation
    console.log(`[WhatsApp] Sending to ${phoneNumber}: ${message}`);
    
    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'Simulated delivery failure'
      };
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Trigger Instagram broadcast via N8N webhook
 * This function can be called from N8N workflows
 */
export async function triggerInstagramBroadcast(webhookData: {
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
    caption: webhookData.caption,
    timestamp: new Date().toISOString(),
    hashtags: webhookData.caption ? extractHashtags(webhookData.caption) : []
  };

  return await processInstagramPost(post, webhookData.account_id);
}

/**
 * Extract hashtags from caption
 */
function extractHashtags(caption: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  return caption.match(hashtagRegex) || [];
}