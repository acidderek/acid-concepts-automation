-- Check what tables currently exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%reddit%' OR table_name LIKE '%api%' OR table_name LIKE '%oauth%'
ORDER BY table_name;

-- Check if any of the old tables still exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%2025_%' OR 
  table_name LIKE '%reddit_tokens%' OR 
  table_name LIKE '%api_keys%' OR
  table_name LIKE '%oauth_states%'
)
ORDER BY table_name;