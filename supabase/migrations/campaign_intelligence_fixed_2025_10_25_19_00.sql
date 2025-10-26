-- Create campaign knowledge base table
CREATE TABLE IF NOT EXISTS public.campaign_knowledge_base_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Document information
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- pdf, docx, txt, md, etc.
    file_path TEXT NOT NULL, -- path in storage bucket
    file_size INTEGER DEFAULT 0,
    storage_bucket VARCHAR(100) NOT NULL,
    
    -- Content extraction
    extracted_text TEXT,
    document_summary TEXT,
    key_topics TEXT[],
    keywords TEXT[],
    
    -- AI processing
    embedding_data JSONB, -- for semantic search embeddings
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_error TEXT,
    
    -- Metadata
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create business context table
CREATE TABLE IF NOT EXISTS public.business_context_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Business information
    context_type VARCHAR(50) NOT NULL, -- background, products, services, case_studies, faq, etc.
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Categorization
    category VARCHAR(100), -- marketing, technical, support, sales, etc.
    tags TEXT[],
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
    
    -- AI processing
    embedding_data JSONB,
    summary TEXT,
    key_points TEXT[],
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    effectiveness_score DECIMAL(3,2) DEFAULT 0, -- based on response performance
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI context usage table (tracks which context was used for which responses)
CREATE TABLE IF NOT EXISTS public.ai_context_usage_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.comment_responses_2025_10_25_19_00(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Context sources used
    knowledge_base_ids UUID[],
    business_context_ids UUID[],
    
    -- Context relevance
    context_relevance_score DECIMAL(3,2) DEFAULT 0,
    context_summary TEXT,
    
    -- Performance tracking
    response_quality_score DECIMAL(3,2) DEFAULT 0,
    engagement_improvement DECIMAL(5,2) DEFAULT 0, -- % improvement vs baseline
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign intelligence settings table
CREATE TABLE IF NOT EXISTS public.campaign_intelligence_settings_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Storage configuration
    storage_bucket_name VARCHAR(100) NOT NULL,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'docx', 'txt', 'md', 'csv'],
    
    -- AI context settings
    use_document_context BOOLEAN DEFAULT TRUE,
    use_business_context BOOLEAN DEFAULT TRUE,
    context_relevance_threshold DECIMAL(3,2) DEFAULT 0.7,
    max_context_length INTEGER DEFAULT 2000, -- characters
    
    -- Processing settings
    auto_extract_text BOOLEAN DEFAULT TRUE,
    auto_generate_summaries BOOLEAN DEFAULT TRUE,
    auto_extract_keywords BOOLEAN DEFAULT TRUE,
    enable_semantic_search BOOLEAN DEFAULT TRUE,
    
    -- Learning settings
    learn_from_performance BOOLEAN DEFAULT TRUE,
    update_context_effectiveness BOOLEAN DEFAULT TRUE,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_campaign ON public.campaign_knowledge_base_2025_10_25_19_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_company ON public.campaign_knowledge_base_2025_10_25_19_00(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON public.campaign_knowledge_base_2025_10_25_19_00(processing_status);
CREATE INDEX IF NOT EXISTS idx_business_context_campaign ON public.business_context_2025_10_25_19_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_business_context_type ON public.business_context_2025_10_25_19_00(context_type);
CREATE INDEX IF NOT EXISTS idx_business_context_active ON public.business_context_2025_10_25_19_00(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_context_usage_response ON public.ai_context_usage_2025_10_25_19_00(response_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_settings_campaign ON public.campaign_intelligence_settings_2025_10_25_19_00(campaign_id);

-- Enable Row Level Security
ALTER TABLE public.campaign_knowledge_base_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_context_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_usage_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_intelligence_settings_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own knowledge base" ON public.campaign_knowledge_base_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own business context" ON public.business_context_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI context usage" ON public.ai_context_usage_2025_10_25_19_00
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns_2025_10_25_19_00 
            WHERE id = campaign_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own intelligence settings" ON public.campaign_intelligence_settings_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample data
INSERT INTO public.business_context_2025_10_25_19_00 (
    campaign_id, company_id, context_type, title, content, category, tags, priority, user_id
) VALUES
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Acid Concepts' LIMIT 1),
    'background',
    'Company Background and Mission',
    'Acid Concepts was founded in 2021 with the mission to help professional service firms automate their workflows and focus on what they do best - serving their clients. We specialize in client portal automation, document generation, and workflow orchestration. Our unique approach combines industry-specific templates with customizable solutions that adapt to each client''s exact workflow. We have helped over 200 professional service firms reduce administrative tasks by 50% on average, allowing them to take on more clients without increasing overhead. Our dedicated success managers ensure smooth implementation and ongoing optimization.',
    'marketing',
    ARRAY['company-background', 'mission', 'services'],
    3,
    auth.uid()
),
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Orylu' LIMIT 1),
    'products',
    'Orylu AI Automation Platform Features',
    'Orylu offers three core products: 1) Workflow Automation - Our no-code platform allows businesses to create complex automations without technical expertise. Users can set up workflows that typically deliver ROI within 30 days. 2) AI Customer Support - 24/7 automated customer service with human-like responses that can handle 80% of common queries. 3) Data Analytics - Real-time insights and predictive analytics that help businesses make data-driven decisions. Our platform is 90% faster to implement than competitors and includes comprehensive training and support.',
    'technical',
    ARRAY['products', 'features', 'automation', 'AI'],
    3,
    auth.uid()
),
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    (SELECT id FROM public.companies_2025_10_25_19_00 WHERE name = 'Acid Vault' LIMIT 1),
    'case_studies',
    'Enterprise Security Implementation Success',
    'Case Study: Fortune 500 Financial Institution - Implemented Acid Vault''s Enterprise Vault solution to secure $2.5B in digital assets. Results: 99.99% uptime achieved, zero security incidents in 18 months, SOC 2 Type II compliance maintained, 40% reduction in security management overhead. The client praised our zero-knowledge architecture and military-grade encryption. Quote from CISO: "Acid Vault gave us the confidence to fully embrace digital transformation while maintaining the highest security standards our industry demands."',
    'sales',
    ARRAY['case-study', 'enterprise', 'security', 'results'],
    3,
    auth.uid()
);

-- Insert sample intelligence settings
INSERT INTO public.campaign_intelligence_settings_2025_10_25_19_00 (
    campaign_id, storage_bucket_name, max_file_size_mb, allowed_file_types,
    use_document_context, use_business_context, context_relevance_threshold,
    max_context_length, auto_extract_text, auto_generate_summaries,
    user_id
) VALUES
(
    (SELECT id FROM public.campaigns_2025_10_25_19_00 LIMIT 1),
    'campaign-intelligence-docs',
    25,
    ARRAY['pdf', 'docx', 'txt', 'md', 'csv', 'pptx'],
    TRUE,
    TRUE,
    0.75,
    2500,
    TRUE,
    TRUE,
    auth.uid()
);