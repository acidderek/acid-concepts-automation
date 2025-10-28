-- Clean up old OAuth states (keep only recent ones)
DELETE FROM oauth_states_2025_10_25_19_00 
WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Clean up duplicate Reddit tokens, keep only the most recent one per user
WITH ranked_tokens AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM reddit_tokens_2025_10_26_16_00
)
DELETE FROM reddit_tokens_2025_10_26_16_00 
WHERE id IN (
  SELECT id FROM ranked_tokens WHERE rn > 1
);

-- Clean up very old OAuth states
DELETE FROM oauth_states_2025_10_25_19_00 
WHERE created_at < NOW() - INTERVAL '24 hours';