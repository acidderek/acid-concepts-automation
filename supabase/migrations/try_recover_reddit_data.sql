-- Try to find any remaining data in tables that might not have been dropped
-- Check if reddit_tokens_2025_10_26_16_00 still exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reddit_tokens_2025_10_26_16_00') THEN
        RAISE NOTICE 'reddit_tokens_2025_10_26_16_00 table still exists!';
        -- Copy data to clean table if it exists
        INSERT INTO reddit_tokens (user_id, access_token, refresh_token, expires_at, scope, created_at, updated_at)
        SELECT user_id, access_token, refresh_token, expires_at, scope, created_at, updated_at 
        FROM reddit_tokens_2025_10_26_16_00
        ON CONFLICT DO NOTHING;
    ELSE
        RAISE NOTICE 'reddit_tokens_2025_10_26_16_00 table was dropped';
    END IF;
END $$;

-- Check if api_keys_2025_10_25_19_00 still exists  
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys_2025_10_25_19_00') THEN
        RAISE NOTICE 'api_keys_2025_10_25_19_00 table still exists!';
        -- Try to copy data to clean table
        INSERT INTO api_keys (user_id, key_name, key_value, created_at, updated_at)
        SELECT user_id, 
               CASE 
                   WHEN key_type = 'client_id' THEN 'reddit_client_id'
                   WHEN key_type = 'client_secret' THEN 'reddit_client_secret'
                   WHEN key_type = 'callback_url' THEN 'reddit_callback_url'
                   ELSE key_name
               END as key_name,
               key_value, 
               created_at, 
               updated_at 
        FROM api_keys_2025_10_25_19_00
        WHERE platform = 'reddit'
        ON CONFLICT (user_id, key_name) DO NOTHING;
    ELSE
        RAISE NOTICE 'api_keys_2025_10_25_19_00 table was dropped';
    END IF;
END $$;