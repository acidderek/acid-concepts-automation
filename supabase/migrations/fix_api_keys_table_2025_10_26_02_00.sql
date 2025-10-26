-- Ensure API keys table exists with correct structure
CREATE TABLE IF NOT EXISTS public.api_keys_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    key_type TEXT NOT NULL,
    key_name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, key_type)
);

-- Enable Row Level Security
ALTER TABLE public.api_keys_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys_2025_10_25_19_00;

-- Create RLS policy for API keys
CREATE POLICY "Users can manage their own API keys" 
ON public.api_keys_2025_10_25_19_00
FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.api_keys_2025_10_25_19_00 TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test insert to verify table works
INSERT INTO public.api_keys_2025_10_25_19_00 (
    user_id, 
    platform, 
    key_type, 
    key_name, 
    key_value
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test',
    'test_key',
    'Test Key',
    'test_value'
) ON CONFLICT (user_id, platform, key_type) DO NOTHING;

-- Clean up test data
DELETE FROM public.api_keys_2025_10_25_19_00 WHERE platform = 'test';