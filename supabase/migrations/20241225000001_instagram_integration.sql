-- Instagram Integration Schema

-- Social media accounts table
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin')),
  account_id TEXT NOT NULL,
  account_username TEXT NOT NULL,
  access_token TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, account_id)
);

-- Instagram posts/reels table
CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_post_id TEXT UNIQUE NOT NULL,
  account_id UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('reel', 'post', 'story')),
  media_url TEXT NOT NULL,
  permalink TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instagram broadcast rules table
CREATE TABLE IF NOT EXISTS instagram_broadcast_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('reel', 'post', 'story')),
  target_contact_tags TEXT[] DEFAULT '{}',
  hashtag_filters TEXT[] DEFAULT '{}',
  message_template TEXT NOT NULL,
  ai_context_prompt TEXT DEFAULT 'Generate a brief 20-30 word message about this Instagram reel to share with customers',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instagram broadcast logs table
CREATE TABLE IF NOT EXISTS instagram_broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES instagram_posts(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES instagram_broadcast_rules(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  generated_message TEXT NOT NULL,
  whatsapp_message_id TEXT,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_platform ON social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_account ON instagram_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_type ON instagram_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_rules_account ON instagram_broadcast_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_logs_post ON instagram_broadcast_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_logs_contact ON instagram_broadcast_logs(contact_id);

-- Add triggers for updated_at
CREATE TRIGGER update_social_media_accounts_updated_at BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instagram_broadcast_rules_updated_at BEFORE UPDATE ON instagram_broadcast_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();