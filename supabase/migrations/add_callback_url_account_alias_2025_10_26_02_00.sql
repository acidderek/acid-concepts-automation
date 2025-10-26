-- Add missing columns for callback URL and account management
ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS callback_url TEXT;

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS account_alias TEXT;

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS account_description TEXT;

-- Update unique constraint to include account_alias for multiple accounts
ALTER TABLE public.api_keys_2025_10_25_19_00 
DROP CONSTRAINT IF EXISTS api_keys_2025_10_25_19_00_user_id_platform_key_type_key;

ALTER TABLE public.api_keys_2025_10_25_19_00 
ADD CONSTRAINT api_keys_unique_per_account 
UNIQUE (user_id, platform, key_type, account_alias);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_platform_alias 
ON public.api_keys_2025_10_25_19_00 (user_id, platform, account_alias);