-- Check if Reddit API keys exist in the database
SELECT 
    user_id,
    platform,
    key_type,
    key_name,
    is_valid,
    created_at,
    last_validated
FROM public.api_keys_2025_10_25_19_00 
WHERE platform = 'reddit'
ORDER BY created_at DESC;

-- Check OAuth states table for callback URLs
SELECT 
    user_id,
    platform,
    redirect_uri,
    expires_at,
    created_at
FROM public.oauth_states_2025_10_26_00_00 
WHERE platform = 'reddit'
ORDER BY created_at DESC;

-- Check Reddit accounts table
SELECT 
    user_id,
    reddit_username,
    connected_at
FROM public.reddit_accounts_2025_10_26_00_00
ORDER BY connected_at DESC;