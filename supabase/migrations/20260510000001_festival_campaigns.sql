-- Festival Campaign Management: Add festival-specific columns to campaigns table

-- Add festival and image columns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS festival TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_status TEXT DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 0;

-- Add image_status constraint
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_image_status_check;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_image_status_check CHECK (
    image_status = ANY(ARRAY[
      'not_generated',
      'generating',
      'generated'
    ])
  );

-- Drop old status constraint and add new one with festival lifecycle statuses
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_status_check CHECK (
    status = ANY(ARRAY[
      'draft',
      'pending',
      'to_be_approved',
      'approved',
      'executed',
      'overdue',
      'scheduled',
      'running',
      'completed',
      'paused'
    ])
  );

-- Index for festival queries
CREATE INDEX IF NOT EXISTS idx_campaigns_festival ON campaigns(festival);
CREATE INDEX IF NOT EXISTS idx_campaigns_image_status ON campaigns(image_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);
