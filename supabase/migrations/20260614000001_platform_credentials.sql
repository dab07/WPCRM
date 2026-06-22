-- Migration: platform_credentials table
-- Creates the encrypted credential store with RLS and audit trigger.
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

CREATE TABLE IF NOT EXISTS platform_credentials (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_name     TEXT        NOT NULL
                                CHECK (platform_name IN ('gallabox','omnisend','shopify','meta_ads','klaviyo','gemini','openweathermap')),
  encrypted_payload TEXT        NOT NULL,   -- base64 AES-256-GCM ciphertext + auth tag
  encrypted_dek     TEXT        NOT NULL,   -- base64 [ dekIv | encryptedDek | dekAuthTag ]
  iv                TEXT        NOT NULL,   -- base64 96-bit payload IV
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at  TIMESTAMPTZ,
  UNIQUE (user_id, platform_name)
);

-- Enable Row-Level Security
ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;

-- Owner policy: users can SELECT, INSERT, UPDATE, DELETE only their own rows
CREATE POLICY "platform_credentials_owner"
  ON platform_credentials
  FOR ALL
  USING (user_id = auth.uid());

-- Auto-update updated_at on every UPDATE (reuses the shared trigger function)
CREATE TRIGGER update_platform_credentials_updated_at
  BEFORE UPDATE ON platform_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
