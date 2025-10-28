-- Enhance reddit_comments table to support full thread context
ALTER TABLE reddit_comments 
ADD COLUMN IF NOT EXISTS original_post_id TEXT,
ADD COLUMN IF NOT EXISTS original_post_title TEXT,
ADD COLUMN IF NOT EXISTS original_post_content TEXT,
ADD COLUMN IF NOT EXISTS original_post_author TEXT,
ADD COLUMN IF NOT EXISTS original_post_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_post_url TEXT,
ADD COLUMN IF NOT EXISTS parent_comment_id TEXT,
ADD COLUMN IF NOT EXISTS parent_comment_content TEXT,
ADD COLUMN IF NOT EXISTS parent_comment_author TEXT,
ADD COLUMN IF NOT EXISTS parent_comment_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sibling_comments JSONB,
ADD COLUMN IF NOT EXISTS sibling_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_top_level_comment BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS thread_context JSONB,
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_reddit_comments_original_post_id ON reddit_comments(original_post_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_parent_comment_id ON reddit_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_priority_score ON reddit_comments(priority_score);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_is_top_level ON reddit_comments(is_top_level_comment);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_sibling_count ON reddit_comments(sibling_count);