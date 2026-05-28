-- Add email-related columns to the campaigns table
ALTER TABLE campaigns 
ADD COLUMN email_subject TEXT,
ADD COLUMN email_body TEXT,
ADD COLUMN email_attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN send_email BOOLEAN DEFAULT FALSE;

-- Insert new storage bucket for campaign attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaign-attachments', 'campaign-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the new bucket
CREATE POLICY "Anyone can upload campaign attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-attachments');

CREATE POLICY "Anyone can view campaign attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-attachments');

CREATE POLICY "Anyone can update campaign attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'campaign-attachments');

CREATE POLICY "Anyone can delete campaign attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'campaign-attachments');
