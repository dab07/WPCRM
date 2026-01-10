import { supabaseAdmin } from '../../../supabase/supabase';
import { externalServicesConfig } from '../../config/external-services';

export interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string | undefined;
  timestamp: string;
  hashtags?: string[] | undefined;
}

export interface InstagramBroadcastRule {
  id: string;
  name: string;
  account_id: string;
  post_type: 'reel' | 'post' | 'story';
  target_contact_tags: string[];
  hashtag_filters: string[];
  message_template: string;
  ai_context_prompt: string;
  is_active: boolean;
}

export class InstagramServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'InstagramServiceError';
  }
}

export class InstagramService {
  private readonly timeout: number;

  constructor() {
    this.timeout = externalServicesConfig.whatsapp.timeout; // Reuse WhatsApp timeout config
  }

  /**
   * Fetch Instagram posts using Instagram Basic Display API or Graph API
   */
  async fetchInstagramPosts(accessToken: string, userId: string): Promise<InstagramPost[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `https://graph.instagram.com/${userId}/media?fields=id,media_type,media_url,permalink,caption,timestamp&access_token=${accessToken}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new InstagramServiceError(
          `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
          response.status
        );
      }

      const data = await response.json();
      
      return data.data.map((post: any) => ({
        id: post.id,
        media_type: post.media_type,
        media_url: post.media_url,
        permalink: post.permalink,
        caption: post.caption || '',
        timestamp: post.timestamp,
        hashtags: this.extractHashtags(post.caption || '')
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof InstagramServiceError) {
        throw error;
      }
      
      console.error('[Instagram Service] Error fetching posts:', error);
      throw new InstagramServiceError(
        'Failed to fetch Instagram posts',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract hashtags from Instagram caption
   */
  private extractHashtags(caption: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    return caption.match(hashtagRegex) || [];
  }

  /**
   * Store Instagram post in database
   */
  async storeInstagramPost(post: InstagramPost, accountId: string) {
    try {
      const postType = post.media_type === 'VIDEO' ? 'reel' : 'post';
      
      const { data, error } = await supabaseAdmin
        .from('instagram_posts')
        .insert({
          instagram_post_id: post.id,
          account_id: accountId,
          post_type: postType,
          media_url: post.media_url,
          permalink: post.permalink,
          caption: post.caption,
          hashtags: post.hashtags
        })
        .select()
        .single();

      if (error) {
        throw new InstagramServiceError(
          `Failed to store Instagram post: ${error.message}`,
          undefined,
          error
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof InstagramServiceError) {
        throw error;
      }
      
      console.error('[Instagram Service] Error storing post:', error);
      throw new InstagramServiceError(
        'Failed to store Instagram post in database',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get broadcast rules for a specific post type and account
   */
  async getBroadcastRules(accountId: string, postType: 'reel' | 'post'): Promise<InstagramBroadcastRule[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('instagram_broadcast_rules')
        .select('*')
        .eq('account_id', accountId)
        .eq('post_type', postType)
        .eq('is_active', true);

      if (error) {
        throw new InstagramServiceError(
          `Failed to fetch broadcast rules: ${error.message}`,
          undefined,
          error
        );
      }
      
      return data || [];
    } catch (error) {
      if (error instanceof InstagramServiceError) {
        throw error;
      }
      
      console.error('[Instagram Service] Error fetching broadcast rules:', error);
      throw new InstagramServiceError(
        'Failed to fetch broadcast rules from database',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get target contacts based on tags
   */
  async getTargetContacts(tags: string[]): Promise<any[]> {
    try {
      if (tags.length === 0) {
        // If no tags specified, return all contacts
        const { data, error } = await supabaseAdmin
          .from('contacts')
          .select('*');
        
        if (error) {
          throw new InstagramServiceError(
            `Failed to fetch all contacts: ${error.message}`,
            undefined,
            error
          );
        }
        
        return data || [];
      }

      const { data, error } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .overlaps('tags', tags);

      if (error) {
        throw new InstagramServiceError(
          `Failed to fetch target contacts: ${error.message}`,
          undefined,
          error
        );
      }
      
      return data || [];
    } catch (error) {
      if (error instanceof InstagramServiceError) {
        throw error;
      }
      
      console.error('[Instagram Service] Error fetching target contacts:', error);
      throw new InstagramServiceError(
        'Failed to fetch target contacts from database',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if post matches hashtag filters
   */
  matchesHashtagFilters(postHashtags: string[], filterHashtags: string[]): boolean {
    if (filterHashtags.length === 0) return true; // No filters means match all
    
    return filterHashtags.some(filter => 
      postHashtags.some(hashtag => 
        hashtag.toLowerCase().includes(filter.toLowerCase().replace('#', ''))
      )
    );
  }

  /**
   * Log broadcast attempt
   */
  async logBroadcast(
    postId: string,
    ruleId: string,
    contactId: string,
    generatedMessage: string,
    whatsappMessageId?: string,
    deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' = 'pending',
    errorMessage?: string
  ) {
    try {
      const { data, error } = await supabaseAdmin
        .from('instagram_broadcast_logs')
        .insert({
          post_id: postId,
          rule_id: ruleId,
          contact_id: contactId,
          generated_message: generatedMessage,
          whatsapp_message_id: whatsappMessageId,
          delivery_status: deliveryStatus,
          error_message: errorMessage
        })
        .select()
        .single();

      if (error) {
        throw new InstagramServiceError(
          `Failed to log broadcast: ${error.message}`,
          undefined,
          error
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof InstagramServiceError) {
        throw error;
      }
      
      console.error('[Instagram Service] Error logging broadcast:', error);
      throw new InstagramServiceError(
        'Failed to log broadcast in database',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Legacy exports for backward compatibility
export async function fetchInstagramPosts(accessToken: string, userId: string): Promise<InstagramPost[]> {
  const service = new InstagramService();
  return service.fetchInstagramPosts(accessToken, userId);
}

export async function storeInstagramPost(post: InstagramPost, accountId: string) {
  const service = new InstagramService();
  return service.storeInstagramPost(post, accountId);
}

export async function getBroadcastRules(accountId: string, postType: 'reel' | 'post'): Promise<InstagramBroadcastRule[]> {
  const service = new InstagramService();
  return service.getBroadcastRules(accountId, postType);
}

export async function getTargetContacts(tags: string[]): Promise<any[]> {
  const service = new InstagramService();
  return service.getTargetContacts(tags);
}

export function matchesHashtagFilters(postHashtags: string[], filterHashtags: string[]): boolean {
  const service = new InstagramService();
  return service.matchesHashtagFilters(postHashtags, filterHashtags);
}

export async function logBroadcast(
  postId: string,
  ruleId: string,
  contactId: string,
  generatedMessage: string,
  whatsappMessageId?: string,
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' = 'pending',
  errorMessage?: string
) {
  const service = new InstagramService();
  return service.logBroadcast(
    postId,
    ruleId,
    contactId,
    generatedMessage,
    whatsappMessageId,
    deliveryStatus,
    errorMessage
  );
}