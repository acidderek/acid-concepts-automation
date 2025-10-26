-- AI-powered Campaign Management System
-- Current time: 2025-10-24 09:00 UTC

-- Table for storing campaigns
CREATE TABLE campaigns_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- AI Configuration
    ai_provider VARCHAR(50) DEFAULT 'openrouter', -- 'openrouter', 'openai', etc.
    ai_model VARCHAR(100) DEFAULT 'anthropic/claude-3-haiku',
    ai_system_prompt TEXT,
    ai_temperature DECIMAL(3,2) DEFAULT 0.7,
    
    -- Engagement Settings
    engagement_strategy JSONB DEFAULT '{"comment": true, "vote": true, "skip": true}',
    max_posts_per_run INTEGER DEFAULT 5,
    monitoring_frequency INTEGER DEFAULT 60, -- minutes
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT false,
    schedule_cron VARCHAR(100), -- cron expression
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing AI training documents per campaign
CREATE TABLE campaign_documents_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns_2025_10_24_09_00(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    document_type VARCHAR(50) DEFAULT 'training', -- 'training', 'guidelines', 'examples'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table linking campaigns to subreddit channels
CREATE TABLE campaign_channels_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns_2025_10_24_09_00(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES subreddit_channels_2025_10_24_09_00(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- for ordering channels within campaign
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campaign_id, channel_id)
);

-- Table for storing monitored posts and AI analysis
CREATE TABLE monitored_posts_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns_2025_10_24_09_00(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES subreddit_channels_2025_10_24_09_00(id) ON DELETE CASCADE,
    
    -- Reddit Post Data
    reddit_post_id VARCHAR(255) NOT NULL,
    reddit_fullname VARCHAR(255) NOT NULL, -- t3_xxxxx format
    subreddit VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    author VARCHAR(255),
    url TEXT,
    score INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    created_utc TIMESTAMP WITH TIME ZONE,
    
    -- AI Analysis Results
    ai_analysis_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'analyzed', 'failed'
    ai_relevance_score DECIMAL(3,2), -- 0.00 to 1.00
    ai_decision VARCHAR(50), -- 'comment', 'vote', 'skip'
    ai_reasoning TEXT,
    ai_suggested_comment TEXT,
    ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Engagement Status
    engagement_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'skipped'
    engagement_action VARCHAR(50), -- 'commented', 'voted', 'skipped'
    engagement_result JSONB, -- store API response
    engaged_at TIMESTAMP WITH TIME ZONE,
    
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(campaign_id, reddit_post_id)
);

-- Table for campaign execution logs
CREATE TABLE campaign_runs_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns_2025_10_24_09_00(id) ON DELETE CASCADE,
    
    run_type VARCHAR(50) NOT NULL, -- 'scheduled', 'manual'
    status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
    
    posts_discovered INTEGER DEFAULT 0,
    posts_analyzed INTEGER DEFAULT 0,
    posts_engaged INTEGER DEFAULT 0,
    posts_skipped INTEGER DEFAULT 0,
    
    error_message TEXT,
    execution_time_ms INTEGER,
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Table for storing AI API usage and costs
CREATE TABLE ai_usage_logs_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns_2025_10_24_09_00(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DECIMAL(10,6),
    
    request_type VARCHAR(50), -- 'post_analysis', 'comment_generation'
    response_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE campaigns_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_documents_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_channels_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_posts_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_runs_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own campaigns" ON campaigns_2025_10_24_09_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their campaign documents" ON campaign_documents_2025_10_24_09_00
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns_2025_10_24_09_00 
            WHERE id = campaign_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their campaign channels" ON campaign_channels_2025_10_24_09_00
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns_2025_10_24_09_00 
            WHERE id = campaign_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their monitored posts" ON monitored_posts_2025_10_24_09_00
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns_2025_10_24_09_00 
            WHERE id = campaign_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their campaign runs" ON campaign_runs_2025_10_24_09_00
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM campaigns_2025_10_24_09_00 
            WHERE id = campaign_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their AI usage" ON ai_usage_logs_2025_10_24_09_00
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_user_id ON campaigns_2025_10_24_09_00(user_id);
CREATE INDEX idx_campaigns_active ON campaigns_2025_10_24_09_00(is_active, next_run_at);
CREATE INDEX idx_campaign_documents_campaign ON campaign_documents_2025_10_24_09_00(campaign_id);
CREATE INDEX idx_campaign_channels_campaign ON campaign_channels_2025_10_24_09_00(campaign_id);
CREATE INDEX idx_campaign_channels_channel ON campaign_channels_2025_10_24_09_00(channel_id);
CREATE INDEX idx_monitored_posts_campaign ON monitored_posts_2025_10_24_09_00(campaign_id);
CREATE INDEX idx_monitored_posts_status ON monitored_posts_2025_10_24_09_00(ai_analysis_status, engagement_status);
CREATE INDEX idx_monitored_posts_reddit_id ON monitored_posts_2025_10_24_09_00(reddit_post_id);
CREATE INDEX idx_campaign_runs_campaign ON campaign_runs_2025_10_24_09_00(campaign_id);
CREATE INDEX idx_ai_usage_user ON ai_usage_logs_2025_10_24_09_00(user_id, created_at DESC);