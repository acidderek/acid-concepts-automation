-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns_2025_10_27_01_40 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    subreddits TEXT[] NOT NULL, -- Array of subreddit names
    keywords TEXT[], -- Array of keywords (optional)
    comment_limit INTEGER DEFAULT 20,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    last_executed_at TIMESTAMP WITH TIME ZONE,
    total_comments_pulled INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_comments table
CREATE TABLE IF NOT EXISTS public.campaign_comments_2025_10_27_01_40 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_27_01_40(id) ON DELETE CASCADE,
    reddit_comment_id TEXT NOT NULL,
    comment_content TEXT,
    comment_author TEXT,
    comment_score INTEGER,
    comment_created_at TIMESTAMP WITH TIME ZONE,
    comment_url TEXT,
    subreddit TEXT,
    post_type TEXT,
    keyword_matched TEXT,
    upvote_ratio DECIMAL,
    num_comments INTEGER,
    original_post_url TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'responded', 'ignored')),
    ai_decision TEXT, -- For future AI integration
    ai_response TEXT, -- For future AI integration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, reddit_comment_id) -- Prevent duplicate comments in same campaign
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns_2025_10_27_01_40(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns_2025_10_27_01_40(status);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON public.campaign_comments_2025_10_27_01_40(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_status ON public.campaign_comments_2025_10_27_01_40(status);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_created_at ON public.campaign_comments_2025_10_27_01_40(created_at);

-- Enable Row Level Security
ALTER TABLE public.campaigns_2025_10_27_01_40 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments_2025_10_27_01_40 ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns_2025_10_27_01_40
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" ON public.campaigns_2025_10_27_01_40
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns_2025_10_27_01_40
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns_2025_10_27_01_40
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for campaign comments
CREATE POLICY "Users can view comments from their campaigns" ON public.campaign_comments_2025_10_27_01_40
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns_2025_10_27_01_40 c 
            WHERE c.id = campaign_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments for their campaigns" ON public.campaign_comments_2025_10_27_01_40
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns_2025_10_27_01_40 c 
            WHERE c.id = campaign_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update comments from their campaigns" ON public.campaign_comments_2025_10_27_01_40
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns_2025_10_27_01_40 c 
            WHERE c.id = campaign_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete comments from their campaigns" ON public.campaign_comments_2025_10_27_01_40
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns_2025_10_27_01_40 c 
            WHERE c.id = campaign_id AND c.user_id = auth.uid()
        )
    );