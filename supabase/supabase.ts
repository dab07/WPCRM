import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to get the appropriate client based on context
export function getSupabaseClient(useServiceRole: boolean = false) {
  return useServiceRole ? supabaseAdmin : supabase;
}

// Type-safe database types (you can generate these with Supabase CLI)
export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          name: string;
          phone_number: string;
          email?: string;
          company?: string;
          tags: string[];
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          message_template: string;
          target_tags: string[];
          status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
          scheduled_at: string | null;
          sent_count: number;
          delivered_count: number;
          read_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          contact_id: string;
          status: 'active' | 'ai_handled' | 'agent_assigned' | 'closed';
          last_message_from: 'customer' | 'agent' | 'ai';
          last_message_at: string;
          ai_confidence: number;
          assigned_agent_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          whatsapp_message_id?: string;
          sender_type: 'customer' | 'agent' | 'ai';
          content: string;
          message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
          delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
          ai_intent?: string;
          metadata?: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      instagram_posts: {
        Row: {
          id: string;
          instagram_post_id: string;
          account_id: string;
          post_type: 'reel' | 'post';
          media_url: string;
          permalink: string;
          caption: string;
          hashtags: string[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['instagram_posts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['instagram_posts']['Insert']>;
      };
      instagram_broadcast_rules: {
        Row: {
          id: string;
          account_id: string;
          post_type: 'reel' | 'post';
          target_tags: string[];
          message_template: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['instagram_broadcast_rules']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['instagram_broadcast_rules']['Insert']>;
      };
      instagram_broadcast_logs: {
        Row: {
          id: string;
          post_id: string;
          rule_id: string;
          contact_id: string;
          generated_message: string;
          whatsapp_message_id?: string;
          delivery_status: 'pending' | 'sent' | 'delivered' | 'failed';
          error_message?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['instagram_broadcast_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['instagram_broadcast_logs']['Insert']>;
      };
    };
  };
};