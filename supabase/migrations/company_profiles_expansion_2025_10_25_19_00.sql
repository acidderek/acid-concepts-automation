-- Update companies table with comprehensive details
ALTER TABLE public.companies_2025_10_25_19_00 
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS company_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS headquarters VARCHAR(100),
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7), -- hex color
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7), -- hex color
ADD COLUMN IF NOT EXISTS brand_voice VARCHAR(50), -- professional, casual, friendly, authoritative
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS key_products JSONB,
ADD COLUMN IF NOT EXISTS messaging_guidelines TEXT,
ADD COLUMN IF NOT EXISTS do_not_mention TEXT[], -- topics to avoid
ADD COLUMN IF NOT EXISTS preferred_hashtags TEXT[],
ADD COLUMN IF NOT EXISTS social_media_handles JSONB,
ADD COLUMN IF NOT EXISTS company_values TEXT[],
ADD COLUMN IF NOT EXISTS unique_selling_points TEXT[],
ADD COLUMN IF NOT EXISTS competitor_mentions_allowed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS response_templates JSONB,
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'; -- active, inactive, archived

-- Update existing companies with detailed information
UPDATE public.companies_2025_10_25_19_00 
SET 
    industry = 'AI & Automation',
    website_url = 'https://orylu.com',
    tagline = 'AI-Powered Business Automation Platform',
    company_size = '11-50 employees',
    founded_year = 2023,
    headquarters = 'San Francisco, CA',
    primary_color = '#2563eb', -- blue
    secondary_color = '#1d4ed8', -- darker blue
    brand_voice = 'professional',
    target_audience = 'Small to medium businesses looking to automate workflows and improve efficiency through AI-powered solutions',
    key_products = '[
        {"name": "Workflow Automation", "description": "Streamline business processes with intelligent automation"},
        {"name": "AI Customer Support", "description": "24/7 automated customer service with human-like responses"},
        {"name": "Data Analytics", "description": "Real-time insights and predictive analytics for business growth"}
    ]'::jsonb,
    messaging_guidelines = 'Focus on efficiency, ROI, and practical AI solutions. Emphasize ease of use and quick implementation. Always mention specific benefits and use cases.',
    do_not_mention = ARRAY['competitors by name', 'pricing without context', 'technical jargon without explanation'],
    preferred_hashtags = ARRAY['#AIAutomation', '#BusinessEfficiency', '#WorkflowOptimization', '#SmartBusiness'],
    social_media_handles = '{
        "twitter": "@orylu_ai",
        "linkedin": "company/orylu",
        "facebook": "orylu.official"
    }'::jsonb,
    company_values = ARRAY['Innovation', 'Efficiency', 'Customer Success', 'Transparency'],
    unique_selling_points = ARRAY[
        'No-code automation platform',
        '90% faster implementation than competitors',
        '24/7 AI-powered customer support',
        'ROI visible within 30 days'
    ],
    competitor_mentions_allowed = FALSE,
    response_templates = '{
        "introduction": "Orylu specializes in AI-powered business automation that helps companies streamline their workflows and boost productivity.",
        "problem_solving": "This is exactly the type of challenge Orylu was designed to solve. Our platform can automate [specific process] and typically delivers results within [timeframe].",
        "value_proposition": "What sets Orylu apart is our no-code approach - you can set up complex automations without any technical expertise."
    }'::jsonb,
    contact_email = 'hello@orylu.com',
    contact_phone = '+1-555-ORYLU-AI',
    status = 'active'
WHERE name = 'Orylu';

