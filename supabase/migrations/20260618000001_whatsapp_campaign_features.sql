-- Add new columns for WhatsApp campaign features
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS wa_campaign_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS wa_button_text text,
ADD COLUMN IF NOT EXISTS wa_button_url text,
ADD COLUMN IF NOT EXISTS discount_code text,
ADD COLUMN IF NOT EXISTS discount_percentage numeric;

-- Comment on new columns
COMMENT ON COLUMN campaigns.wa_campaign_type IS 'Type of WhatsApp campaign (e.g., standard, discount, url_button)';
COMMENT ON COLUMN campaigns.wa_button_text IS 'Text for the WhatsApp interactive button';
COMMENT ON COLUMN campaigns.wa_button_url IS 'URL for the WhatsApp interactive button';
COMMENT ON COLUMN campaigns.discount_code IS 'Discount code for discount campaigns';
COMMENT ON COLUMN campaigns.discount_percentage IS 'Discount percentage for discount campaigns';
