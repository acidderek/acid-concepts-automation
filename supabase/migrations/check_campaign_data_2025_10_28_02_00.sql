-- Check recent campaign comments to see if data is being saved
SELECT 
    campaign_id,
    reddit_comment_id,
    subreddit,
    comment_author,
    comment_content,
    created_at
FROM campaign_comments_2025_10_27_01_40 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- Check total count of comments in the table
SELECT COUNT(*) as total_comments FROM campaign_comments_2025_10_27_01_40;

-- Check table structure to see if columns match what we're trying to insert
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaign_comments_2025_10_27_01_40' 
ORDER BY ordinal_position;