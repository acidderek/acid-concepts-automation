-- Create table for storing Reddit comments
CREATE TABLE IF NOT EXISTS reddit_comments_2025_10_26_18_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_post_id TEXT NOT NULL,
    reddit_comment_id TEXT NOT NULL UNIQUE,
    subreddit TEXT NOT NULL,
    post_title TEXT,
    comment_author TEXT NOT NULL,
    comment_body TEXT NOT NULL,
    comment_score INTEGER DEFAULT 0,
    comment_created_utc TIMESTAMP WITH TIME ZONE,
    parent_id TEXT,
    permalink TEXT,
    is_reviewed BOOLEAN DEFAULT FALSE,
    review_status TEXT DEFAULT 'pending', -- pending, approved, rejected
    review_notes TEXT,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reddit_comments_user_id ON reddit_comments_2025_10_26_18_00(user_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_subreddit ON reddit_comments_2025_10_26_18_00(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_review_status ON reddit_comments_2025_10_26_18_00(review_status);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_fetched_at ON reddit_comments_2025_10_26_18_00(fetched_at);

-- Enable RLS
ALTER TABLE reddit_comments_2025_10_26_18_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own Reddit comments" ON reddit_comments_2025_10_26_18_00;
CREATE POLICY "Users can manage their own Reddit comments" ON reddit_comments_2025_10_26_18_00
    FOR ALL USING (auth.uid() = user_id);