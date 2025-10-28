-- Check if reddit_tokens table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reddit_tokens' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any reddit_tokens records
SELECT COUNT(*) as token_count FROM reddit_tokens;

-- Check RLS policies on reddit_tokens
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'reddit_tokens';

-- Check if the table has proper permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'reddit_tokens';