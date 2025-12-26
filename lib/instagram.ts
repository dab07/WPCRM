import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  hashtags?: string[];
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

/**
 * Fetch Instagram posts using Instagram Basic Display API or Graph API
 */
export async function fetchInstagramPosts(accessToken: string, userId: string): Promise<InstagramPost[]> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/${userId}/media?fields=id,media_type,media_url,permalink,caption,timestamp&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data.map((post: any) => ({
      id: post.id,
      media_type: post.media_type,
      media_url: post.media_url,
      permalink: post.permalink,
      caption: post.caption || '',
      timestamp: post.timestamp,
      hashtags: extractHashtags(post.caption || '')
    }));
  } catch (error) {
    console.error('[Instagram] Error fetching posts:', error);
    throw error;
  }
}

/**
 * Extract hashtags from Instagram caption
 */
function extractHashtags(caption: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  return caption.match(hashtagRegex) || [];
}

/**
 * Store Instagram post in database
 */
export async function storeInstagramPost(post: InstagramPost, accountId: string) {
  try {
    const postType = post.media_type === 'VIDEO' ? 'reel' : 'post';
    
    const { data, error } = await supabase
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Instagram] Error storing post:', error);
    throw error;
  }
}

/**
 * Get broadcast rules for a specific post type and account
 */
export async function getBroadcastRules(accountId: string, postType: 'reel' | 'post'): Promise<InstagramBroadcastRule[]> {
  try {
    const { data, error } = await supabase
      .from('instagram_broadcast_rules')
      .select('*')
      .eq('account_id', accountId)
      .eq('post_type', postType)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Instagram] Error fetching broadcast rules:', error);
    return [];
  }
}

/**
 * Get target contacts based on tags
 */
export async function getTargetContacts(tags: string[]): Promise<any[]> {
  try {
    if (tags.length === 0) {
      // If no tags specified, return all contacts
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .overlaps('tags', tags);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Instagram] Error fetching target contacts:', error);
    return [];
  }
}

/**
 * Check if post matches hashtag filters
 */
export function matchesHashtagFilters(postHashtags: string[], filterHashtags: string[]): boolean {
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
export async function logBroadcast(
  postId: string,
  ruleId: string,
  contactId: string,
  generatedMessage: string,
  whatsappMessageId?: string,
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' = 'pending',
  errorMessage?: string
) {
  try {
    const { data, error } = await supabase
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Instagram] Error logging broadcast:', error);
    throw error;
  }
}