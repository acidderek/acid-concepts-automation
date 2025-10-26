-- Drop existing table and recreate properly
DROP TABLE IF EXISTS public.api_keys_2025_10_25_19_00 CASCADE;

-- Create the table with correct structure
CREATE TABLE public.api_keys_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    platform TEXT NOT NULL,
    key_type TEXT NOT NULL,
    key_name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, key_type)
);

-- Enable RLS
ALTER TABLE public.api_keys_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy that allows everything for authenticated users
CREATE POLICY "Allow all for authenticated users" ON public.api_keys_2025_10_25_19_00
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.api_keys_2025_10_25_19_00 TO authenticated;
GRANT ALL ON public.api_keys_2025_10_25_19_00 TO anon;

-- Test insert to make sure it works
INSERT INTO public.api_keys_2025_10_25_19_00 (
    user_id, platform, key_type, key_name, key_value
) VALUES (
    gen_random_uuid(), 'test', 'test_key', 'Test Key', 'test_value'
);

-- Check the insert worked
SELECT COUNT(*) as test_count FROM public.api_keys_2025_10_25_19_00 WHERE platform = 'test';

-- Clean up test data
DELETE FROM public.api_keys_2025_10_25_19_00 WHERE platform = 'test';