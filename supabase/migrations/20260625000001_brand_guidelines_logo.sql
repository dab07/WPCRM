-- Add logo_url column to brand_guidelines
ALTER TABLE brand_guidelines ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update the brand-guidelines bucket to allow image uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp'
]::text[]
WHERE id = 'brand-guidelines';
