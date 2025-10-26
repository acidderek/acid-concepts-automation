-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'api_keys_2025_10_25_19_00' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS key_value TEXT NOT NULL DEFAULT '';

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS key_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT TRUE;

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS last_validated TIMESTAMPTZ DEFAULT NOW();

-- Remove default constraints after adding columns
ALTER TABLE public.api_keys_2025_10_25_19_00 
ALTER COLUMN key_value DROP DEFAULT;

ALTER TABLE public.api_keys_2025_10_25_19_00 
ALTER COLUMN key_name DROP DEFAULT;

-- Ensure unique constraint exists
ALTER TABLE public.api_keys_2025_10_25_19_00 
DROP CONSTRAINT IF EXISTS api_keys_2025_10_25_19_00_user_id_platform_key_type_key;

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD CONSTRAINT api_keys_2025_10_25_19_00_user_id_platform_key_type_key 
UNIQUE (user_id, platform, key_type);

-- Test the table structure
SELECT 'Table structure fixed' as status;