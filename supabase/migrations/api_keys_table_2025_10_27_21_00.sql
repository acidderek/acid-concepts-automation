-- Create api_keys table for storing user API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- AI Service API Keys
  openai_key TEXT,
  openrouter_key TEXT,
  
  -- Storage Service Keys
  wasabi_access_key TEXT,
  wasabi_secret_key TEXT,
  wasabi_endpoint TEXT DEFAULT 's3.wasabisys.com',
  wasabi_region TEXT DEFAULT 'us-east-1',
  bucket_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own API keys
CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Add foreign key constraint (optional, depends on your auth setup)
-- ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_user_id 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;