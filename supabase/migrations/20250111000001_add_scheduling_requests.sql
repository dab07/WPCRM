-- Add scheduling requests table for meeting management
CREATE TABLE IF NOT EXISTS scheduling_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('call', 'meeting', 'expert_consultation')),
  preferred_time TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed')),
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE scheduling_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all scheduling requests
CREATE POLICY "Service role can manage scheduling requests" ON scheduling_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX idx_scheduling_requests_customer_phone ON scheduling_requests(customer_phone);
CREATE INDEX idx_scheduling_requests_status ON scheduling_requests(status);
CREATE INDEX idx_scheduling_requests_created_at ON scheduling_requests(created_at DESC);