-- Create campaign analytics table
CREATE TABLE IF NOT EXISTS public.campaign_analytics_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Time period
    date_recorded DATE NOT NULL,
    hour_recorded INTEGER, -- 0-23 for hourly tracking
    
    -- Discovery metrics
    posts_discovered INTEGER DEFAULT 0,
    posts_filtered_out INTEGER DEFAULT 0,
    discovery_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- AI generation metrics
    responses_generated INTEGER DEFAULT 0,
    ai_generation_failures INTEGER DEFAULT 0,
    avg_ai_confidence DECIMAL(3,2) DEFAULT 0,
    avg_response_length INTEGER DEFAULT 0,
    
    -- Approval workflow metrics
    responses_pending INTEGER DEFAULT 0,
    responses_approved INTEGER DEFAULT 0,
    responses_rejected INTEGER DEFAULT 0,
    approval_rate DECIMAL(5,2) DEFAULT 0,
    avg_approval_time_minutes INTEGER DEFAULT 0,
    
    -- Posting metrics
    responses_posted INTEGER DEFAULT 0,
    posting_failures INTEGER DEFAULT 0,
    posting_success_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Engagement metrics (from platforms)
    total_upvotes INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    avg_engagement_score DECIMAL(5,2) DEFAULT 0,
    
    -- Sentiment analysis
    avg_sentiment_score DECIMAL(3,2) DEFAULT 0,
    positive_responses INTEGER DEFAULT 0,
    neutral_responses INTEGER DEFAULT 0,
    negative_responses INTEGER DEFAULT 0,
    
    -- Performance metrics
    response_time_minutes INTEGER DEFAULT 0, -- Time from discovery to posting
    cost_per_response DECIMAL(8,2) DEFAULT 0,
    estimated_reach INTEGER DEFAULT 0,
    
    -- Metadata
    platform VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ROI tracking table
CREATE TABLE IF NOT EXISTS public.roi_tracking_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Time period
    date_recorded DATE NOT NULL,
    
    -- Cost metrics
    ai_api_costs DECIMAL(10,2) DEFAULT 0,
    platform_api_costs DECIMAL(10,2) DEFAULT 0,
    operational_costs DECIMAL(10,2) DEFAULT 0,
    total_costs DECIMAL(10,2) DEFAULT 0,
    
    -- Revenue/Value metrics
    leads_generated INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    estimated_revenue DECIMAL(12,2) DEFAULT 0,
    brand_mentions INTEGER DEFAULT 0,
    website_traffic INTEGER DEFAULT 0,
    
    -- ROI calculations
    roi_percentage DECIMAL(8,2) DEFAULT 0,
    cost_per_lead DECIMAL(8,2) DEFAULT 0,
    cost_per_conversion DECIMAL(8,2) DEFAULT 0,
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    
    -- Attribution
    direct_attributions INTEGER DEFAULT 0,
    assisted_attributions INTEGER DEFAULT 0,
    brand_awareness_score DECIMAL(5,2) DEFAULT 0,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitor monitoring table
CREATE TABLE IF NOT EXISTS public.competitor_monitoring_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Competitor info
    competitor_name VARCHAR(200) NOT NULL,
    competitor_handle VARCHAR(100),
    platform VARCHAR(50) NOT NULL,
    
    -- Post details
    post_id VARCHAR(200) NOT NULL,
    post_url TEXT NOT NULL,
    post_title TEXT,
    post_content TEXT,
    post_author VARCHAR(100),
    
    -- Engagement metrics
    upvotes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Analysis
    sentiment_score DECIMAL(3,2) DEFAULT 0,
    topic_category VARCHAR(100),
    keywords_mentioned TEXT[],
    our_company_mentioned BOOLEAN DEFAULT FALSE,
    response_opportunity BOOLEAN DEFAULT FALSE,
    
    -- Timing
    post_created_at TIMESTAMP WITH TIME ZONE,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create engagement tracking table
CREATE TABLE IF NOT EXISTS public.engagement_tracking_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.comment_responses_2025_10_25_19_00(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Platform engagement data
    platform_response_id VARCHAR(200),
    platform VARCHAR(50) NOT NULL,
    
    -- Engagement metrics
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    
    -- Calculated metrics
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    click_through_rate DECIMAL(5,2) DEFAULT 0,
    response_quality_score DECIMAL(3,2) DEFAULT 0,
    
    -- Time tracking
    first_engagement_at TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_date ON public.campaign_analytics_2025_10_25_19_00(campaign_id, date_recorded);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_company_date ON public.campaign_analytics_2025_10_25_19_00(company_id, date_recorded);
CREATE INDEX IF NOT EXISTS idx_roi_tracking_campaign_date ON public.roi_tracking_2025_10_25_19_00(campaign_id, date_recorded);
CREATE INDEX IF NOT EXISTS idx_competitor_monitoring_company ON public.competitor_monitoring_2025_10_25_19_00(company_id, competitor_name);
CREATE INDEX IF NOT EXISTS idx_engagement_tracking_response ON public.engagement_tracking_2025_10_25_19_00(response_id);

-- Enable Row Level Security
ALTER TABLE public.campaign_analytics_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_tracking_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_monitoring_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_tracking_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own analytics" ON public.campaign_analytics_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own ROI data" ON public.roi_tracking_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own competitor monitoring" ON public.competitor_monitoring_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own engagement tracking" ON public.engagement_tracking_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample analytics data
INSERT INTO public.campaign_analytics_2025_10_25_19_00 (
    campaign_id, company_id, date_recorded, hour_recorded,
    posts_discovered, responses_generated, responses_approved, responses_posted,
    total_upvotes, total_replies, avg_engagement_score, avg_sentiment_score,
    platform, user_id
) VALUES
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Acid Concepts' LIMIT 1),
    CURRENT_DATE,
    EXTRACT(HOUR FROM NOW()),
    15, 12, 10, 8,
    45, 23, 7.5, 0.75,
    'reddit',
    auth.uid()
),
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Orylu' LIMIT 1),
    CURRENT_DATE,
    EXTRACT(HOUR FROM NOW()),
    22, 18, 15, 12,
    67, 34, 8.2, 0.82,
    'linkedin',
    auth.uid()
);

-- Insert sample ROI data
INSERT INTO public.roi_tracking_2025_10_25_19_00 (
    campaign_id, company_id, date_recorded,
    ai_api_costs, total_costs, leads_generated, conversions,
    estimated_revenue, roi_percentage, cost_per_lead,
    user_id
) VALUES
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Acid Concepts' LIMIT 1),
    CURRENT_DATE,
    25.50, 125.00, 8, 2,
    1200.00, 860.00, 15.63,
    auth.uid()
);

-- Insert sample competitor monitoring data
INSERT INTO public.competitor_monitoring_2025_10_25_19_00 (
    company_id, competitor_name, competitor_handle, platform,
    post_id, post_url, post_title, post_content,
    upvotes, comments_count, engagement_rate, sentiment_score,
    topic_category, our_company_mentioned, response_opportunity,
    post_created_at, user_id
) VALUES
(
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Orylu' LIMIT 1),
    'AutomateFlow',
    '@automateflow',
    'twitter',
    'tweet_123456',
    'https://twitter.com/automateflow/status/123456',
    'New AI automation features launched!',
    'Excited to announce our latest AI automation capabilities that help businesses streamline workflows...',
    156, 23, 8.5, 0.78,
    'product-announcement', FALSE, TRUE,
    NOW() - INTERVAL '2 hours',
    auth.uid()
);