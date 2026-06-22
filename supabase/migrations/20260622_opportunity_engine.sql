-- Migration: Opportunity Engine Tables
-- Description: Adds tables for opportunities, signal_events, and local_event_calendar

-- 1. Opportunities Table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL, -- references your client/brand table
    stage TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_segment TEXT NOT NULL,
    estimated_reach INTEGER DEFAULT 0,
    suggested_channels TEXT[] DEFAULT '{}',
    priority TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    projected_impact_usd NUMERIC(10, 2) DEFAULT 0.00,
    signal_source TEXT,
    status TEXT NOT NULL DEFAULT 'pending_approval',
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Signal Events Table (Audit/Log of signals fired)
CREATE TABLE IF NOT EXISTS public.signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    signal_type TEXT NOT NULL, -- e.g., 'weather', 'local_event'
    market TEXT NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    relevance_score NUMERIC(5, 4) DEFAULT 0.0000,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Local Event Calendar
CREATE TABLE IF NOT EXISTS public.local_event_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic templates
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_event_calendar ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (In a real scenario, restrict by brand_id/client_id)
CREATE POLICY "Enable ALL for authenticated users" ON public.opportunities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable ALL for authenticated users" ON public.signal_events
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable ALL for authenticated users" ON public.local_event_calendar
    FOR ALL USING (auth.role() = 'authenticated');
