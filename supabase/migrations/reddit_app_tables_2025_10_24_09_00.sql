-- Reddit automation app database schema
-- Current time: 2025-10-24 09:00 UTC

-- Table for storing Reddit account configurations
CREATE TABLE reddit_accounts_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing subreddit channel configurations
CREATE TABLE subreddit_channels_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_account_id UUID REFERENCES reddit_accounts_2025_10_24_09_00(id) ON DELETE CASCADE,
    subreddit_name VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for API access tokens (JWT-based security)
CREATE TABLE api_tokens_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for logging API activities
CREATE TABLE api_logs_2025_10_24_09_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    api_token_id UUID REFERENCES api_tokens_2025_10_24_09_00(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- 'comment', 'reply', 'vote', 'search'
    subreddit VARCHAR(255),
    target_id VARCHAR(255), -- Reddit post/comment ID
    payload JSONB,
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE reddit_accounts_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddit_channels_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs_2025_10_24_09_00 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reddit_accounts
CREATE POLICY "Users can manage their own Reddit accounts" ON reddit_accounts_2025_10_24_09_00
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for subreddit_channels
CREATE POLICY "Users can manage their own subreddit channels" ON subreddit_channels_2025_10_24_09_00
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for api_tokens
CREATE POLICY "Users can manage their own API tokens" ON api_tokens_2025_10_24_09_00
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for api_logs
CREATE POLICY "Users can view their own API logs" ON api_logs_2025_10_24_09_00
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_reddit_accounts_user_id ON reddit_accounts_2025_10_24_09_00(user_id);
CREATE INDEX idx_subreddit_channels_user_id ON subreddit_channels_2025_10_24_09_00(user_id);
CREATE INDEX idx_subreddit_channels_reddit_account ON subreddit_channels_2025_10_24_09_00(reddit_account_id);
CREATE INDEX idx_api_tokens_user_id ON api_tokens_2025_10_24_09_00(user_id);
CREATE INDEX idx_api_logs_user_id ON api_logs_2025_10_24_09_00(user_id);
CREATE INDEX idx_api_logs_created_at ON api_logs_2025_10_24_09_00(created_at DESC);