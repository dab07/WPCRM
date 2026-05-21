-- Create the campaign-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-images',
  'campaign-images',
  true,
  2097152,   -- 2 MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Allow anyone (authenticated or anon) to read public images
CREATE POLICY "Public read access for campaign images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-images');

-- Allow authenticated users to upload campaign images
CREATE POLICY "Authenticated users can upload campaign images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campaign-images');

-- Allow authenticated users to update/replace campaign images
CREATE POLICY "Authenticated users can update campaign images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaign-images');

-- Allow authenticated users to delete campaign images
CREATE POLICY "Authenticated users can delete campaign images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaign-images');
