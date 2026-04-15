-- [NEW: brand-sync + intelligence-pipeline] — added 2026-04-11
-- Adds tables for: brands, customers, orders, abandoned_carts,
-- brand_sync_metadata, opportunities, campaign_assets

-- ============================================================
-- brands
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  domain      TEXT,
  data_synced_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- customers (normalized from Shopify + other sources)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  external_id          TEXT NOT NULL,
  source               TEXT NOT NULL DEFAULT 'shopify', -- shopify | klaviyo | omnisend
  email                TEXT,
  first_name           TEXT,
  last_name            TEXT,
  phone                TEXT,
  tags                 TEXT[] DEFAULT '{}',
  orders_count         INTEGER DEFAULT 0,
  total_spent          NUMERIC(12, 2) DEFAULT 0,
  accepts_marketing    BOOLEAN DEFAULT FALSE,
  metadata             JSONB DEFAULT '{}',
  external_created_at  TIMESTAMPTZ,
  external_updated_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, external_id, source)
);

CREATE INDEX IF NOT EXISTS idx_customers_brand_id ON customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_orders_count ON customers(orders_count);
CREATE INDEX IF NOT EXISTS idx_customers_external_updated_at ON customers(external_updated_at);

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  external_id          TEXT NOT NULL,
  source               TEXT NOT NULL DEFAULT 'shopify',
  customer_external_id TEXT,
  order_number         INTEGER,
  email                TEXT,
  total_price          NUMERIC(12, 2),
  subtotal_price       NUMERIC(12, 2),
  financial_status     TEXT,
  fulfillment_status   TEXT,
  line_items           JSONB DEFAULT '[]',
  external_created_at  TIMESTAMPTZ,
  external_updated_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, external_id, source)
);

CREATE INDEX IF NOT EXISTS idx_orders_brand_id ON orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_external_id ON orders(customer_external_id);

-- ============================================================
-- abandoned_carts
-- ============================================================
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  external_id          TEXT NOT NULL,
  token                TEXT,
  email                TEXT,
  customer_external_id TEXT,
  total_price          NUMERIC(12, 2),
  line_items           JSONB DEFAULT '[]',
  checkout_url         TEXT,
  external_created_at  TIMESTAMPTZ,
  external_updated_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_brand_id ON abandoned_carts(brand_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);

-- ============================================================
-- brand_sync_metadata (stores Klaviyo lists/flows, Omnisend counts, Meta audiences)
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_sync_metadata (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  source     TEXT NOT NULL, -- klaviyo | omnisend | meta_ads
  lists      JSONB,
  flows      JSONB,
  metrics    JSONB,
  audiences  JSONB,
  contacts_count INTEGER,
  campaigns_count INTEGER,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, source)
);

CREATE INDEX IF NOT EXISTS idx_brand_sync_metadata_brand_id ON brand_sync_metadata(brand_id);

-- ============================================================
-- opportunities (AI-detected campaign opportunities)
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  stage             TEXT NOT NULL CHECK (stage IN ('pre_purchase', 'first_purchase', 'post_purchase')),
  title             TEXT NOT NULL,
  description       TEXT,
  target_segment    TEXT,
  estimated_reach   INTEGER DEFAULT 0,
  suggested_channels TEXT[] DEFAULT '{}',
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  reasoning         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending_approval'
                    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'content_generated', 'executed')),
  approved_at       TIMESTAMPTZ,
  approved_by       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_brand_id ON opportunities(brand_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);

-- ============================================================
-- campaign_assets (generated content per channel per opportunity)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id        UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  brand_id              UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  channel               TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'meta_ads')),
  subject               TEXT,         -- email only
  html_content          TEXT,         -- email only
  sms_content           TEXT,         -- sms only
  ad_copy               TEXT,         -- meta_ads only
  ad_headline           TEXT,         -- meta_ads only
  safety_check_passed   BOOLEAN DEFAULT TRUE,
  safety_check_notes    TEXT,
  execution_id          TEXT,         -- Klaviyo campaign ID / Omnisend campaign ID / Meta audience ID
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'confirmed', 'executing', 'executed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_assets_opportunity_id ON campaign_assets(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_brand_id ON campaign_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_status ON campaign_assets(status);