UPDATE public.companies_2025_10_25_19_00 
SET 
    industry = 'Cybersecurity & Digital Assets',
    website_url = 'https://acidvault.com',
    tagline = 'Secure Digital Asset Management',
    company_size = '51-200 employees',
    founded_year = 2022,
    headquarters = 'Austin, TX',
    primary_color = '#dc2626', -- red
    secondary_color = '#b91c1c', -- darker red
    brand_voice = 'authoritative',
    target_audience = 'Enterprise organizations and high-net-worth individuals requiring secure digital asset storage and management',
    key_products = '[
        {"name": "Enterprise Vault", "description": "Military-grade security for digital assets and sensitive data"},
        {"name": "Multi-Signature Wallets", "description": "Advanced cryptocurrency and digital asset protection"},
        {"name": "Compliance Suite", "description": "Regulatory compliance tools for financial institutions"}
    ]'::jsonb,
    messaging_guidelines = 'Emphasize security, trust, and compliance. Use authoritative tone with technical credibility. Focus on risk mitigation and peace of mind.',
    do_not_mention = ARRAY['specific security vulnerabilities', 'competitor security breaches', 'unverified claims'],
    preferred_hashtags = ARRAY['#DigitalSecurity', '#AssetProtection', '#Cybersecurity', '#EnterpriseVault'],
    social_media_handles = '{
        "twitter": "@acidvault_sec",
        "linkedin": "company/acid-vault",
        "reddit": "u/AcidVaultSecurity"
    }'::jsonb,
    company_values = ARRAY['Security First', 'Trust', 'Innovation', 'Compliance'],
    unique_selling_points = ARRAY[
        'Military-grade encryption',
        'Zero-knowledge architecture',
        'SOC 2 Type II certified',
        '99.99% uptime guarantee',
        'Insurance coverage up to $100M'
    ],
    competitor_mentions_allowed = FALSE,
    response_templates = '{
        "introduction": "Acid Vault provides enterprise-grade security solutions for digital asset management with military-level encryption and compliance.",
        "security_focus": "Security is our top priority. Our zero-knowledge architecture ensures that even we cannot access your protected assets.",
        "compliance": "We maintain SOC 2 Type II certification and work with regulated financial institutions to ensure full compliance."
    }'::jsonb,
    contact_email = 'security@acidvault.com',
    contact_phone = '+1-555-VAULT-SEC',
    status = 'active'
WHERE name = 'Acid Vault';

UPDATE public.companies_2025_10_25_19_00 
SET 
    industry = 'Professional Services & Automation',
    website_url = 'https://acidconcepts.com',
    tagline = 'Professional Automation Solutions',
    company_size = '11-50 employees',
    founded_year = 2021,
    headquarters = 'Toronto, ON',
    primary_color = '#059669', -- green
    secondary_color = '#047857', -- darker green
    brand_voice = 'professional',
    target_audience = 'Professional service firms, consultants, and agencies looking to automate client workflows and improve service delivery',
    key_products = '[
        {"name": "Client Portal Automation", "description": "Streamlined client onboarding and project management"},
        {"name": "Document Generation", "description": "Automated creation of contracts, proposals, and reports"},
        {"name": "Workflow Orchestration", "description": "End-to-end process automation for professional services"}
    ]'::jsonb,
    messaging_guidelines = 'Professional yet approachable tone. Focus on efficiency gains, client satisfaction, and professional growth. Emphasize proven results and industry expertise.',
    do_not_mention = ARRAY['specific client names without permission', 'proprietary methodologies of competitors'],
    preferred_hashtags = ARRAY['#ProfessionalServices', '#ClientSuccess', '#WorkflowAutomation', '#BusinessGrowth'],
    social_media_handles = '{
        "twitter": "@acidconcepts",
        "linkedin": "company/acid-concepts",
        "instagram": "@acidconcepts_pro"
    }'::jsonb,
    company_values = ARRAY['Excellence', 'Client Success', 'Innovation', 'Integrity'],
    unique_selling_points = ARRAY[
        'Industry-specific automation templates',
        'White-label solutions available',
        '50% reduction in administrative tasks',
        'Dedicated success manager for each client'
    ],
    competitor_mentions_allowed = TRUE,
    response_templates = '{
        "introduction": "Acid Concepts helps professional service firms automate their workflows and focus on what they do best - serving their clients.",
        "efficiency": "Our clients typically see a 50% reduction in administrative tasks, allowing them to take on more clients without increasing overhead.",
        "customization": "Every professional service is unique. We provide industry-specific templates and can customize solutions to match your exact workflow."
    }'::jsonb,
    contact_email = 'hello@acidconcepts.com',
    contact_phone = '+1-416-ACID-PRO',
    status = 'active'
WHERE name = 'Acid Concepts';

