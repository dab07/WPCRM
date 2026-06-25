-- Migration: Weather Monitoring Data Models
-- Description: Adds tables for weather readings for the OpenWeatherMap engine.

CREATE TABLE IF NOT EXISTS public.weather_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL, -- references the client
    city TEXT NOT NULL,
    date DATE NOT NULL,
    temp_max NUMERIC,
    temp_min NUMERIC,
    condition TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(brand_id, city, date)
);

ALTER TABLE public.weather_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users" ON public.weather_readings
    FOR ALL USING (auth.role() = 'authenticated');

-- In the absence of a UI for weather configuration, we could add a basic config table.
CREATE TABLE IF NOT EXISTS public.weather_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL,
    cities JSONB DEFAULT '[]'::jsonb, -- e.g. ["Dubai", "London"]
    thresholds JSONB DEFAULT '[]'::jsonb, -- e.g. [{ type: "summer_onset", temp: 35, consecutive_days: 3 }]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weather_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for authenticated users" ON public.weather_configs
    FOR ALL USING (auth.role() = 'authenticated');
