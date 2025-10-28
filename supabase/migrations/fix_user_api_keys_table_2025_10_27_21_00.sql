-- Ensure user_api_keys table exists with proper structure
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_service ON user_api_keys(service);

-- Ensure RLS is enabled
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Users can manage their own API keys" ON user_api_keys;

-- Create RLS policy
CREATE POLICY "Users can manage their own API keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Test data insertion (will be cleaned up)
INSERT INTO user_api_keys (user_id, service, key_name, key_value, status)
SELECT 
  auth.uid(),
  'test',
  'Test Key - Delete Me',
  'test-key-value',
  'active'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;