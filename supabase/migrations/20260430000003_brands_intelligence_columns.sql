-- [NEW: daily-intelligence-agent] — added 2026-04-30
-- Adds brand-level intelligence columns required by the daily n8n agent.
-- brand_category and email_platform already exist (added in 20260430000001).

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS active                   BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avg_order_value          NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS avg_repurchase_gap_days  INTEGER,
  ADD COLUMN IF NOT EXISTS max_discount_pct         INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_selling_products     JSONB       DEFAULT '[]';

-- Index so the daily agent can cheaply fetch only active brands
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(active) WHERE active = TRUE;

COMMENT ON COLUMN brands.active                  IS 'Set false to exclude brand from daily intelligence runs';
COMMENT ON COLUMN brands.avg_order_value         IS 'Rolling average order value in brand currency';
COMMENT ON COLUMN brands.avg_repurchase_gap_days IS 'Average days between consecutive purchases for this brand';
COMMENT ON COLUMN brands.max_discount_pct        IS 'Maximum discount % the brand allows in campaigns (0 = no discounts)';
COMMENT ON COLUMN brands.top_selling_products    IS 'Array of {title, product_type} for top 10 products, refreshed on sync';
