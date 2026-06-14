-- Gallabox integration: add generic integrations table for storing provider credentials
-- This extends the schema without breaking any existing tables.

CREATE TABLE IF NOT EXISTS integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID REFERENCES brands(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,          -- 'gallabox' | 'meta' | 'omnisend' etc.
  label       TEXT,                   -- human-readable name
  api_key     TEXT,
  api_secret  TEXT,
  account_id  TEXT,
  extra       JSONB DEFAULT '{}',     -- provider-specific extra fields
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  last_tested_at  TIMESTAMPTZ,
  test_status     TEXT,               -- 'ok' | 'error' | null
  test_error      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, provider)
);

-- Allow null brand_id rows for single-tenant / pre-brand setups
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_global_provider
  ON integrations (provider) WHERE brand_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_integrations_brand_id  ON integrations(brand_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider  ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON integrations(is_active);

-- updated_at trigger (reuse existing function if it exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_integrations_updated_at
      BEFORE UPDATE ON integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_brand_read" ON integrations
  FOR SELECT USING (
    brand_id IS NULL           -- global / single-tenant row
    OR brand_id = ANY(auth.user_brand_ids())
  );

CREATE POLICY "integrations_brand_write" ON integrations
  FOR ALL USING (
    brand_id IS NULL
    OR brand_id = ANY(auth.user_brand_ids())
  );
