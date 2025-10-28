-- Create storage bucket for campaign documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-documents-2025-10-27-20-00',
  'campaign-documents-2025-10-27-20-00',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create campaign intelligence table for business context
CREATE TABLE IF NOT EXISTS campaign_intelligence_2025_10_27_20_00 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns_2025_10_27_01_40(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Business Intelligence Fields
  company_name TEXT,
  company_description TEXT,
  target_audience TEXT,
  key_messaging TEXT,
  brand_voice TEXT,
  competitive_advantages TEXT,
  products_services TEXT,
  
  -- Document Storage
  document_count INTEGER DEFAULT 0,
  last_document_upload TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign documents table to track uploaded files
CREATE TABLE IF NOT EXISTS campaign_documents_2025_10_27_20_00 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns_2025_10_27_01_40(id) ON DELETE CASCADE,
  intelligence_id UUID NOT NULL REFERENCES campaign_intelligence_2025_10_27_20_00(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- File Information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Processing Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  processed_content TEXT,
  summary TEXT,
  key_points TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI response log table to track all AI posts/replies
CREATE TABLE IF NOT EXISTS ai_response_log_2025_10_27_20_00 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns_2025_10_27_01_40(id) ON DELETE CASCADE,
  intelligence_id UUID NOT NULL REFERENCES campaign_intelligence_2025_10_27_20_00(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Reddit Information
  reddit_post_id TEXT,
  reddit_comment_id TEXT,
  parent_comment_id TEXT,
  subreddit TEXT NOT NULL,
  
  -- AI Response Details
  response_type TEXT NOT NULL CHECK (response_type IN ('new_post', 'comment_reply', 'follow_up')),
  ai_response_content TEXT NOT NULL,
  context_used TEXT,
  business_context TEXT,
  
  -- Engagement Tracking
  reddit_score INTEGER DEFAULT 0,
  reddit_replies INTEGER DEFAULT 0,
  engagement_updated_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'deleted', 'error')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_intelligence_campaign_id ON campaign_intelligence_2025_10_27_20_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_intelligence_user_id ON campaign_intelligence_2025_10_27_20_00(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_documents_campaign_id ON campaign_documents_2025_10_27_20_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_documents_intelligence_id ON campaign_documents_2025_10_27_20_00(intelligence_id);
CREATE INDEX IF NOT EXISTS idx_campaign_documents_user_id ON campaign_documents_2025_10_27_20_00(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_response_log_campaign_id ON ai_response_log_2025_10_27_20_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_log_intelligence_id ON ai_response_log_2025_10_27_20_00(intelligence_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_log_user_id ON ai_response_log_2025_10_27_20_00(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_log_reddit_post_id ON ai_response_log_2025_10_27_20_00(reddit_post_id);

-- RLS Policies
ALTER TABLE campaign_intelligence_2025_10_27_20_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_documents_2025_10_27_20_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_log_2025_10_27_20_00 ENABLE ROW LEVEL SECURITY;

-- Campaign Intelligence Policies
CREATE POLICY "Users can view their own campaign intelligence" ON campaign_intelligence_2025_10_27_20_00
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign intelligence" ON campaign_intelligence_2025_10_27_20_00
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign intelligence" ON campaign_intelligence_2025_10_27_20_00
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign intelligence" ON campaign_intelligence_2025_10_27_20_00
  FOR DELETE USING (auth.uid() = user_id);

-- Campaign Documents Policies
CREATE POLICY "Users can view their own campaign documents" ON campaign_documents_2025_10_27_20_00
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign documents" ON campaign_documents_2025_10_27_20_00
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign documents" ON campaign_documents_2025_10_27_20_00
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign documents" ON campaign_documents_2025_10_27_20_00
  FOR DELETE USING (auth.uid() = user_id);

-- AI Response Log Policies
CREATE POLICY "Users can view their own AI response log" ON ai_response_log_2025_10_27_20_00
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI response log" ON ai_response_log_2025_10_27_20_00
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI response log" ON ai_response_log_2025_10_27_20_00
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI response log" ON ai_response_log_2025_10_27_20_00
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket policies
CREATE POLICY "Users can upload their own campaign documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'campaign-documents-2025-10-27-20-00' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own campaign documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'campaign-documents-2025-10-27-20-00' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own campaign documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'campaign-documents-2025-10-27-20-00' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own campaign documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'campaign-documents-2025-10-27-20-00' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );