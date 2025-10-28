-- Fix reddit_tokens table to include missing columns
DROP TABLE IF EXISTS reddit_tokens CASCADE;

CREATE TABLE reddit_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_username TEXT,  -- This was missing!
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reddit_tokens_user_id ON reddit_tokens(user_id);

-- Enable RLS
ALTER TABLE reddit_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own Reddit tokens" ON reddit_tokens;
CREATE POLICY "Users can manage their own Reddit tokens" ON reddit_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Fix oauth_states table (check if it needs more columns)
-- The current one should be fine, but let's make sure it has expiration handling

-- Check if we need a reddit_accounts table for compatibility
CREATE TABLE IF NOT EXISTS reddit_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_username TEXT NOT NULL,
    account_description TEXT,
    tags TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reddit_username)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_user_id ON reddit_accounts(user_id);

-- Enable RLS
ALTER TABLE reddit_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own Reddit accounts" ON reddit_accounts;
CREATE POLICY "Users can manage their own Reddit accounts" ON reddit_accounts
    FOR ALL USING (auth.uid() = user_id);