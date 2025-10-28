-- Add context fields to reddit_comments table
ALTER TABLE public.reddit_comments_2025_10_26_18_00 
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
ADD COLUMN IF NOT EXISTS comment_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_context JSONB,
ADD COLUMN IF NOT EXISTS is_top_level_comment BOOLEAN DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reddit_comments_original_post_id ON public.reddit_comments_2025_10_26_18_00(original_post_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_parent_comment_id ON public.reddit_comments_2025_10_26_18_00(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_depth ON public.reddit_comments_2025_10_26_18_00(comment_depth);

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view their own reddit comments" ON public.reddit_comments_2025_10_26_18_00;
DROP POLICY IF EXISTS "Users can insert their own reddit comments" ON public.reddit_comments_2025_10_26_18_00;
DROP POLICY IF EXISTS "Users can update their own reddit comments" ON public.reddit_comments_2025_10_26_18_00;
DROP POLICY IF EXISTS "Users can delete their own reddit comments" ON public.reddit_comments_2025_10_26_18_00;

CREATE POLICY "Users can view their own reddit comments" ON public.reddit_comments_2025_10_26_18_00
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reddit comments" ON public.reddit_comments_2025_10_26_18_00
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reddit comments" ON public.reddit_comments_2025_10_26_18_00
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reddit comments" ON public.reddit_comments_2025_10_26_18_00
    FOR DELETE USING (auth.uid() = user_id);