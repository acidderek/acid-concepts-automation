-- Check the actual table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reddit_comments_2025_10_26_18_00' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check sample data with correct column names
SELECT *
FROM public.reddit_comments_2025_10_26_18_00 
ORDER BY created_at DESC 
LIMIT 3;