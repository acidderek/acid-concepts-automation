-- Create oauth_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS oauth_states_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    state TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_platform ON oauth_states_2025_10_25_19_00(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states_2025_10_25_19_00(state);

-- Enable RLS
ALTER TABLE oauth_states_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own OAuth states" ON oauth_states_2025_10_25_19_00;
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);