-- Migration: Create Unified Customers Table
-- Date: 2026-06-29

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    location TEXT,
    country_code TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    total_orders INTEGER DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming similar setup to other tables)
CREATE POLICY "Enable read access for authenticated users" 
    ON public.customers FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
    ON public.customers FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
    ON public.customers FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" 
    ON public.customers FOR DELETE 
    TO authenticated 
    USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customers_brand_id ON public.customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
