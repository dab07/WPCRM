-- [NEW: abandoned-cart-recovery] — added 2026-04-30
-- Adds columns required for the cart recovery n8n workflows.

-- ============================================================
-- 1. abandoned_carts — add reminder tracking columns
-- ============================================================
ALTER TABLE abandoned_carts
  ADD COLUMN IF NOT EXISTS reminded_at  TIMESTAMPTZ,          -- when the reminder was last sent
  ADD COLUMN IF NOT EXISTS recovered    BOOLEAN NOT NULL DEFAULT FALSE; -- true once a purchase follows

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovered    ON abandoned_carts(recovered);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_reminded_at  ON abandoned_carts(reminded_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created_at   ON abandoned_carts(external_created_at);

-- ============================================================
-- 2. brands — add email platform + category for content generation
-- ============================================================
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_category  TEXT,                          -- e.g. "fashion", "electronics"
  ADD COLUMN IF NOT EXISTS email_platform  TEXT DEFAULT 'klaviyo'
    CHECK (email_platform IN ('klaviyo', 'omnisend'));                    -- which ESP to use
