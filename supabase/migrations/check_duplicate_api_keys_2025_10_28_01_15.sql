-- Check for duplicate API keys by service
SELECT 
    user_id,
    service,
    COUNT(*) as count,
    STRING_AGG(key_name, ', ') as key_names,
    STRING_AGG(id::text, ', ') as ids
FROM user_api_keys 
GROUP BY user_id, service 
HAVING COUNT(*) > 1
ORDER BY user_id, service;

-- Show all API keys to see the full picture
SELECT 
    id,
    user_id,
    service,
    key_name,
    status,
    created_at
FROM user_api_keys 
ORDER BY user_id, service, created_at DESC;