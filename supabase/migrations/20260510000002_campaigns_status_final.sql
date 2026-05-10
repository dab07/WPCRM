-- Final campaign status schema: exactly 5 lifecycle statuses
-- draft → pending → to_be_approved → approved → executed

-- Drop old constraint (may have overdue/scheduled/running/completed/paused)
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Apply clean 5-status constraint
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_status_check CHECK (
    status = ANY(ARRAY[
      'draft',
      'pending',
      'to_be_approved',
      'approved',
      'executed'
    ])
  );

-- Migrate any legacy statuses to their nearest equivalent
UPDATE campaigns SET status = 'draft'    WHERE status IN ('paused');
UPDATE campaigns SET status = 'pending'  WHERE status IN ('scheduled');
UPDATE campaigns SET status = 'executed' WHERE status IN ('running', 'completed', 'overdue');

-- Ensure executed_at is set for executed campaigns that are missing it
UPDATE campaigns
  SET executed_at = updated_at
  WHERE status = 'executed' AND executed_at IS NULL;
