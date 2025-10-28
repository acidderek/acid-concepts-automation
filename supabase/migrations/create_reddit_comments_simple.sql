-- Create simple reddit_comments table (no stupid timestamps in name)
CREATE TABLE IF NOT EXISTS reddit_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_comment_id TEXT NOT NULL UNIQUE,
    subreddit TEXT NOT NULL,
    comment_author TEXT NOT NULL,
    comment_body TEXT NOT NULL,
    comment_score INTEGER DEFAULT 0,
    comment_created_utc TIMESTAMP WITH TIME ZONE,
    permalink TEXT,
    review_status TEXT DEFAULT 'pending',
    priority_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reddit_comments_user_id ON reddit_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_subreddit ON reddit_comments(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_review_status ON reddit_comments(review_status);

-- Enable RLS
ALTER TABLE reddit_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own Reddit comments" ON reddit_comments;
CREATE POLICY "Users can manage their own Reddit comments" ON reddit_comments
    FOR ALL USING (auth.uid() = user_id);