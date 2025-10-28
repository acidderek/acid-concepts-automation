-- Simple cleanup of timestamped table mess

-- 1. Create clean reddit_tokens table (already exists, but ensure it's there)
CREATE TABLE IF NOT EXISTS reddit_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create clean oauth_states table
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- 3. Create clean api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, key_name)
);

-- 4. Manually copy your existing data to clean tables
-- (You'll need to reconnect Reddit OAuth and re-enter API keys - cleaner this way)

-- 5. Drop all the timestamped table mess
DROP TABLE IF EXISTS reddit_tokens_2025_10_26_16_00 CASCADE;
DROP TABLE IF EXISTS oauth_states_2025_10_26_17_00 CASCADE;
DROP TABLE IF EXISTS api_keys_2025_10_25_19_00 CASCADE;
DROP TABLE IF EXISTS reddit_comments_2025_10_26_18_00 CASCADE;

-- 6. Set up proper RLS on clean tables
ALTER TABLE reddit_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can manage their own Reddit tokens" ON reddit_tokens;
CREATE POLICY "Users can manage their own Reddit tokens" ON reddit_tokens
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own OAuth states" ON oauth_states;
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;
CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);