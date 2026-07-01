-- Drop the legacy campaigns_channel_check constraint to allow comma-separated provider channels
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_channel_check;
