-- Add brand_label column to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_label TEXT;

-- Update existing campaigns to have 'Zavops' as their brand_label by default
-- since that is our existing default brand guideline label
UPDATE campaigns SET brand_label = 'Zavops' WHERE brand_label IS NULL;
