-- 1. Check if table exists and structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'api_keys_2025_10_25_19_00'
ORDER BY ordinal_position;

-- 2. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'api_keys_2025_10_25_19_00';

-- 3. Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'api_keys_2025_10_25_19_00';

-- 4. Test direct insert as service role (bypasses RLS)
INSERT INTO public.api_keys_2025_10_25_19_00 (
    user_id, platform, key_type, key_name, key_value
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'reddit',
    'client_id', 
    'Reddit Client ID',
    'test_client_id_123'
) ON CONFLICT (user_id, platform, key_type) DO UPDATE SET
    key_value = EXCLUDED.key_value,
    last_validated = NOW();

-- 5. Test another insert
INSERT INTO public.api_keys_2025_10_25_19_00 (
    user_id, platform, key_type, key_name, key_value
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'reddit',
    'client_secret',
    'Reddit Client Secret', 
    'test_client_secret_456'
) ON CONFLICT (user_id, platform, key_type) DO UPDATE SET
    key_value = EXCLUDED.key_value,
    last_validated = NOW();

-- 6. Verify inserts worked
SELECT 
    user_id,
    platform,
    key_type,
    key_name,
    created_at,
    'key_value_present' as key_value_status
FROM public.api_keys_2025_10_25_19_00 
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- 7. Clean up test data
DELETE FROM public.api_keys_2025_10_25_19_00 
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- 8. Final verification table is empty and ready
SELECT COUNT(*) as final_count FROM public.api_keys_2025_10_25_19_00;