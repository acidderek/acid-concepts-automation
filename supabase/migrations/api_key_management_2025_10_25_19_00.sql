-- Create API keys management table
CREATE TABLE IF NOT EXISTS public.api_keys_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Platform information
    platform VARCHAR(50) NOT NULL, -- reddit, linkedin, twitter, facebook, etc.
    key_type VARCHAR(50) NOT NULL, -- client_id, client_secret, api_key, access_token, etc.
    
    -- Key data (encrypted)
    encrypted_key TEXT NOT NULL,
    key_name VARCHAR(100), -- friendly name for the key
    
    -- Validation status
    is_valid BOOLEAN DEFAULT FALSE,
    last_validated TIMESTAMP WITH TIME ZONE,
    validation_error TEXT,
    
    -- Usage tracking
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[], -- API scopes/permissions
    rate_limit_info JSONB, -- rate limiting information
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API key validation log table
CREATE TABLE IF NOT EXISTS public.api_key_validation_log_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID REFERENCES public.api_keys_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Validation details
    validation_type VARCHAR(50) NOT NULL, -- connection_test, permission_check, rate_limit_check
    validation_result VARCHAR(20) NOT NULL, -- success, failed, warning
    validation_message TEXT,
    
    -- Response details
    response_time_ms INTEGER,
    http_status_code INTEGER,
    api_response JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platform configuration table
CREATE TABLE IF NOT EXISTS public.platform_configurations_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Platform details
    platform VARCHAR(50) NOT NULL,
    configuration_name VARCHAR(100) NOT NULL,
    
    -- Configuration data
    config_data JSONB NOT NULL, -- platform-specific settings
    
    -- API key references
    required_keys TEXT[], -- list of required key types
    configured_keys UUID[], -- references to api_keys table
    
    -- Status
    is_complete BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Validation
    last_tested TIMESTAMP WITH TIME ZONE,
    test_result VARCHAR(20), -- success, failed, partial
    test_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, platform, configuration_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_platform ON public.api_keys_2025_10_25_19_00(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys_2025_10_25_19_00(is_active);
CREATE INDEX IF NOT EXISTS idx_validation_log_key ON public.api_key_validation_log_2025_10_25_19_00(api_key_id);
CREATE INDEX IF NOT EXISTS idx_platform_config_user ON public.platform_configurations_2025_10_25_19_00(user_id, platform);

-- Enable Row Level Security
ALTER TABLE public.api_keys_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_validation_log_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_configurations_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own API keys" ON public.api_keys_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own validation logs" ON public.api_key_validation_log_2025_10_25_19_00
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.api_keys_2025_10_25_19_00 
            WHERE id = api_key_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own platform configurations" ON public.platform_configurations_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample platform configurations
INSERT INTO public.platform_configurations_2025_10_25_19_00 (
    user_id, platform, configuration_name, config_data, required_keys, is_complete
) VALUES
(
    auth.uid(),
    'reddit',
    'Reddit API Configuration',
    '{
        "user_agent": "MyApp/1.0",
        "rate_limit": {"requests_per_minute": 60},
        "endpoints": {
            "oauth": "https://www.reddit.com/api/v1/access_token",
            "api": "https://oauth.reddit.com"
        }
    }',
    ARRAY['client_id', 'client_secret', 'username', 'password'],
    FALSE
),
(
    auth.uid(),
    'openai',
    'OpenAI API Configuration',
    '{
        "model": "gpt-3.5-turbo",
        "max_tokens": 300,
        "temperature": 0.7,
        "rate_limit": {"requests_per_minute": 60}
    }',
    ARRAY['api_key'],
    FALSE
),
(
    auth.uid(),
    'stripe',
    'Stripe Payment Configuration',
    '{
        "currency": "usd",
        "webhook_endpoint": "/api/webhooks/stripe",
        "success_url": "/payment/success",
        "cancel_url": "/payment/cancel"
    }',
    ARRAY['publishable_key', 'secret_key'],
    FALSE
);