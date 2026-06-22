-- ============================================================
-- 1. Create brand_guidelines table
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_guidelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  content     TEXT,
  file_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by brand
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_brand_id ON brand_guidelines(brand_id);

-- ============================================================
-- 2. Enable RLS on brand_guidelines
-- ============================================================
ALTER TABLE brand_guidelines ENABLE ROW LEVEL SECURITY;

-- Allow members of the brand to read
CREATE POLICY "brand_guidelines_brand_read" ON brand_guidelines 
  FOR SELECT USING (
    brand_id IN (SELECT brand_id FROM user_brands WHERE user_id = auth.uid())
  );

-- Allow members of the brand to write
CREATE POLICY "brand_guidelines_brand_write" ON brand_guidelines 
  FOR ALL USING (
    brand_id IN (SELECT brand_id FROM user_brands WHERE user_id = auth.uid())
  );

-- ============================================================
-- 3. Create Storage Bucket for brand-guidelines
-- ============================================================
DO $$
BEGIN
  -- Check if bucket exists, create if not
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'brand-guidelines'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'brand-guidelines',
      'brand-guidelines',
      true,
      2097152, -- 2MB in bytes
      ARRAY[
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'text/plain'
      ]::text[]
    );
  END IF;
END $$;

-- ============================================================
-- 4. Enable RLS for the brand-guidelines bucket
-- ============================================================
-- Allow anyone to read public files
CREATE POLICY "brand_guidelines_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand-guidelines');

-- Allow authenticated users to upload to brand-guidelines
CREATE POLICY "brand_guidelines_insert_auth" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-guidelines' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their files in brand-guidelines
CREATE POLICY "brand_guidelines_update_auth" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'brand-guidelines' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their files in brand-guidelines
CREATE POLICY "brand_guidelines_delete_auth" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-guidelines' 
    AND auth.role() = 'authenticated'
  );
