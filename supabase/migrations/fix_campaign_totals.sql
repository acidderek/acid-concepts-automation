-- Fix campaign total_comments_pulled to match actual comment count
UPDATE campaigns 
SET total_comments_pulled = (
    SELECT COUNT(*) 
    FROM campaign_comments 
    WHERE campaign_comments.campaign_id = campaigns.id
)
WHERE EXISTS (
    SELECT 1 
    FROM campaign_comments 
    WHERE campaign_comments.campaign_id = campaigns.id
);

-- Show the updated counts
SELECT 
    c.name as campaign_name,
    c.total_comments_pulled as stored_total,
    COUNT(cc.id) as actual_total
FROM campaigns c
LEFT JOIN campaign_comments cc ON c.id = cc.campaign_id
GROUP BY c.id, c.name, c.total_comments_pulled
ORDER BY c.created_at DESC;