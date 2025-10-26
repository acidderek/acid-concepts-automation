-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    target_location VARCHAR(200),
    keywords TEXT,
    status VARCHAR(20) DEFAULT 'active',
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    monitoring_rules JSONB,
    engagement_rules JSONB,
    schedule_settings JSONB,
    ai_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discovered_posts table
CREATE TABLE IF NOT EXISTS public.discovered_posts_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_post_id VARCHAR(200) NOT NULL,
    post_url TEXT NOT NULL,
    post_title TEXT,
    post_content TEXT,
    post_author VARCHAR(100),
    post_author_karma INTEGER DEFAULT 0,
    post_upvotes INTEGER DEFAULT 0,
    post_comments_count INTEGER DEFAULT 0,
    post_created_at TIMESTAMP WITH TIME ZONE,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subreddit_or_group VARCHAR(100),
    post_flair VARCHAR(100),
    is_nsfw BOOLEAN DEFAULT FALSE,
    post_metadata JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create comment_responses table
CREATE TABLE IF NOT EXISTS public.comment_responses_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.discovered_posts_2025_10_25_19_00(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Original post information
    original_post_title TEXT NOT NULL,
    original_post_content TEXT,
    original_post_url TEXT NOT NULL,
    original_author VARCHAR(100),
    original_author_karma INTEGER DEFAULT 0,
    original_upvotes INTEGER DEFAULT 0,
    original_comments_count INTEGER DEFAULT 0,
    original_created_at TIMESTAMP WITH TIME ZONE,
    platform VARCHAR(50) NOT NULL,
    subreddit_or_group VARCHAR(100),
    
    -- AI Generated Response
    ai_generated_response TEXT NOT NULL,
    ai_model_used VARCHAR(50),
    ai_confidence_score DECIMAL(3,2),
    ai_generation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Approval Workflow
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, posted, failed
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Manual Edits
    edited_response TEXT,
    edit_reason TEXT,
    edited_by UUID REFERENCES auth.users(id),
    edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Posting Information
    posted_at TIMESTAMP WITH TIME ZONE,
    platform_response_id VARCHAR(200),
    posting_error TEXT,
    
    -- Metadata
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
    tags TEXT[], -- for organization
    sentiment_score DECIMAL(3,2),
    engagement_potential INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comment_responses_campaign_id ON public.comment_responses_2025_10_25_19_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_comment_responses_status ON public.comment_responses_2025_10_25_19_00(status);
CREATE INDEX IF NOT EXISTS idx_comment_responses_company_id ON public.comment_responses_2025_10_25_19_00(company_id);
CREATE INDEX IF NOT EXISTS idx_comment_responses_platform ON public.comment_responses_2025_10_25_19_00(platform);
CREATE INDEX IF NOT EXISTS idx_comment_responses_created_at ON public.comment_responses_2025_10_25_19_00(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns_2025_10_25_19_00(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies_2025_10_25_19_00(user_id);
CREATE INDEX IF NOT EXISTS idx_discovered_posts_campaign_id ON public.discovered_posts_2025_10_25_19_00(campaign_id);

-- Enable Row Level Security
ALTER TABLE public.companies_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_posts_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_responses_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own companies" ON public.companies_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own campaigns" ON public.campaigns_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own discovered posts" ON public.discovered_posts_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comment responses" ON public.comment_responses_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample companies
INSERT INTO public.companies_2025_10_25_19_00 (name, description, user_id) VALUES
('Orylu', 'AI-powered business automation platform', auth.uid()),
('Acid Vault', 'Secure digital asset management', auth.uid()),
('Acid Concepts', 'Professional automation solutions', auth.uid())
ON CONFLICT DO NOTHING;

-- Insert sample data for demonstration
INSERT INTO public.comment_responses_2025_10_25_19_00 (
    campaign_id, 
    company_id,
    original_post_title,
    original_post_content,
    original_post_url,
    original_author,
    original_author_karma,
    original_upvotes,
    original_comments_count,
    original_created_at,
    platform,
    subreddit_or_group,
    ai_generated_response,
    ai_model_used,
    ai_confidence_score,
    status,
    priority,
    tags,
    sentiment_score,
    engagement_potential,
    user_id
) VALUES
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Acid Concepts' LIMIT 1),
    'Best AI tools for business automation?',
    'Looking for recommendations on AI tools that can help automate business processes. What are you using?',
    'https://reddit.com/r/entrepreneur/sample1',
    'business_owner_2024',
    1250,
    45,
    12,
    NOW() - INTERVAL '2 hours',
    'reddit',
    'r/entrepreneur',
    'Great question! For business automation, I''d recommend looking into tools like Zapier for workflow automation, and platforms like Acid Concepts that specialize in professional automation solutions. The key is finding tools that integrate well with your existing systems.',
    'gpt-4',
    0.87,
    'pending',
    2,
    ARRAY['business', 'automation', 'AI'],
    0.75,
    8,
    auth.uid()
),
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Orylu' LIMIT 1),
    'How to scale customer support with AI?',
    'Our startup is growing fast and we need to scale our customer support. Any AI solutions that work well?',
    'https://reddit.com/r/startups/sample2',
    'startup_founder',
    890,
    32,
    8,
    NOW() - INTERVAL '4 hours',
    'reddit',
    'r/startups',
    'Scaling customer support is crucial for growth! AI chatbots can handle 80% of common queries, freeing up your team for complex issues. Orylu offers AI-powered automation that can integrate with your existing support tools. Start with FAQ automation and gradually expand.',
    'gpt-3.5-turbo',
    0.82,
    'approved',
    3,
    ARRAY['customer-support', 'AI', 'scaling'],
    0.68,
    9,
    auth.uid()
)
ON CONFLICT DO NOTHING;