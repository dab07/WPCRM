CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. USER_BRANDS JUNCTION TABLE (user ↔ brand membership)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_user_brands_user_id  ON user_brands(user_id);
CREATE INDEX IF NOT EXISTS idx_user_brands_brand_id ON user_brands(brand_id);

-- ============================================================
-- 3. ADD brand_id TO LEGACY TABLES (non-destructive — nullable first,
--    then backfilled via a default brand, then constrained)
-- ============================================================

-- contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
-- Drop the global phone_number unique constraint; uniqueness is now per-brand
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_brand_phone ON contacts(brand_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_brand_id ON contacts(brand_id);

-- conversations (inherits brand via contact, but explicit brand_id for direct RLS)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_brand_id ON conversations(brand_id);

-- messages (inherits brand via conversation, explicit for RLS)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_brand_id ON messages(brand_id);

-- campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);

-- follow_up_rules
ALTER TABLE follow_up_rules ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_follow_up_rules_brand_id ON follow_up_rules(brand_id);

-- triggers
ALTER TABLE triggers ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_triggers_brand_id ON triggers(brand_id);

-- ai_intents
ALTER TABLE ai_intents ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
-- Drop global unique on intent_name; now unique per brand
ALTER TABLE ai_intents DROP CONSTRAINT IF EXISTS ai_intents_intent_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_intents_brand_name ON ai_intents(brand_id, intent_name);

-- business_cards
ALTER TABLE business_cards ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_business_cards_brand_id ON business_cards(brand_id);

-- workflow_executions
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_brand_id ON workflow_executions(brand_id);

-- social_media_accounts
ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
-- Drop global unique on (platform, account_id); now unique per brand
ALTER TABLE social_media_accounts DROP CONSTRAINT IF EXISTS social_media_accounts_platform_account_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_media_accounts_brand_platform ON social_media_accounts(brand_id, platform, account_id);

-- instagram_posts (inherits brand via account_id → social_media_accounts)
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_instagram_posts_brand_id ON instagram_posts(brand_id);

-- instagram_broadcast_rules
ALTER TABLE instagram_broadcast_rules ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_rules_brand_id ON instagram_broadcast_rules(brand_id);

-- instagram_broadcast_logs
ALTER TABLE instagram_broadcast_logs ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_instagram_broadcast_logs_brand_id ON instagram_broadcast_logs(brand_id);

-- scheduling_requests
ALTER TABLE scheduling_requests ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_scheduling_requests_brand_id ON scheduling_requests(brand_id);

-- ============================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE triggers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_broadcast_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_sync_metadata      ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assets          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. HELPER FUNCTION: returns brand IDs the current user belongs to
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_brand_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT brand_id FROM user_brands WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 6. ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Service role bypasses all RLS (for background workers / orchestrators)
-- This is automatic in Supabase when using the service_role key.

-- ---- users ----
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (id = auth.uid());

-- ---- user_brands ----
CREATE POLICY "user_brands_own_rows" ON user_brands
  FOR ALL USING (user_id = auth.uid());

-- ---- brands ----
CREATE POLICY "brands_member_read" ON brands
  FOR SELECT USING (id = ANY(auth.user_brand_ids()));

CREATE POLICY "brands_owner_write" ON brands
  FOR ALL USING (
    id IN (
      SELECT brand_id FROM user_brands
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ---- brand-scoped tables (generic pattern) ----
-- contacts
CREATE POLICY "contacts_brand_read"  ON contacts FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "contacts_brand_write" ON contacts FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- conversations
CREATE POLICY "conversations_brand_read"  ON conversations FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "conversations_brand_write" ON conversations FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- messages
CREATE POLICY "messages_brand_read"  ON messages FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "messages_brand_write" ON messages FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- campaigns
CREATE POLICY "campaigns_brand_read"  ON campaigns FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "campaigns_brand_write" ON campaigns FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- follow_up_rules
CREATE POLICY "follow_up_rules_brand_read"  ON follow_up_rules FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "follow_up_rules_brand_write" ON follow_up_rules FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- triggers
CREATE POLICY "triggers_brand_read"  ON triggers FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "triggers_brand_write" ON triggers FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- ai_intents
CREATE POLICY "ai_intents_brand_read"  ON ai_intents FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "ai_intents_brand_write" ON ai_intents FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- business_cards
CREATE POLICY "business_cards_brand_read"  ON business_cards FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "business_cards_brand_write" ON business_cards FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- workflow_executions
CREATE POLICY "workflow_executions_brand_read"  ON workflow_executions FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "workflow_executions_brand_write" ON workflow_executions FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- social_media_accounts
CREATE POLICY "social_media_accounts_brand_read"  ON social_media_accounts FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "social_media_accounts_brand_write" ON social_media_accounts FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- instagram_posts
CREATE POLICY "instagram_posts_brand_read"  ON instagram_posts FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "instagram_posts_brand_write" ON instagram_posts FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- instagram_broadcast_rules
CREATE POLICY "instagram_broadcast_rules_brand_read"  ON instagram_broadcast_rules FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "instagram_broadcast_rules_brand_write" ON instagram_broadcast_rules FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- instagram_broadcast_logs
CREATE POLICY "instagram_broadcast_logs_brand_read"  ON instagram_broadcast_logs FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "instagram_broadcast_logs_brand_write" ON instagram_broadcast_logs FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- scheduling_requests
CREATE POLICY "scheduling_requests_brand_read"  ON scheduling_requests FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "scheduling_requests_brand_write" ON scheduling_requests FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- customers
CREATE POLICY "customers_brand_read"  ON customers FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "customers_brand_write" ON customers FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- orders
CREATE POLICY "orders_brand_read"  ON orders FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "orders_brand_write" ON orders FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- abandoned_carts
CREATE POLICY "abandoned_carts_brand_read"  ON abandoned_carts FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "abandoned_carts_brand_write" ON abandoned_carts FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- brand_sync_metadata
CREATE POLICY "brand_sync_metadata_brand_read"  ON brand_sync_metadata FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "brand_sync_metadata_brand_write" ON brand_sync_metadata FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- opportunities
CREATE POLICY "opportunities_brand_read"  ON opportunities FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "opportunities_brand_write" ON opportunities FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- campaign_assets
CREATE POLICY "campaign_assets_brand_read"  ON campaign_assets FOR SELECT USING (brand_id = ANY(auth.user_brand_ids()));
CREATE POLICY "campaign_assets_brand_write" ON campaign_assets FOR ALL    USING (brand_id = ANY(auth.user_brand_ids()));

-- ============================================================
-- 7. TENANT ISOLATION REPORTS (audit trail for test runs)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_isolation_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('PASS', 'FAIL')),
  total_tests   INTEGER NOT NULL,
  passed        INTEGER NOT NULL,
  failed        INTEGER NOT NULL,
  errors        INTEGER NOT NULL,
  report_json   JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only service role can write reports; admins can read
ALTER TABLE tenant_isolation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "isolation_reports_service_write" ON tenant_isolation_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "isolation_reports_admin_read" ON tenant_isolation_reports
  FOR SELECT USING (auth.role() IN ('service_role', 'authenticated'));
