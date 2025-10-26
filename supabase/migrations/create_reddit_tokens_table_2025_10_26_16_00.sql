-- Create Reddit tokens table
CREATE TABLE reddit_tokens_2025_10_26_16_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reddit_username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_reddit_tokens_user_id ON reddit_tokens_2025_10_26_16_00(user_id);

-- Enable RLS
ALTER TABLE reddit_tokens_2025_10_26_16_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own Reddit tokens" ON reddit_tokens_2025_10_26_16_00
    FOR ALL USING (auth.uid() = user_id);