-- Create OAuth states table for secure authentication flow
CREATE TABLE IF NOT EXISTS public.oauth_states_2025_10_26_00_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    state TEXT NOT NULL UNIQUE,
    redirect_uri TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Reddit accounts table to store connected Reddit accounts
CREATE TABLE IF NOT EXISTS public.reddit_accounts_2025_10_26_00_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_username TEXT NOT NULL,
    reddit_id TEXT NOT NULL,
    karma INTEGER DEFAULT 0,
    created_utc BIGINT,
    is_verified BOOLEAN DEFAULT FALSE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, reddit_username)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_platform ON public.oauth_states_2025_10_26_00_00(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states_2025_10_26_00_00(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON public.oauth_states_2025_10_26_00_00(expires_at);
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_user ON public.reddit_accounts_2025_10_26_00_00(user_id);
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_username ON public.reddit_accounts_2025_10_26_00_00(reddit_username);

-- Enable Row Level Security
ALTER TABLE public.oauth_states_2025_10_26_00_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_accounts_2025_10_26_00_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for oauth_states table
CREATE POLICY "Users can manage their own OAuth states" ON public.oauth_states_2025_10_26_00_00
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for reddit_accounts table
CREATE POLICY "Users can view their own Reddit accounts" ON public.reddit_accounts_2025_10_26_00_00
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Reddit accounts" ON public.reddit_accounts_2025_10_26_00_00
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Reddit accounts" ON public.reddit_accounts_2025_10_26_00_00
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Reddit accounts" ON public.reddit_accounts_2025_10_26_00_00
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM public.oauth_states_2025_10_26_00_00 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update reddit account timestamp
CREATE OR REPLACE FUNCTION update_reddit_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating reddit account timestamp
CREATE TRIGGER update_reddit_account_timestamp_trigger
    BEFORE UPDATE ON public.reddit_accounts_2025_10_26_00_00
    FOR EACH ROW
    EXECUTE FUNCTION update_reddit_account_timestamp();

-- Grant necessary permissions
GRANT ALL ON public.oauth_states_2025_10_26_00_00 TO authenticated;
GRANT ALL ON public.reddit_accounts_2025_10_26_00_00 TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_oauth_states() TO authenticated;