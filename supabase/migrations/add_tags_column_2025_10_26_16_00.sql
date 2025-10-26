-- Add tags column to api_keys table
ALTER TABLE api_keys_2025_10_25_19_00 
ADD COLUMN tags TEXT;

-- Add comment for documentation
COMMENT ON COLUMN api_keys_2025_10_25_19_00.tags IS 'Comma-separated tags for organizing accounts (e.g., work,main,bot)';