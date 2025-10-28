-- Check the current structure and data in reddit_comments table
SELECT 
    id,
    reddit_comment_id,
    subreddit,
    comment_content,
    comment_author,
    comment_score,
    comment_created_at,
    original_post_title,
    original_post_content,
    original_post_author,
    priority_score,
    review_status,
    created_at,
    updated_at
FROM public.reddit_comments_2025_10_26_18_00 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if we have any data with missing fields
SELECT 
    COUNT(*) as total_comments,
    COUNT(original_post_title) as has_original_post_title,
    COUNT(comment_created_at) as has_comment_created_at,
    COUNT(priority_score) as has_priority_score
FROM public.reddit_comments_2025_10_26_18_00;