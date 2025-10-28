-- Check what Reddit credentials exist for this user
SELECT 
    service,
    key_name,
    LEFT(key_value, 30) || '...' as key_preview,
    status,
    created_at
FROM user_api_keys 
WHERE user_id = '40cbd13b-0602-4f96-a47c-643977aab3b3'
AND service LIKE 'reddit_%'
ORDER BY service, created_at DESC;