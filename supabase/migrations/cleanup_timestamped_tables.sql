-- Fix the mess of timestamped table names by migrating to clean names

-- 1. Create clean reddit_tokens table and migrate data
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

-- Migrate data from old timestamped table
INSERT INTO reddit_tokens (user_id, access_token, refresh_token, expires_at, scope, created_at, updated_at)
SELECT user_id, access_token, refresh_token, expires_at, scope, created_at, updated_at 
FROM reddit_tokens_2025_10_26_16_00
ON CONFLICT (id) DO NOTHING;

-- 2. Create clean oauth_states table and migrate data  
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Migrate oauth states if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'oauth_states_2025_10_26_17_00') THEN
        INSERT INTO oauth_states (user_id, state, created_at, expires_at)
        SELECT user_id, state, created_at, expires_at 
        FROM oauth_states_2025_10_26_17_00
        ON CONFLICT (state) DO NOTHING;
    END IF;
END $$;

-- 3. Create clean api_keys table and migrate data
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    key_name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, service_name, key_name)
);

-- Migrate API keys from various timestamped tables
DO $$
BEGIN
    -- Try to migrate from different possible API key tables
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys_2025_10_25_19_00') THEN
        INSERT INTO api_keys (user_id, service_name, key_name, key_value, is_encrypted, created_at, updated_at)
        SELECT user_id, service_name, key_name, key_value, is_encrypted, created_at, updated_at 
        FROM api_keys_2025_10_25_19_00
        ON CONFLICT (user_id, service_name, key_name) DO NOTHING;
    END IF;
END $$;

-- 4. Set up proper indexes and RLS for clean tables
CREATE INDEX IF NOT EXISTS idx_reddit_tokens_user_id ON reddit_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Enable RLS on clean tables
ALTER TABLE reddit_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clean tables
DROP POLICY IF EXISTS "Users can manage their own Reddit tokens" ON reddit_tokens;
CREATE POLICY "Users can manage their own Reddit tokens" ON reddit_tokens
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own OAuth states" ON oauth_states;
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;
CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

-- 5. Drop the old timestamped tables (cleanup the mess)
DROP TABLE IF EXISTS reddit_tokens_2025_10_26_16_00 CASCADE;
DROP TABLE IF EXISTS oauth_states_2025_10_26_17_00 CASCADE;
DROP TABLE IF EXISTS api_keys_2025_10_25_19_00 CASCADE;
DROP TABLE IF EXISTS reddit_comments_2025_10_26_18_00 CASCADE;

-- Clean up any other timestamped tables that might exist
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename ~ '_20[0-9]{2}_[0-9]{2}_[0-9]{2}_[0-9]{2}_[0-9]{2}$'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(table_name) || ' CASCADE';
        RAISE NOTICE 'Dropped timestamped table: %', table_name;
    END LOOP;
END $$;