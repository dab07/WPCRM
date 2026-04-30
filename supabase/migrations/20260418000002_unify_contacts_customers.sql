-- [NEW: unify-contacts-customers] — added 2026-04-18
-- Merges the `customers` table into `contacts`.
-- `contacts` becomes the single source of truth for all contact/customer records.
-- New columns are nullable so existing WhatsApp CRM rows are unaffected.

-- ============================================================
-- 1. Add brand-sync columns to contacts (all nullable — existing rows unaffected)
-- ============================================================
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS brand_id             UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS external_id          TEXT,
  ADD COLUMN IF NOT EXISTS orders_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent          NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepts_marketing    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_name           TEXT,
  ADD COLUMN IF NOT EXISTS last_name            TEXT,
  ADD COLUMN IF NOT EXISTS external_created_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_updated_at  TIMESTAMPTZ;

-- ============================================================
-- 2. Drop the old global phone_number unique constraint and replace
--    with a per-brand one (brand_id NULL rows keep the old global unique via partial index)
-- ============================================================
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key;

-- Global uniqueness for legacy WhatsApp CRM rows (brand_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone_global
  ON contacts(phone_number)
  WHERE brand_id IS NULL;

-- Per-brand uniqueness for synced contacts
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_brand_phone
  ON contacts(brand_id, phone_number)
  WHERE brand_id IS NOT NULL;

-- Per-brand uniqueness on external_id + source (mirrors old customers constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_brand_external
  ON contacts(brand_id, external_id, source)
  WHERE brand_id IS NOT NULL AND external_id IS NOT NULL;

-- ============================================================
-- 3. Migrate existing customers rows into contacts
-- ============================================================
INSERT INTO contacts (
  id,
  brand_id,
  external_id,
  source,
  email,
  first_name,
  last_name,
  -- contacts.name = first_name + last_name (fallback to email or external_id)
  name,
  phone_number,
  tags,
  orders_count,
  total_spent,
  accepts_marketing,
  metadata,
  external_created_at,
  external_updated_at,
  created_at,
  updated_at
)
SELECT
  id,
  brand_id,
  external_id,
  source,
  email,
  first_name,
  last_name,
  COALESCE(
    NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
    email,
    external_id
  ) AS name,
  COALESCE(phone, 'unknown-' || id::text) AS phone_number,
  tags,
  orders_count,
  total_spent,
  accepts_marketing,
  metadata,
  external_created_at,
  external_updated_at,
  created_at,
  updated_at
FROM customers
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Add indexes on new columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_brand_id           ON contacts(brand_id);
CREATE INDEX IF NOT EXISTS idx_contacts_orders_count       ON contacts(orders_count);
CREATE INDEX IF NOT EXISTS idx_contacts_external_updated   ON contacts(external_updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_external_id        ON contacts(external_id);

-- ============================================================
-- 5. Drop the customers table (data is now in contacts)
-- ============================================================
DROP TABLE IF EXISTS customers CASCADE;
