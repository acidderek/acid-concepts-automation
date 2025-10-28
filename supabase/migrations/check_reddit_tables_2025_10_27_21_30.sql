-- Check what Reddit-related tables exist
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name LIKE '%reddit%' 
ORDER BY table_name, ordinal_position;