-- Insert additional sample companies
INSERT INTO public.companies_2025_10_25_19_00 (
    name, description, industry, website_url, tagline, company_size, founded_year, headquarters,
    primary_color, secondary_color, brand_voice, target_audience, key_products, messaging_guidelines,
    do_not_mention, preferred_hashtags, social_media_handles, company_values, unique_selling_points,
    competitor_mentions_allowed, response_templates, contact_email, contact_phone, status, user_id
) VALUES 
(
    'TechFlow Solutions',
    'Enterprise software development and consulting',
    'Software Development',
    'https://techflowsolutions.com',
    'Building Tomorrow''s Software Today',
    '201-500 employees',
    2019,
    'Seattle, WA',
    '#6366f1', -- indigo
    '#4f46e5', -- darker indigo
    'professional',
    'Enterprise clients needing custom software solutions and digital transformation services',
    '[
        {"name": "Custom Software Development", "description": "Tailored enterprise applications and systems"},
        {"name": "Cloud Migration", "description": "Seamless transition to cloud infrastructure"},
        {"name": "Digital Transformation", "description": "Complete business process digitization"}
    ]'::jsonb,
    'Emphasize technical expertise, scalability, and long-term partnerships. Focus on business outcomes rather than just technology.',
    ARRAY['specific client project details', 'proprietary technologies without context'],
    ARRAY['#EnterpriseSoftware', '#DigitalTransformation', '#CloudMigration', '#CustomDevelopment'],
    '{
        "twitter": "@techflow_dev",
        "linkedin": "company/techflow-solutions",
        "github": "techflow-solutions"
    }'::jsonb,
    ARRAY['Innovation', 'Quality', 'Partnership', 'Scalability'],
    ARRAY[
        'Fortune 500 client portfolio',
        '99.9% project success rate',
        'Agile development methodology',
        '24/7 support and maintenance'
    ],
    TRUE,
    '{
        "introduction": "TechFlow Solutions partners with enterprises to build scalable, innovative software solutions that drive business growth.",
        "expertise": "With over 200 successful enterprise implementations, we understand the complexities of large-scale software development.",
        "partnership": "We don''t just build software - we become your long-term technology partner, ensuring your solutions evolve with your business."
    }'::jsonb,
    'contact@techflowsolutions.com',
    '+1-206-TECH-FLOW',
    'active',
    auth.uid()
),
(
    'GreenTech Innovations',
    'Sustainable technology and renewable energy solutions',
    'Clean Technology',
    'https://greentechinnovations.com',
    'Powering a Sustainable Future',
    '101-200 employees',
    2020,
    'Portland, OR',
    '#10b981', -- emerald
    '#059669', -- darker emerald
    'friendly',
    'Businesses and municipalities looking to adopt sustainable technology and reduce environmental impact',
    '[
        {"name": "Solar Energy Systems", "description": "Commercial and residential solar installations"},
        {"name": "Energy Storage", "description": "Advanced battery systems for renewable energy"},
        {"name": "Smart Grid Solutions", "description": "Intelligent energy management and distribution"}
    ]'::jsonb,
    'Focus on environmental benefits, cost savings, and future-proofing. Use optimistic tone about sustainability and innovation.',
    ARRAY['political statements', 'criticism of traditional energy without context'],
    ARRAY['#CleanTech', '#SustainableEnergy', '#GreenTechnology', '#RenewableEnergy'],
    '{
        "twitter": "@greentech_innov",
        "linkedin": "company/greentech-innovations",
        "instagram": "@greentech_innovations"
    }'::jsonb,
    ARRAY['Sustainability', 'Innovation', 'Community', 'Transparency'],
    ARRAY[
        'Carbon-negative manufacturing process',
        '25-year warranty on all systems',
        'Local job creation in every market',
        'Financing options available'
    ],
    TRUE,
    '{
        "introduction": "GreenTech Innovations makes sustainable energy accessible and affordable for businesses and communities.",
        "environmental": "Every installation helps reduce carbon footprint while providing long-term energy cost savings.",
        "community": "We''re not just installing technology - we''re building sustainable communities and creating local jobs."
    }'::jsonb,
    'info@greentechinnovations.com',
    '+1-503-GREEN-TECH',
    'active',
    auth.uid()
)
ON CONFLICT (name) DO NOTHING;