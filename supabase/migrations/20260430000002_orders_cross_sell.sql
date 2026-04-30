-- [NEW: post-purchase-cross-sell] — added 2026-04-30
-- Adds cross_sell_sent_at to orders to prevent duplicate cross-sell sends.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cross_sell_sent_at TIMESTAMPTZ;  -- NULL = not yet sent

CREATE INDEX IF NOT EXISTS idx_orders_cross_sell_sent_at ON orders(cross_sell_sent_at);
