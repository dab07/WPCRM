-- Replace send_email boolean with a proper channel enum
-- Existing data: send_email=true → 'both', send_email=false → 'whatsapp'

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

-- Backfill from existing send_email flag
UPDATE campaigns
  SET channel = CASE
    WHEN send_email = TRUE THEN 'both'
    ELSE 'whatsapp'
  END;

-- Add constraint
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_channel_check;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_channel_check CHECK (
    channel = ANY(ARRAY['whatsapp', 'email', 'both'])
  );

-- Keep send_email for backward compat but derive it from channel
-- (optional: can drop later once all code uses channel)
