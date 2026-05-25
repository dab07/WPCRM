-- Allow anonymous (unauthenticated) uploads and management of campaign images
-- Drop the strict 'TO authenticated' policies
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete campaign images" ON storage.objects;

-- Create broad policies for both authenticated and anon users
CREATE POLICY "Anyone can upload campaign images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-images');

CREATE POLICY "Anyone can update campaign images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'campaign-images');

CREATE POLICY "Anyone can delete campaign images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'campaign-images');
