-- Add 'rejected' as a valid campaign status
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
      'rejected'
    ])
  );
