-- Check what Reddit-related credentials exist
SELECT 
    id,
    user_id,
    service,
    key_name,
    LEFT(key_value, 20) || '...' as key_preview,
    status,
    created_at
FROM user_api_keys 
WHERE service LIKE 'reddit_%'
ORDER BY created_at DESC;

-- Check for any access tokens specifically
SELECT 
    COUNT(*) as token_count,
    service
FROM user_api_keys 
WHERE service IN ('reddit_access_token', 'reddit_refresh_token')
GROUP BY service;