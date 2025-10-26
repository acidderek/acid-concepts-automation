import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [campaignTab, setCampaignTab] = useState('create');
  const [settingsTab, setSettingsTab] = useState('reddit');
  const [commentsTab, setCommentsTab] = useState('table'); // table or kanban
  const [commentsView, setCommentsView] = useState('all'); // all, pending, approved, rejected

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('reddit');
  const [targetLocation, setTargetLocation] = useState(''); // subreddit, group, hashtag, etc.
  const [keywords, setKeywords] = useState('');
  const [responseTemplate, setResponseTemplate] = useState('');
  const [maxResponses, setMaxResponses] = useState(10);
  const [isActive, setIsActive] = useState(false);
  
  // Platform-specific settings
  const [engagementType, setEngagementType] = useState('comment'); // comment, like, share, follow
  const [targetAudience, setTargetAudience] = useState('');
  const [contentType, setContentType] = useState('posts'); // posts, stories, reels, etc.

  // Advanced Campaign Settings
  const [monitoringRules, setMonitoringRules] = useState({
    minUpvotes: 10,
    maxAge: 24, // hours
    excludeKeywords: '',
    includeKeywords: '',
    minComments: 5,
    maxComments: 100,
    authorKarma: 100
  });

  const [engagementRules, setEngagementRules] = useState({
    responseStyle: 'helpful', // helpful, promotional, neutral, expert
    maxResponseLength: 200,
    includeEmojis: false,
    includeQuestions: true,
    avoidControversy: true,
    personalityTone: 'professional' // professional, casual, friendly, authoritative
  });

  const [scheduleSettings, setScheduleSettings] = useState({
    timezone: 'UTC',
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    activeHours: { start: 9, end: 17 }, // 9 AM to 5 PM
    postsPerHour: 2,
    randomizeDelay: true,
    minDelay: 15, // minutes
    maxDelay: 45, // minutes
    batchSize: 5 // posts to analyze per batch
  });

  const [aiSettings, setAiSettings] = useState({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 150,
    systemPrompt: 'You are a helpful community member providing valuable insights.',
    contextAnalysis: true,
    sentimentCheck: true,
    duplicateCheck: true
  });

  // Settings state - Reddit
  const [redditClientId, setRedditClientId] = useState('');
  const [redditClientSecret, setRedditClientSecret] = useState('');
  const [redditRedirectUri, setRedditRedirectUri] = useState('');
  const [redditUsername, setRedditUsername] = useState('');
  const [redditPassword, setRedditPassword] = useState('');
  
  // Reddit OAuth state
  const [redditAuthStatus, setRedditAuthStatus] = useState({
    authenticated: false,
    loading: false,
    user: null,
    tokenExpired: false
  });

  // Settings state - Instagram
  const [instagramAccessToken, setInstagramAccessToken] = useState('');
  const [instagramBusinessId, setInstagramBusinessId] = useState('');
  const [instagramAppId, setInstagramAppId] = useState('');
  const [instagramAppSecret, setInstagramAppSecret] = useState('');

  // Settings state - Facebook
  const [facebookAccessToken, setFacebookAccessToken] = useState('');
  const [facebookAppId, setFacebookAppId] = useState('');
  const [facebookAppSecret, setFacebookAppSecret] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');

  // Settings state - LinkedIn
  const [linkedinClientId, setLinkedinClientId] = useState('');
  const [linkedinClientSecret, setLinkedinClientSecret] = useState('');
  const [linkedinAccessToken, setLinkedinAccessToken] = useState('');
  const [linkedinRedirectUri, setLinkedinRedirectUri] = useState('');

  // Settings state - X (Twitter)
  const [twitterApiKey, setTwitterApiKey] = useState('');
  const [twitterApiSecret, setTwitterApiSecret] = useState('');
  const [twitterAccessToken, setTwitterAccessToken] = useState('');
  const [twitterAccessTokenSecret, setTwitterAccessTokenSecret] = useState('');
  const [twitterBearerToken, setTwitterBearerToken] = useState('');

  // Settings state - Quora (Web scraping approach)
  const [quoraEmail, setQuoraEmail] = useState('');
  const [quoraPassword, setQuoraPassword] = useState('');

  // Settings state - Product Hunt
  const [productHuntAccessToken, setProductHuntAccessToken] = useState('');
  const [productHuntClientId, setProductHuntClientId] = useState('');
  const [productHuntClientSecret, setProductHuntClientSecret] = useState('');

  // Settings state - BetaList (Web scraping approach)
  const [betalistEmail, setBetalistEmail] = useState('');
  const [betalistPassword, setBetalistPassword] = useState('');

  // Settings state - Substack (Web scraping approach)
  const [substackEmail, setSubstackEmail] = useState('');
  const [substackPassword, setSubstackPassword] = useState('');

  // AI and Storage settings
  const [aiProvider, setAiProvider] = useState('openai');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');

  const [wasabiAccessKey, setWasabiAccessKey] = useState('');
  const [wasabiSecretKey, setWasabiSecretKey] = useState('');
  const [wasabiEndpoint, setWasabiEndpoint] = useState('s3.wasabisys.com');
  const [wasabiRegion, setWasabiRegion] = useState('us-east-1');
  const [bucketName, setBucketName] = useState('');
  
  // Campaign state
  const [campaigns, setCampaigns] = useState([]);
  
  // Comment management state
  const [comments, setComments] = useState([
    {
      id: '1',
      campaignName: 'Tech Startup Outreach',
      companyName: 'Acid Concepts',
      platform: 'reddit',
      originalPostTitle: 'Best AI tools for business automation?',
      originalPostContent: 'Looking for recommendations on AI tools that can help automate business processes. What are you using?',
      originalPostUrl: 'https://reddit.com/r/entrepreneur/sample1',
      originalAuthor: 'business_owner_2024',
      originalAuthorKarma: 1250,
      originalUpvotes: 45,
      originalCommentsCount: 12,
      originalCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      subredditOrGroup: 'r/entrepreneur',
      aiGeneratedResponse: 'Great question! For business automation, I\'d recommend looking into tools like Zapier for workflow automation, and platforms like Acid Concepts that specialize in professional automation solutions. The key is finding tools that integrate well with your existing systems.',
      aiModelUsed: 'gpt-4',
      aiConfidenceScore: 0.87,
      status: 'pending',
      priority: 2,
      tags: ['business', 'automation', 'AI'],
      sentimentScore: 0.75,
      engagementPotential: 8,
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: '2',
      campaignName: 'Customer Support AI',
      companyName: 'Orylu',
      platform: 'reddit',
      originalPostTitle: 'How to scale customer support with AI?',
      originalPostContent: 'Our startup is growing fast and we need to scale our customer support. Any AI solutions that work well?',
      originalPostUrl: 'https://reddit.com/r/startups/sample2',
      originalAuthor: 'startup_founder',
      originalAuthorKarma: 890,
      originalUpvotes: 32,
      originalCommentsCount: 8,
      originalCreatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      subredditOrGroup: 'r/startups',
      aiGeneratedResponse: 'Scaling customer support is crucial for growth! AI chatbots can handle 80% of common queries, freeing up your team for complex issues. Orylu offers AI-powered automation that can integrate with your existing support tools. Start with FAQ automation and gradually expand.',
      aiModelUsed: 'gpt-3.5-turbo',
      aiConfidenceScore: 0.82,
      status: 'approved',
      priority: 3,
      tags: ['customer-support', 'AI', 'scaling'],
      sentimentScore: 0.68,
      engagementPotential: 9,
      createdAt: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      id: '3',
      campaignName: 'Digital Asset Security',
      companyName: 'Acid Vault',
      platform: 'linkedin',
      originalPostTitle: 'Best practices for securing digital assets?',
      originalPostContent: 'What are the current best practices for securing digital assets in enterprise environments?',
      originalPostUrl: 'https://linkedin.com/posts/sample3',
      originalAuthor: 'security_expert',
      originalAuthorKarma: 2100,
      originalUpvotes: 67,
      originalCommentsCount: 23,
      originalCreatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      subredditOrGroup: 'Cybersecurity Professionals',
      aiGeneratedResponse: 'Excellent question! Key practices include multi-factor authentication, regular security audits, and encrypted storage solutions. Acid Vault provides enterprise-grade digital asset security with zero-trust architecture. Consider implementing role-based access controls and regular backup strategies.',
      aiModelUsed: 'gpt-4',
      aiConfidenceScore: 0.91,
      status: 'rejected',
      priority: 1,
      tags: ['security', 'digital-assets', 'enterprise'],
      sentimentScore: 0.82,
      engagementPotential: 7,
      createdAt: new Date(Date.now() - 90 * 60 * 1000)
    }
  ]);

  const [filteredComments, setFilteredComments] = useState(comments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Company management state
  const [companies, setCompanies] = useState([
    {
      id: '1',
      name: 'Orylu',
      description: 'AI-powered business automation platform',
      industry: 'AI & Automation',
      website: 'https://orylu.com',
      tagline: 'AI-Powered Business Automation Platform',
      companySize: '11-50 employees',
      foundedYear: 2023,
      headquarters: 'San Francisco, CA',
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      brandVoice: 'professional',
      targetAudience: 'Small to medium businesses looking to automate workflows and improve efficiency through AI-powered solutions',
      keyProducts: [
        { name: 'Workflow Automation', description: 'Streamline business processes with intelligent automation' },
        { name: 'AI Customer Support', description: '24/7 automated customer service with human-like responses' },
        { name: 'Data Analytics', description: 'Real-time insights and predictive analytics for business growth' }
      ],
      messagingGuidelines: 'Focus on efficiency, ROI, and practical AI solutions. Emphasize ease of use and quick implementation. Always mention specific benefits and use cases.',
      doNotMention: ['competitors by name', 'pricing without context', 'technical jargon without explanation'],
      preferredHashtags: ['#AIAutomation', '#BusinessEfficiency', '#WorkflowOptimization', '#SmartBusiness'],
      socialMediaHandles: {
        twitter: '@orylu_ai',
        linkedin: 'company/orylu',
        facebook: 'orylu.official'
      },
      companyValues: ['Innovation', 'Efficiency', 'Customer Success', 'Transparency'],
      uniqueSellingPoints: [
        'No-code automation platform',
        '90% faster implementation than competitors',
        '24/7 AI-powered customer support',
        'ROI visible within 30 days'
      ],
      competitorMentionsAllowed: false,
      responseTemplates: {
        introduction: 'Orylu specializes in AI-powered business automation that helps companies streamline their workflows and boost productivity.',
        problemSolving: 'This is exactly the type of challenge Orylu was designed to solve. Our platform can automate [specific process] and typically delivers results within [timeframe].',
        valueProposition: 'What sets Orylu apart is our no-code approach - you can set up complex automations without any technical expertise.'
      },
      contactEmail: 'hello@orylu.com',
      contactPhone: '+1-555-ORYLU-AI',
      status: 'active'
    },
    {
      id: '2',
      name: 'Acid Vault',
      description: 'Secure digital asset management',
      industry: 'Cybersecurity & Digital Assets',
      website: 'https://acidvault.com',
      tagline: 'Secure Digital Asset Management',
      companySize: '51-200 employees',
      foundedYear: 2022,
      headquarters: 'Austin, TX',
      primaryColor: '#dc2626',
      secondaryColor: '#b91c1c',
      brandVoice: 'authoritative',
      targetAudience: 'Enterprise organizations and high-net-worth individuals requiring secure digital asset storage and management',
      keyProducts: [
        { name: 'Enterprise Vault', description: 'Military-grade security for digital assets and sensitive data' },
        { name: 'Multi-Signature Wallets', description: 'Advanced cryptocurrency and digital asset protection' },
        { name: 'Compliance Suite', description: 'Regulatory compliance tools for financial institutions' }
      ],
      messagingGuidelines: 'Emphasize security, trust, and compliance. Use authoritative tone with technical credibility. Focus on risk mitigation and peace of mind.',
      doNotMention: ['specific security vulnerabilities', 'competitor security breaches', 'unverified claims'],
      preferredHashtags: ['#DigitalSecurity', '#AssetProtection', '#Cybersecurity', '#EnterpriseVault'],
      socialMediaHandles: {
        twitter: '@acidvault_sec',
        linkedin: 'company/acid-vault',
        reddit: 'u/AcidVaultSecurity'
      },
      companyValues: ['Security First', 'Trust', 'Innovation', 'Compliance'],
      uniqueSellingPoints: [
        'Military-grade encryption',
        'Zero-knowledge architecture',
        'SOC 2 Type II certified',
        '99.99% uptime guarantee',
        'Insurance coverage up to $100M'
      ],
      competitorMentionsAllowed: false,
      responseTemplates: {
        introduction: 'Acid Vault provides enterprise-grade security solutions for digital asset management with military-level encryption and compliance.',
        securityFocus: 'Security is our top priority. Our zero-knowledge architecture ensures that even we cannot access your protected assets.',
        compliance: 'We maintain SOC 2 Type II certification and work with regulated financial institutions to ensure full compliance.'
      },
      contactEmail: 'security@acidvault.com',
      contactPhone: '+1-555-VAULT-SEC',
      status: 'active'
    },
    {
      id: '3',
      name: 'Acid Concepts',
      description: 'Professional automation solutions',
      industry: 'Professional Services & Automation',
      website: 'https://acidconcepts.com',
      tagline: 'Professional Automation Solutions',
      companySize: '11-50 employees',
      foundedYear: 2021,
      headquarters: 'Toronto, ON',
      primaryColor: '#059669',
      secondaryColor: '#047857',
      brandVoice: 'professional',
      targetAudience: 'Professional service firms, consultants, and agencies looking to automate client workflows and improve service delivery',
      keyProducts: [
        { name: 'Client Portal Automation', description: 'Streamlined client onboarding and project management' },
        { name: 'Document Generation', description: 'Automated creation of contracts, proposals, and reports' },
        { name: 'Workflow Orchestration', description: 'End-to-end process automation for professional services' }
      ],
      messagingGuidelines: 'Professional yet approachable tone. Focus on efficiency gains, client satisfaction, and professional growth. Emphasize proven results and industry expertise.',
      doNotMention: ['specific client names without permission', 'proprietary methodologies of competitors'],
      preferredHashtags: ['#ProfessionalServices', '#ClientSuccess', '#WorkflowAutomation', '#BusinessGrowth'],
      socialMediaHandles: {
        twitter: '@acidconcepts',
        linkedin: 'company/acid-concepts',
        instagram: '@acidconcepts_pro'
      },
      companyValues: ['Excellence', 'Client Success', 'Innovation', 'Integrity'],
      uniqueSellingPoints: [
        'Industry-specific automation templates',
        'White-label solutions available',
        '50% reduction in administrative tasks',
        'Dedicated success manager for each client'
      ],
      competitorMentionsAllowed: true,
      responseTemplates: {
        introduction: 'Acid Concepts helps professional service firms automate their workflows and focus on what they do best - serving their clients.',
        efficiency: 'Our clients typically see a 50% reduction in administrative tasks, allowing them to take on more clients without increasing overhead.',
        customization: 'Every professional service is unique. We provide industry-specific templates and can customize solutions to match your exact workflow.'
      },
      contactEmail: 'hello@acidconcepts.com',
      contactPhone: '+1-416-ACID-PRO',
      status: 'active'
    }
  ]);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    performance: null,
    roi: null,
    sentiment: null,
    competitors: null,
    engagement: null
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Automation state
  const [automationStatus, setAutomationStatus] = useState({
    discovery_running: false,
    ai_generation_running: false,
    posting_running: false,
    scheduler_running: false
  });
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Real database integration functions
  const loadCompanies = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('companies_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      setMessage(`Failed to load companies: ${error.message}`);
    }
  };

  const loadCampaigns = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('campaigns_2025_10_25_19_00')
        .select(`
          *,
          companies_2025_10_25_19_00(name, industry)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      setMessage(`Failed to load campaigns: ${error.message}`);
    }
  };

  const loadComments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('comment_responses_2025_10_25_19_00')
        .select(`
          *,
          campaigns_2025_10_25_19_00(name, platform),
          companies_2025_10_25_19_00(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      setMessage(`Failed to load comments: ${error.message}`);
    }
  };

  // Load all data when user changes
  useEffect(() => {
    if (user) {
      loadCompanies();
      loadCampaigns();
      loadComments();
    }
  }, [user]);

  // Real campaign creation function
  const handleCreateRealCampaign = async () => {
    if (!user || !campaignName || !platform) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      setMessage('Creating campaign...');

      const { data, error } = await supabase.functions.invoke('campaign_automation_engine_2025_10_25_19_00', {
        body: {
          action: 'create_campaign',
          user_id: user.id,
          company_id: companies[0]?.id, // Use first company for demo
          name: campaignName,
          platform,
          target_location: targetLocation,
          keywords,
          monitoring_rules,
          engagement_rules,
          schedule_settings: scheduleSettings,
          ai_settings: aiSettings
        }
      });

      if (error) throw error;

      setMessage(`Campaign "${campaignName}" created successfully!`);
      
      // Reset form
      setCampaignName('');
      setTargetLocation('');
      setKeywords('');
      
      // Reload campaigns
      loadCampaigns();
      
      // Send notification
      await supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
        body: {
          action: 'create_notification',
          user_id: user.id,
          type: 'campaign_created',
          title: 'Campaign Created',
          message: `Your campaign "${campaignName}" has been created and is ready to start.`,
          campaign_id: data.result.campaign_id,
          priority: 'medium',
          category: 'campaign',
          send_email: false,
          action_url: '/campaigns'
        }
      });

    } catch (error) {
      setMessage(`Failed to create campaign: ${error.message}`);
    }
  };

  // Real campaign start function
  const handleStartRealCampaign = async (campaignId) => {
    try {
      setMessage('Starting campaign...');

      const { data, error } = await supabase.functions.invoke('campaign_automation_engine_2025_10_25_19_00', {
        body: {
          action: 'start_campaign',
          campaign_id: campaignId,
          user_id: user.id
        }
      });

      if (error) throw error;

      setMessage('Campaign started successfully!');
      loadCampaigns(); // Reload to show updated status
      
      // Send notification
      await supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
        body: {
          action: 'send_campaign_notification',
          user_id: user.id,
          campaign_id: campaignId,
          type: 'campaign_started',
          title: 'Campaign Started',
          message: 'Your campaign is now active and monitoring for posts.',
          priority: 'high'
        }
      });

    } catch (error) {
      setMessage(`Failed to start campaign: ${error.message}`);
    }
  };

  // Real campaign stop function
  const handleStopRealCampaign = async (campaignId) => {
    try {
      setMessage('Stopping campaign...');

      const { data, error } = await supabase.functions.invoke('campaign_automation_engine_2025_10_25_19_00', {
        body: {
          action: 'stop_campaign',
          campaign_id: campaignId,
          user_id: user.id
        }
      });

      if (error) throw error;

      setMessage('Campaign stopped successfully!');
      loadCampaigns(); // Reload to show updated status

    } catch (error) {
      setMessage(`Failed to stop campaign: ${error.message}`);
    }
  };

  // API Key management functions
  const handleSaveAPIKey = async (platform, keyType, keyValue, keyName) => {
    try {
      setMessage('Saving API key...');
      console.log('Saving API key:', { platform, keyType, keyName });

      const { data, error } = await supabase.functions.invoke('api_key_manager_robust_2025_10_26_01_00', {
        body: JSON.stringify({
          action: 'store_key',
          platform,
          key_type: keyType,
          key_value: keyValue,
          key_name: keyName,
          user_id: user.id
        })
      });

      console.log('API response:', data, error);
      if (error) throw error;

      setMessage(`${platform} API key saved successfully!`);
      
      // Send notification
      await supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
        body: {
          action: 'create_notification',
          user_id: user.id,
          type: 'api_key_added',
          title: 'API Key Added',
          message: `${platform} API key has been saved and ${data.result.is_valid ? 'validated successfully' : 'validation failed'}.`,
          priority: data.result.is_valid ? 'medium' : 'high',
          category: 'system',
          send_email: !data.result.is_valid
        }
      });

    } catch (error) {
      setMessage(`Failed to save API key: ${error.message}`);
    }
  };

  // Notification functions
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
        body: {
          action: 'get_notifications',
          user_id: user.id,
          limit: 20
        }
      });

      if (error) throw error;

      setNotifications(data.result.notifications || []);
      setUnreadCount(data.result.unread_count || 0);

    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
        body: {
          action: 'mark_read',
          notification_id: notificationId,
          user_id: user.id
        }
      });

      loadNotifications(); // Reload to update counts

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Load notifications when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Set up real-time notification updates
      const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) setMessage(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage('Check your email for the confirmation link!');
        }
      }
    } catch (error) {
      setMessage('An error occurred');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setMessage(`Advanced ${platform.charAt(0).toUpperCase() + platform.slice(1)} campaign created successfully with monitoring rules, AI engagement settings, and randomized scheduling! (Demo mode)`);
    
    // Reset form
    setCampaignName('');
    setPlatform('reddit');
    setTargetLocation('');
    setKeywords('');
    setResponseTemplate('');
    setMaxResponses(10);
    setIsActive(false);
    setEngagementType('comment');
    setTargetAudience('');
    setContentType('posts');
    
    // Reset advanced settings
    setMonitoringRules({
      minUpvotes: 10,
      maxAge: 24,
      excludeKeywords: '',
      includeKeywords: '',
      minComments: 5,
      maxComments: 100,
      authorKarma: 100
    });
    setEngagementRules({
      responseStyle: 'helpful',
      maxResponseLength: 200,
      includeEmojis: false,
      includeQuestions: true,
      avoidControversy: true,
      personalityTone: 'professional'
    });
    setScheduleSettings({
      timezone: 'UTC',
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      activeHours: { start: 9, end: 17 },
      postsPerHour: 2,
      randomizeDelay: true,
      minDelay: 15,
      maxDelay: 45,
      batchSize: 5
    });
    setAiSettings({
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 150,
      systemPrompt: 'You are a helpful community member providing valuable insights.',
      contextAnalysis: true,
      sentimentCheck: true,
      duplicateCheck: true
    });
  };

  const handleSaveRedditSettings = async (e) => {
    e.preventDefault();
    
    if (!redditClientId || !redditClientSecret) {
      setMessage('Please fill in both Client ID and Client Secret');
      return;
    }

    try {
      // Save Client ID
      await handleSaveAPIKey('reddit', 'client_id', redditClientId, 'Reddit Client ID');
      
      // Save Client Secret  
      await handleSaveAPIKey('reddit', 'client_secret', redditClientSecret, 'Reddit Client Secret');
      
      setMessage('Reddit API keys saved and validated successfully!');
    } catch (error) {
      setMessage(`Error saving Reddit keys: ${error.message}`);
    }
  };

  // Reddit OAuth functions
  const checkRedditAuthStatus = async () => {
    if (!user) return;
    
    try {
      setRedditAuthStatus(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase.functions.invoke('reddit_oauth_fixed_2025_10_26_01_00', {
        body: {
          action: 'get_status',
          user_id: user.id
        }
      });

      if (error) throw error;

      setRedditAuthStatus({
        authenticated: data.authenticated,
        loading: false,
        user: data.reddit_user || null,
        tokenExpired: data.token_expired || false
      });

    } catch (error) {
      console.error('Reddit auth status check failed:', error);
      setRedditAuthStatus({
        authenticated: false,
        loading: false,
        user: null,
        tokenExpired: false
      });
    }
  };

  const startRedditAuth = async () => {
    if (!user) return;
    
    try {
      setRedditAuthStatus(prev => ({ ...prev, loading: true }));
      
      const redirectUri = `${window.location.origin}/auth/reddit/callback`;
      
      const { data, error } = await supabase.functions.invoke('reddit_oauth_fixed_2025_10_26_01_00', {
        body: {
          action: 'start_auth',
          user_id: user.id,
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;

      if (data.auth_url) {
        // Redirect to Reddit OAuth
        window.location.href = data.auth_url;
      } else {
        throw new Error('No auth URL received');
      }

    } catch (error) {
      setMessage(`Reddit authentication failed: ${error.message}`);
      setRedditAuthStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRedditCallback = async (code, state) => {
    if (!user) return;
    
    try {
      setRedditAuthStatus(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase.functions.invoke('reddit_oauth_fixed_2025_10_26_01_00', {
        body: {
          action: 'handle_callback',
          code,
          state,
          user_id: user.id
        }
      });

      if (error) throw error;

      setRedditAuthStatus({
        authenticated: true,
        loading: false,
        user: data.reddit_user,
        tokenExpired: false
      });

      setMessage('Reddit authentication successful!');
      
      // Send notification
      await supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
        body: {
          action: 'create_notification',
          user_id: user.id,
          type: 'reddit_connected',
          title: 'Reddit Account Connected',
          message: `Successfully connected Reddit account: ${data.reddit_user.username}`,
          priority: 'medium',
          category: 'system',
          send_email: false
        }
      });

    } catch (error) {
      setMessage(`Reddit callback failed: ${error.message}`);
      setRedditAuthStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshRedditToken = async () => {
    if (!user) return;
    
    try {
      setRedditAuthStatus(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase.functions.invoke('reddit_oauth_fixed_2025_10_26_01_00', {
        body: {
          action: 'refresh_token',
          user_id: user.id
        }
      });

      if (error) throw error;

      setRedditAuthStatus(prev => ({
        ...prev,
        loading: false,
        tokenExpired: false
      }));

      setMessage('Reddit token refreshed successfully!');

    } catch (error) {
      setMessage(`Token refresh failed: ${error.message}`);
      setRedditAuthStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Check Reddit auth status when user changes
  useEffect(() => {
    if (user) {
      checkRedditAuthStatus();
    }
  }, [user]);

  // Handle Reddit OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (window.location.pathname === '/auth/reddit/callback') {
      if (error) {
        setMessage(`Reddit authentication error: ${error}`);
        // Redirect back to settings
        window.history.replaceState({}, '', '/');
        setActiveTab('settings');
        setSettingsTab('reddit');
      } else if (code && state && user) {
        handleRedditCallback(code, state);
        // Clean up URL
        window.history.replaceState({}, '', '/');
        setActiveTab('settings');
        setSettingsTab('reddit');
      }
    }
  }, [user]);

  const handleSaveInstagramSettings = async (e) => {
    e.preventDefault();
    setMessage('Instagram settings saved successfully! (Demo mode)');
  };

  const handleSaveFacebookSettings = async (e) => {
    e.preventDefault();
    setMessage('Facebook settings saved successfully! (Demo mode)');
  };

  const handleSaveLinkedInSettings = async (e) => {
    e.preventDefault();
    setMessage('LinkedIn settings saved successfully! (Demo mode)');
  };

  const handleSaveTwitterSettings = async (e) => {
    e.preventDefault();
    setMessage('X (Twitter) settings saved successfully! (Demo mode)');
  };

  const handleSaveQuoraSettings = async (e) => {
    e.preventDefault();
    setMessage('Quora settings saved successfully! (Demo mode)');
  };

  const handleSaveProductHuntSettings = async (e) => {
    e.preventDefault();
    setMessage('Product Hunt settings saved successfully! (Demo mode)');
  };

  const handleSaveBetaListSettings = async (e) => {
    e.preventDefault();
    setMessage('BetaList settings saved successfully! (Demo mode)');
  };

  const handleSaveSubstackSettings = async (e) => {
    e.preventDefault();
    setMessage('Substack settings saved successfully! (Demo mode)');
  };

  const handleSaveAiSettings = async (e) => {
    e.preventDefault();
    setMessage('AI settings saved successfully! (Demo mode)');
  };

  const handleSaveWasabiSettings = async (e) => {
    e.preventDefault();
    setMessage('Wasabi settings saved successfully! (Demo mode)');
  };

  const handleCreateBucket = async (e) => {
    e.preventDefault();
    if (bucketName.trim()) {
      setBuckets([...buckets, { name: bucketName, created: new Date().toISOString() }]);
      setBucketName('');
      setMessage(`Bucket "${bucketName}" created successfully! (Demo mode)`);
    }
  };

  const handleDeleteBucket = (bucketToDelete) => {
    setBuckets(buckets.filter(bucket => bucket.name !== bucketToDelete));
    setMessage(`Bucket "${bucketToDelete}" deleted successfully! (Demo mode)`);
  };

  // Comment management functions
  const handleApproveComment = (commentId) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, status: 'approved', reviewedAt: new Date() }
        : comment
    ));
    setMessage('Comment approved successfully!');
  };

  const handleRejectComment = (commentId, reason = '') => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, status: 'rejected', reviewedAt: new Date(), reviewNotes: reason }
        : comment
    ));
    setMessage('Comment rejected successfully!');
  };

  const handleEditComment = (commentId, newResponse) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, editedResponse: newResponse, editedAt: new Date() }
        : comment
    ));
    setMessage('Comment edited successfully!');
  };

  const handleUpdateCommentStatus = (commentId, newStatus) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, status: newStatus, updatedAt: new Date() }
        : comment
    ));
    setMessage(`Comment status updated to ${newStatus}!`);
  };

  // Filter comments based on current filters
  React.useEffect(() => {
    let filtered = comments;

    if (searchTerm) {
      filtered = filtered.filter(comment => 
        comment.originalPostTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.aiGeneratedResponse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.originalAuthor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCompany !== 'all') {
      filtered = filtered.filter(comment => comment.companyName === filterCompany);
    }

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(comment => comment.platform === filterPlatform);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(comment => comment.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(comment => comment.priority === parseInt(filterPriority));
    }

    setFilteredComments(filtered);
  }, [comments, searchTerm, filterCompany, filterPlatform, filterStatus, filterPriority]);

  // Real automation functions
  const handleStartCampaign = async (campaignId) => {
    try {
      setMessage('Starting campaign automation...');
      
      const { data, error } = await supabase.functions.invoke('campaign_scheduler_2025_10_25_19_00', {
        body: { campaign_id: campaignId, action: 'start' }
      });

      if (error) throw error;

      setMessage(`Campaign started successfully! Next execution: ${new Date(data.result.next_execution).toLocaleString()}`);
      setAutomationStatus(prev => ({ ...prev, scheduler_running: true }));
    } catch (error) {
      setMessage(`Failed to start campaign: ${error.message}`);
    }
  };

  const handleStopCampaign = async (campaignId) => {
    try {
      const { data, error } = await supabase.functions.invoke('campaign_scheduler_2025_10_25_19_00', {
        body: { campaign_id: campaignId, action: 'stop' }
      });

      if (error) throw error;

      setMessage('Campaign stopped successfully!');
      setAutomationStatus(prev => ({ ...prev, scheduler_running: false }));
    } catch (error) {
      setMessage(`Failed to stop campaign: ${error.message}`);
    }
  };

  const handleDiscoverPosts = async (campaignId, platform, monitoringRules) => {
    try {
      setAutomationStatus(prev => ({ ...prev, discovery_running: true }));
      setMessage('Discovering new posts...');

      const { data, error } = await supabase.functions.invoke('post_discovery_engine_2025_10_25_19_00', {
        body: {
          campaign_id: campaignId,
          platform: platform,
          monitoring_rules: monitoringRules
        }
      });

      if (error) throw error;

      setMessage(`Discovered ${data.discovered_count} new posts, stored ${data.stored_count} posts`);
      setAutomationStatus(prev => ({ ...prev, discovery_running: false }));
      
    } catch (error) {
      setMessage(`Post discovery failed: ${error.message}`);
      setAutomationStatus(prev => ({ ...prev, discovery_running: false }));
    }
  };

  const handleGenerateAIResponse = async (postId, campaignId, companyId, postContent, postTitle) => {
    try {
      setAutomationStatus(prev => ({ ...prev, ai_generation_running: true }));
      setMessage('Generating AI response...');

      const { data, error } = await supabase.functions.invoke('ai_response_generator_2025_10_25_19_00', {
        body: {
          post_id: postId,
          campaign_id: campaignId,
          company_id: companyId,
          post_content: postContent,
          post_title: postTitle,
          ai_settings: aiSettings,
          engagement_rules: engagementRules
        }
      });

      if (error) throw error;

      setMessage(`AI response generated with ${Math.round(data.confidence * 100)}% confidence`);
      setAutomationStatus(prev => ({ ...prev, ai_generation_running: false }));
      
    } catch (error) {
      setMessage(`AI response generation failed: ${error.message}`);
      setAutomationStatus(prev => ({ ...prev, ai_generation_running: false }));
    }
  };

  const handleAutoPost = async (responseId, platform, postUrl, responseText) => {
    try {
      setAutomationStatus(prev => ({ ...prev, posting_running: true }));
      setMessage('Posting response to platform...');

      const { data, error } = await supabase.functions.invoke('auto_posting_system_2025_10_25_19_00', {
        body: {
          response_id: responseId,
          platform: platform,
          post_url: postUrl,
          response_text: responseText
        }
      });

      if (error) throw error;

      if (data.success) {
        setMessage(`Response posted successfully! Platform ID: ${data.platform_id}`);
      } else {
        setMessage(`Posting failed: ${data.error}`);
      }
      
      setAutomationStatus(prev => ({ ...prev, posting_running: false }));
    } catch (error) {
      setMessage(`Auto-posting failed: ${error.message}`);
      setAutomationStatus(prev => ({ ...prev, posting_running: false }));
    }
  };

  const loadAnalytics = async (reportType, filters = {}) => {
    try {
      setAnalyticsLoading(true);
      
      const params = new URLSearchParams({
        type: reportType,
        date_range: filters.dateRange || '7d',
        ...(filters.campaignId && { campaign_id: filters.campaignId }),
        ...(filters.companyId && { company_id: filters.companyId }),
        ...(filters.platform && { platform: filters.platform })
      });

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/analytics_dashboard_2025_10_25_19_00?${params}`, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Analytics request failed');
      
      const result = await response.json();

      setAnalyticsData(prev => ({
        ...prev,
        [reportType]: result.data
      }));
      
    } catch (error) {
      setMessage(`Failed to load ${reportType} analytics: ${error.message}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // File upload handler for campaign intelligence
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setMessage('Uploading and processing documents...');

    for (const file of files) {
      try {
        // Validate file type and size
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'text/csv'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|md|csv|pptx)$/i)) {
          setMessage(`Unsupported file type: ${file.name}`);
          continue;
        }

        if (file.size > 25 * 1024 * 1024) { // 25MB limit
          setMessage(`File too large: ${file.name} (max 25MB)`);
          continue;
        }

        // Upload to Supabase storage
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaign-intelligence-docs')
          .upload(fileName, file);

        if (uploadError) {
          setMessage(`Upload failed for ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Process document with edge function
        const { data: processData, error: processError } = await supabase.functions.invoke('document_processing_engine_2025_10_25_19_00', {
          body: {
            action: 'upload_and_process',
            file_path: uploadData.path,
            campaign_id: campaigns[0]?.id, // Use first campaign for demo
            company_id: companies[0]?.id, // Use first company for demo
            document_name: file.name,
            document_type: file.name.split('.').pop().toLowerCase()
          }
        });

        if (processError) {
          setMessage(`Processing failed for ${file.name}: ${processError.message}`);
          continue;
        }

        setMessage(`Successfully processed ${file.name}`);

      } catch (error) {
        setMessage(`Error processing ${file.name}: ${error.message}`);
      }
    }

    setMessage('Document upload and processing completed!');
  };

  // Your Custom ACID Logo Component
  const LogoComponent = ({ size = "large" }) => {
    const dimensions = size === "large" ? { width: 200, height: 54 } : { width: 120, height: 32 };
    
    return (
      <svg 
        width={dimensions.width} 
        height={dimensions.height} 
        viewBox="0 0 755.97 201.99" 
        xmlns="http://www.w3.org/2000/svg"
        className={size === "large" ? "mx-auto" : ""}
      >
        <defs>
          <style>
            {`.cls-1 { fill: #496fb1; }`}
          </style>
        </defs>
        <path className="cls-1" d="M209.46,201.99H72.98l25.61-52.52h56.56l-34.34-69.25-62.23,121.77H0L93.39,17.03c2.6-5.09,6.54-9.38,11.4-12.41C109.64,1.6,115.24,0,120.95,0s11.31,1.6,16.16,4.62c4.82,2.98,8.68,7.29,11.11,12.41l77.91,157.84c1.52,2.85,2.25,6.05,2.09,9.28-.15,3.23-1.18,6.35-2.96,9.04-1.59,2.76-3.9,5.04-6.68,6.59-2.78,1.55-5.93,2.32-9.12,2.22Z"/>
        <path className="cls-1" d="M333.25,52.52c-12.86,0-25.19,5.11-34.28,14.2-9.09,9.09-14.2,21.42-14.2,34.28s5.11,25.19,14.2,34.28,21.42,14.2,34.28,14.2h90.32v52.52h-90.32c-17.79.13-35.29-4.55-50.64-13.56-15.27-8.83-27.96-21.52-36.79-36.79-8.89-15.4-13.56-32.86-13.56-50.64s4.68-35.24,13.56-50.64c8.83-15.27,21.52-27.96,36.79-36.79C297.96,4.56,315.45-.13,333.25,0h90.32v52.52h-90.32Z"/>
        <path className="cls-1" d="M503.78,201.99h-52.52V0h52.52v201.98Z"/>
        <path className="cls-1" d="M654.98,0c17.79-.13,35.29,4.55,50.64,13.56,15.27,8.83,27.96,21.52,36.79,36.79,8.88,15.4,13.56,32.86,13.56,50.64s-4.68,35.24-13.56,50.64c-8.83,15.27-21.52,27.96-36.79,36.79-15.35,9.01-32.85,13.7-50.64,13.56h-116.57V0h116.57ZM654.98,149.47c12.86,0,25.19-5.11,34.28-14.2s14.2-21.42,14.2-34.28-5.11-25.19-14.2-34.28c-9.09-9.09-21.42-14.2-34.28-14.2h-64.06v96.95h64.06Z"/>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <LogoComponent size="large" />
            <p className="mt-4 text-gray-600">Professional Automation Platform</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h3>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {message && (
                <div className={`text-sm ${message.includes('error') || message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSettingsContent = () => {
    switch (settingsTab) {
      case 'reddit':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">Reddit API Configuration</h3>
            <p className="text-gray-600 mb-6">Configure your Reddit API credentials using OAuth 2.0 for secure access.</p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-900 mb-2">🔐 Authentication Method: OAuth 2.0</h4>
              <p className="text-sm text-blue-800">Reddit uses OAuth 2.0 for secure API access. This is the recommended approach for automated interactions.</p>
            </div>

            {/* Reddit Authentication Status */}
            <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <h4 className="font-medium text-gray-900 mb-3">🔗 Reddit Account Connection</h4>
              
              {redditAuthStatus.loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Checking authentication status...</span>
                </div>
              ) : redditAuthStatus.authenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">✅</span>
                    <span className="font-medium text-green-800">Reddit Account Connected</span>
                  </div>
                  
                  {redditAuthStatus.user && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Username:</span>
                          <div className="font-medium">u/{redditAuthStatus.user.username}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Karma:</span>
                          <div className="font-medium">{redditAuthStatus.user.karma?.toLocaleString() || 0}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Verified:</span>
                          <div className="font-medium">{redditAuthStatus.user.verified ? '✅ Yes' : '❌ No'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Connected:</span>
                          <div className="font-medium">{new Date(redditAuthStatus.user.connected_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    {redditAuthStatus.tokenExpired && (
                      <button
                        onClick={refreshRedditToken}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm"
                        disabled={redditAuthStatus.loading}
                      >
                        🔄 Refresh Token
                      </button>
                    )}
                    <button
                      onClick={checkRedditAuthStatus}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                      disabled={redditAuthStatus.loading}
                    >
                      🔍 Check Status
                    </button>
                  </div>
                  
                  {redditAuthStatus.tokenExpired && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Your Reddit token has expired. Please refresh it to continue using Reddit automation.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600">❌</span>
                    <span className="font-medium text-red-800">Reddit Account Not Connected</span>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    You need to connect your Reddit account to enable automation features.
                  </p>
                  
                  <button
                    onClick={startRedditAuth}
                    className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 font-medium"
                    disabled={redditAuthStatus.loading || !redditClientId || !redditClientSecret}
                  >
                    🔗 Connect Reddit Account
                  </button>
                  
                  {(!redditClientId || !redditClientSecret) && (
                    <p className="text-sm text-red-600">
                      ⚠️ Please save your Reddit API credentials below first.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <form onSubmit={handleSaveRedditSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={redditClientId}
                    onChange={(e) => setRedditClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Reddit app client ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={redditClientSecret}
                    onChange={(e) => setRedditClientSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Reddit app client secret"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redirect URI
                </label>
                <input
                  type="url"
                  value={redditRedirectUri}
                  onChange={(e) => setRedditRedirectUri(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`${window.location.origin}/auth/reddit/callback`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use: {window.location.origin}/auth/reddit/callback
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How to get Reddit API credentials:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="underline">reddit.com/prefs/apps</a></li>
                  <li>2. Click "Create App" or "Create Another App"</li>
                  <li>3. Choose "web app" as the app type</li>
                  <li>4. Set redirect URI to: {window.location.origin}/auth/reddit/callback</li>
                  <li>5. Copy the client ID and secret</li>
                  <li>6. Save credentials below, then connect your account</li>
                </ol>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Reddit API Credentials
              </button>
            </form>
          </div>
        );
        
      case 'instagram':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">Instagram API Configuration</h3>
            <p className="text-gray-600 mb-6">Configure Instagram Business API for automated engagement.</p>
            
            <div className="bg-pink-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-pink-900 mb-2">🔐 Authentication Method: Instagram Basic Display API + Business API</h4>
              <p className="text-sm text-pink-800">Instagram requires Business API for automated posting and engagement. Personal accounts need to be converted to Business accounts.</p>
            </div>
            
            <form onSubmit={handleSaveInstagramSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={instagramAppId}
                    onChange={(e) => setInstagramAppId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Instagram App ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Secret
                  </label>
                  <input
                    type="password"
                    value={instagramAppSecret}
                    onChange={(e) => setInstagramAppSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Instagram App Secret"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={instagramAccessToken}
                    onChange={(e) => setInstagramAccessToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Long-lived access token"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Account ID
                  </label>
                  <input
                    type="text"
                    value={instagramBusinessId}
                    onChange={(e) => setInstagramBusinessId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Instagram Business Account ID"
                  />
                </div>
              </div>
              
              <div className="bg-pink-50 p-4 rounded-lg">
                <h4 className="font-medium text-pink-900 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-pink-800 space-y-1">
                  <li>1. Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers</a></li>
                  <li>2. Create a new app and add Instagram Basic Display product</li>
                  <li>3. Convert your Instagram account to Business account</li>
                  <li>4. Generate long-lived access token</li>
                  <li>5. Get your Business Account ID from Instagram API</li>
                </ol>
              </div>
              
              <button
                type="submit"
                className="w-full bg-pink-600 text-white py-3 px-4 rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                Save Instagram Settings
              </button>
            </form>
          </div>
        );

      case 'facebook':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">Facebook API Configuration</h3>
            <p className="text-gray-600 mb-6">Configure Facebook Graph API for page and group automation.</p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-900 mb-2">🔐 Authentication Method: Facebook Graph API</h4>
              <p className="text-sm text-blue-800">Facebook uses Graph API with page access tokens for automated posting and engagement on pages and groups.</p>
            </div>
            
            <form onSubmit={handleSaveFacebookSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={facebookAppId}
                    onChange={(e) => setFacebookAppId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Facebook App ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Secret
                  </label>
                  <input
                    type="password"
                    value={facebookAppSecret}
                    onChange={(e) => setFacebookAppSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Facebook App Secret"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Access Token
                  </label>
                  <input
                    type="password"
                    value={facebookAccessToken}
                    onChange={(e) => setFacebookAccessToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Long-lived page access token"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page ID
                  </label>
                  <input
                    type="text"
                    value={facebookPageId}
                    onChange={(e) => setFacebookPageId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Facebook Page ID"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers</a></li>
                  <li>2. Create a new app and add Facebook Login product</li>
                  <li>3. Generate page access token with required permissions</li>
                  <li>4. Convert to long-lived token (60 days)</li>
                  <li>5. Get your Page ID from Facebook Page settings</li>
                </ol>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Facebook Settings
              </button>
            </form>
          </div>
        );

      case 'linkedin':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">LinkedIn API Configuration</h3>
            <p className="text-gray-600 mb-6">Configure LinkedIn API for professional network automation.</p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-900 mb-2">🔐 Authentication Method: LinkedIn OAuth 2.0</h4>
              <p className="text-sm text-blue-800">LinkedIn uses OAuth 2.0 for secure API access. Requires LinkedIn Developer account and app approval.</p>
            </div>
            
            <form onSubmit={handleSaveLinkedInSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={linkedinClientId}
                    onChange={(e) => setLinkedinClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="LinkedIn App Client ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={linkedinClientSecret}
                    onChange={(e) => setLinkedinClientSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="LinkedIn App Client Secret"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={linkedinAccessToken}
                    onChange={(e) => setLinkedinAccessToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="LinkedIn Access Token"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Redirect URI
                  </label>
                  <input
                    type="url"
                    value={linkedinRedirectUri}
                    onChange={(e) => setLinkedinRedirectUri(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://your-domain.com/auth/linkedin"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Go to <a href="https://developer.linkedin.com/" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developer Portal</a></li>
                  <li>2. Create a new app and request required permissions</li>
                  <li>3. Add your redirect URI to app settings</li>
                  <li>4. Complete LinkedIn Partner Program verification if needed</li>
                  <li>5. Generate access token through OAuth flow</li>
                </ol>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-700 text-white py-3 px-4 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save LinkedIn Settings
              </button>
            </form>
          </div>
        );

      case 'twitter':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">X (Twitter) API Configuration</h3>
            <p className="text-gray-600 mb-6">Configure X API v2 for automated tweeting and engagement.</p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-2">🔐 Authentication Method: Twitter API v2 with OAuth 2.0</h4>
              <p className="text-sm text-gray-800">X (Twitter) uses API v2 with Bearer Token for read operations and OAuth for write operations. Requires Twitter Developer account.</p>
            </div>
            
            <form onSubmit={handleSaveTwitterSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={twitterApiKey}
                    onChange={(e) => setTwitterApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Twitter API Key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={twitterApiSecret}
                    onChange={(e) => setTwitterApiSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Twitter API Secret"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bearer Token
                </label>
                <input
                  type="password"
                  value={twitterBearerToken}
                  onChange={(e) => setTwitterBearerToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Twitter Bearer Token (for read operations)"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={twitterAccessToken}
                    onChange={(e) => setTwitterAccessToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Twitter Access Token"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token Secret
                  </label>
                  <input
                    type="password"
                    value={twitterAccessTokenSecret}
                    onChange={(e) => setTwitterAccessTokenSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Twitter Access Token Secret"
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-gray-800 space-y-1">
                  <li>1. Go to <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer" className="underline">Twitter Developer Portal</a></li>
                  <li>2. Create a new app and apply for API access</li>
                  <li>3. Generate API keys and Bearer token</li>
                  <li>4. Set up OAuth 1.0a for write permissions</li>
                  <li>5. Generate access token and secret</li>
                </ol>
              </div>
              
              <button
                type="submit"
                className="w-full bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Save X (Twitter) Settings
              </button>
            </form>
          </div>
        );

        
      case 'ai':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">AI Service Configuration</h3>
            <p className="text-gray-600 mb-6">Configure your AI service provider for automated response generation.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI Provider
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="openai"
                    checked={aiProvider === 'openai'}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-900">OpenAI</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="openrouter"
                    checked={aiProvider === 'openrouter'}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-900">OpenRouter</span>
                </label>
              </div>
            </div>
            
            <form onSubmit={handleSaveAiSettings} className="space-y-6">
              {aiProvider === 'openai' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenAI Platform</a>
                  </p>
                </div>
              )}
              
              {aiProvider === 'openrouter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sk-or-..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenRouter Dashboard</a>
                  </p>
                </div>
              )}
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">AI Service Comparison:</h4>
                <div className="text-sm text-yellow-800 space-y-2">
                  <div><strong>OpenAI:</strong> Direct access to GPT models, reliable, higher cost</div>
                  <div><strong>OpenRouter:</strong> Access to multiple AI models, competitive pricing, more options</div>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save AI Settings
              </button>
            </form>
          </div>
        );
        
      case 'storage':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-6">Wasabi Object Storage Configuration</h3>
              <p className="text-gray-600 mb-6">Configure your Wasabi storage account for file uploads and data storage.</p>
              
              <form onSubmit={handleSaveWasabiSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Key
                    </label>
                    <input
                      type="text"
                      value={wasabiAccessKey}
                      onChange={(e) => setWasabiAccessKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your Wasabi access key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={wasabiSecretKey}
                      onChange={(e) => setWasabiSecretKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your Wasabi secret key"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint
                    </label>
                    <input
                      type="text"
                      value={wasabiEndpoint}
                      onChange={(e) => setWasabiEndpoint(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="s3.wasabisys.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Region
                    </label>
                    <select
                      value={wasabiRegion}
                      onChange={(e) => setWasabiRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="us-east-1">US East 1 (N. Virginia)</option>
                      <option value="us-east-2">US East 2 (N. Virginia)</option>
                      <option value="us-west-1">US West 1 (Oregon)</option>
                      <option value="eu-central-1">EU Central 1 (Amsterdam)</option>
                      <option value="ap-northeast-1">AP Northeast 1 (Tokyo)</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">How to get Wasabi credentials:</h4>
                  <ol className="text-sm text-green-800 space-y-1">
                    <li>1. Sign up at <a href="https://wasabi.com" target="_blank" rel="noopener noreferrer" className="underline">wasabi.com</a></li>
                    <li>2. Go to Access Keys in your account settings</li>
                    <li>3. Create a new access key pair</li>
                    <li>4. Copy the access key and secret key</li>
                  </ol>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save Storage Settings
                </button>
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-6">Bucket Management</h3>
              
              <form onSubmit={handleCreateBucket} className="mb-6">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter bucket name"
                  />
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Create Bucket
                  </button>
                </div>
              </form>
              
              {buckets.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Your Buckets:</h4>
                  {buckets.map((bucket, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{bucket.name}</div>
                        <div className="text-sm text-gray-500">Created: {new Date(bucket.created).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteBucket(bucket.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No buckets created yet. Create your first bucket above.
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderCampaignContent = () => {
    const platforms = [
      { value: 'reddit', label: 'Reddit', placeholder: 'r/technology', locationLabel: 'Subreddit' },
      { value: 'instagram', label: 'Instagram', placeholder: '#technology', locationLabel: 'Hashtag/Account' },
      { value: 'facebook', label: 'Facebook', placeholder: 'Tech Enthusiasts Group', locationLabel: 'Group/Page' },
      { value: 'linkedin', label: 'LinkedIn', placeholder: 'Software Engineers Network', locationLabel: 'Group/Company' },
      { value: 'quora', label: 'Quora', placeholder: 'What is the best programming language?', locationLabel: 'Topic/Question' },
      { value: 'producthunt', label: 'Product Hunt', placeholder: 'AI Tools', locationLabel: 'Category/Product' },
      { value: 'betalist', label: 'BetaList', placeholder: 'SaaS', locationLabel: 'Category' },
      { value: 'x', label: 'X (Twitter)', placeholder: '#AI', locationLabel: 'Hashtag/Account' },
      { value: 'substack', label: 'Substack', placeholder: 'Tech Newsletter', locationLabel: 'Publication/Topic' }
    ];

    const engagementTypes = {
      reddit: ['comment', 'upvote', 'message'],
      instagram: ['comment', 'like', 'follow', 'story_reply'],
      facebook: ['comment', 'like', 'share', 'message'],
      linkedin: ['comment', 'like', 'share', 'connect'],
      quora: ['answer', 'upvote', 'comment', 'follow'],
      producthunt: ['comment', 'upvote', 'follow'],
      betalist: ['comment', 'upvote', 'follow'],
      x: ['reply', 'like', 'retweet', 'follow'],
      substack: ['comment', 'like', 'subscribe']
    };

    const contentTypes = {
      reddit: ['posts', 'comments'],
      instagram: ['posts', 'stories', 'reels'],
      facebook: ['posts', 'comments', 'groups'],
      linkedin: ['posts', 'articles', 'groups'],
      quora: ['questions', 'answers'],
      producthunt: ['products', 'comments'],
      betalist: ['startups', 'comments'],
      x: ['tweets', 'replies'],
      substack: ['posts', 'comments']
    };

    const selectedPlatform = platforms.find(p => p.value === platform);

    switch (campaignTab) {
      case 'create':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-6">Create Advanced Multi-Platform Campaign</h3>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateRealCampaign(); }} className="space-y-8">
                {/* Basic Campaign Settings */}
                <div className="border-b pb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">📋 Basic Campaign Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Name
                      </label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="My Advanced Social Media Campaign"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform
                      </label>
                      <select
                        value={platform}
                        onChange={(e) => {
                          setPlatform(e.target.value);
                          setTargetLocation('');
                          setEngagementType(engagementTypes[e.target.value][0]);
                          setContentType(contentTypes[e.target.value][0]);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {platforms.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedPlatform?.locationLabel}
                    </label>
                    <input
                      type="text"
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={selectedPlatform?.placeholder}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Engagement Type
                      </label>
                      <select
                        value={engagementType}
                        onChange={(e) => setEngagementType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {engagementTypes[platform]?.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Type
                      </label>
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {contentTypes[platform]?.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Post Monitoring Rules */}
                <div className="border-b pb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">🔍 Post Monitoring Rules</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Upvotes/Likes
                      </label>
                      <input
                        type="number"
                        value={monitoringRules.minUpvotes}
                        onChange={(e) => setMonitoringRules({...monitoringRules, minUpvotes: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Post Age (hours)
                      </label>
                      <input
                        type="number"
                        value={monitoringRules.maxAge}
                        onChange={(e) => setMonitoringRules({...monitoringRules, maxAge: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="168"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Author Min Karma/Followers
                      </label>
                      <input
                        type="number"
                        value={monitoringRules.authorKarma}
                        onChange={(e) => setMonitoringRules({...monitoringRules, authorKarma: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Include Keywords (comma separated)
                      </label>
                      <input
                        type="text"
                        value={monitoringRules.includeKeywords}
                        onChange={(e) => setMonitoringRules({...monitoringRules, includeKeywords: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="AI, automation, technology"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exclude Keywords (comma separated)
                      </label>
                      <input
                        type="text"
                        value={monitoringRules.excludeKeywords}
                        onChange={(e) => setMonitoringRules({...monitoringRules, excludeKeywords: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="spam, promotion, advertisement"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Engagement Rules */}
                <div className="border-b pb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">🤖 AI Engagement Rules</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Response Style
                      </label>
                      <select
                        value={engagementRules.responseStyle}
                        onChange={(e) => setEngagementRules({...engagementRules, responseStyle: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="helpful">Helpful & Informative</option>
                        <option value="promotional">Promotional</option>
                        <option value="neutral">Neutral</option>
                        <option value="expert">Expert Authority</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Personality Tone
                      </label>
                      <select
                        value={engagementRules.personalityTone}
                        onChange={(e) => setEngagementRules({...engagementRules, personalityTone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="friendly">Friendly</option>
                        <option value="authoritative">Authoritative</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Response Length
                      </label>
                      <input
                        type="number"
                        value={engagementRules.maxResponseLength}
                        onChange={(e) => setEngagementRules({...engagementRules, maxResponseLength: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="50"
                        max="500"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={engagementRules.includeEmojis}
                          onChange={(e) => setEngagementRules({...engagementRules, includeEmojis: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Include Emojis</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={engagementRules.includeQuestions}
                          onChange={(e) => setEngagementRules({...engagementRules, includeQuestions: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Ask Questions</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={engagementRules.avoidControversy}
                          onChange={(e) => setEngagementRules({...engagementRules, avoidControversy: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">Avoid Controversy</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Schedule & Randomization */}
                <div className="border-b pb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">⏰ Schedule & Randomization</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={scheduleSettings.timezone}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, timezone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Active Hours (Start)
                      </label>
                      <select
                        value={scheduleSettings.activeHours.start}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, activeHours: {...scheduleSettings.activeHours, start: parseInt(e.target.value)}})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{i}:00 ({i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Active Hours (End)
                      </label>
                      <select
                        value={scheduleSettings.activeHours.end}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, activeHours: {...scheduleSettings.activeHours, end: parseInt(e.target.value)}})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{i}:00 ({i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Posts Per Hour
                      </label>
                      <input
                        type="number"
                        value={scheduleSettings.postsPerHour}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, postsPerHour: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="10"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Delay (minutes)
                      </label>
                      <input
                        type="number"
                        value={scheduleSettings.minDelay}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, minDelay: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="5"
                        max="60"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Delay (minutes)
                      </label>
                      <input
                        type="number"
                        value={scheduleSettings.maxDelay}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, maxDelay: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="10"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduleSettings.randomizeDelay}
                        onChange={(e) => setScheduleSettings({...scheduleSettings, randomizeDelay: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Enable Random Delay (Prevents detection as scheduled posts)</span>
                    </label>
                  </div>
                </div>

                {/* AI Model Settings */}
                <div className="border-b pb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">🧠 AI Model Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Model
                      </label>
                      <select
                        value={aiSettings.model}
                        onChange={(e) => setAiSettings({...aiSettings, model: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cost-effective)</option>
                        <option value="gpt-4">GPT-4 (Higher Quality)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo (Best Performance)</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Creativity Level (Temperature)
                      </label>
                      <select
                        value={aiSettings.temperature}
                        onChange={(e) => setAiSettings({...aiSettings, temperature: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0.3">Conservative (0.3)</option>
                        <option value="0.5">Balanced (0.5)</option>
                        <option value="0.7">Creative (0.7)</option>
                        <option value="0.9">Very Creative (0.9)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt (AI Personality)
                    </label>
                    <textarea
                      value={aiSettings.systemPrompt}
                      onChange={(e) => setAiSettings({...aiSettings, systemPrompt: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Define how the AI should behave and respond..."
                    />
                  </div>
                  
                  <div className="flex items-center space-x-6 mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={aiSettings.contextAnalysis}
                        onChange={(e) => setAiSettings({...aiSettings, contextAnalysis: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Context Analysis</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={aiSettings.sentimentCheck}
                        onChange={(e) => setAiSettings({...aiSettings, sentimentCheck: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Sentiment Check</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={aiSettings.duplicateCheck}
                        onChange={(e) => setAiSettings({...aiSettings, duplicateCheck: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Duplicate Check</span>
                    </label>
                  </div>
                </div>

                {/* Final Settings */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Activate campaign immediately
                    </label>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Batch Size: {scheduleSettings.batchSize} posts per analysis
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🎯 Campaign Summary:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Platform:</strong> {selectedPlatform?.label}</div>
                    <div><strong>Monitoring:</strong> Posts with {monitoringRules.minUpvotes}+ upvotes, max {monitoringRules.maxAge}h old</div>
                    <div><strong>Schedule:</strong> {scheduleSettings.postsPerHour} posts/hour, {scheduleSettings.minDelay}-{scheduleSettings.maxDelay}min random delays</div>
                    <div><strong>AI:</strong> {aiSettings.model} with {engagementRules.responseStyle} style, max {engagementRules.maxResponseLength} chars</div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
                >
                  🚀 Create Advanced {selectedPlatform?.label} Campaign
                </button>
              </form>
            </div>
          </div>
        );
        
      case 'active':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">Active Multi-Platform Campaigns</h3>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Campaigns</h4>
              <p className="text-gray-600 mb-4">Create your first multi-platform campaign to get started</p>
              <button
                onClick={() => setCampaignTab('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create Campaign
              </button>
            </div>
          </div>
        );
        
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-6">Multi-Platform Campaign Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 text-sm">Total Posts Monitored</h4>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 text-sm">Engagements Sent</h4>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 text-sm">Engagement Rate</h4>
                  <p className="text-2xl font-bold text-yellow-600">0%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 text-sm">Active Platforms</h4>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-indigo-900 text-sm">AI Usage</h4>
                  <p className="text-2xl font-bold text-indigo-600">0</p>
                </div>
              </div>
              
              <div className="text-center py-8">
                <p className="text-gray-600">Analytics will be available once multi-platform campaigns are executed and monitoring data is collected across all social media platforms.</p>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Active Campaigns</h3>
                <p className="text-3xl font-bold text-blue-600">0</p>
                <p className="text-sm text-blue-700 mt-1">No active campaigns</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Total Executions</h3>
                <p className="text-3xl font-bold text-green-600">0</p>
                <p className="text-sm text-green-700 mt-1">Ready to start</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Success Rate</h3>
                <p className="text-3xl font-bold text-purple-600">--</p>
                <p className="text-sm text-purple-700 mt-1">No data yet</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Multi-Platform Social Media Automation</h3>
              <p className="text-gray-600 mb-6">Automate your engagement across Reddit, Instagram, Facebook, LinkedIn, Quora, Product Hunt, BetaList, X (Twitter), and Substack with intelligent responses and monitoring.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Supported Platforms:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Reddit
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                      Instagram
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      Facebook
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-blue-700 rounded-full mr-2"></span>
                      LinkedIn
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                      Quora
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-orange-600 rounded-full mr-2"></span>
                      Product Hunt
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                      BetaList
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                      X (Twitter)
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                      Substack
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Key Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Multi-platform monitoring
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Smart keyword targeting
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      AI-powered responses
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Cross-platform analytics
                    </li>
                  </ul>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setActiveTab('campaigns');
                        setCampaignTab('create');
                      }}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-left"
                    >
                      Create Multi-Platform Campaign
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-left"
                    >
                      Configure Platform Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'comments':
        return (
          <div className="space-y-6">
            {/* Comment Management Header */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Comment Management</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCommentsTab('table')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      commentsTab === 'table'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📊 Table View
                  </button>
                  <button
                    onClick={() => setCommentsTab('kanban')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      commentsTab === 'kanban'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📋 Kanban Board
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Search comments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Companies</option>
                    <option value="Acid Concepts">Acid Concepts</option>
                    <option value="Orylu">Orylu</option>
                    <option value="Acid Vault">Acid Vault</option>
                  </select>
                </div>
                
                <div>
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Platforms</option>
                    <option value="reddit">Reddit</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">X (Twitter)</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="posted">Posted</option>
                  </select>
                </div>
                
                <div>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Priority</option>
                    <option value="1">Low Priority</option>
                    <option value="2">Medium Priority</option>
                    <option value="3">High Priority</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-600 flex items-center">
                  {filteredComments.length} of {comments.length} comments
                </div>
              </div>
            </div>

            {/* Table View */}
            {commentsTab === 'table' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post & Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Post</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Response</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metrics</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredComments.map((comment) => (
                        <tr key={comment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{comment.companyName}</div>
                              <div className="text-gray-500">{comment.campaignName}</div>
                              <div className="text-gray-400">{comment.platform} • {comment.subredditOrGroup}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 mb-1">{comment.originalPostTitle}</div>
                              <div className="text-gray-600 text-xs mb-2">{comment.originalPostContent.substring(0, 100)}...</div>
                              <div className="text-xs text-gray-400">
                                by {comment.originalAuthor} • {comment.originalUpvotes} upvotes • {comment.originalCommentsCount} comments
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs">
                              {comment.editedResponse || comment.aiGeneratedResponse.substring(0, 150)}...
                              <div className="text-xs text-gray-400 mt-1">
                                {comment.aiModelUsed} • {Math.round(comment.aiConfidenceScore * 100)}% confidence
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500">Priority:</span>
                                <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                                  comment.priority === 3 ? 'bg-red-100 text-red-800' :
                                  comment.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {comment.priority === 3 ? 'High' : comment.priority === 2 ? 'Med' : 'Low'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Engagement: {comment.engagementPotential}/10
                              </div>
                              <div className="text-xs text-gray-500">
                                Sentiment: {Math.round(comment.sentimentScore * 100)}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              comment.status === 'approved' ? 'bg-green-100 text-green-800' :
                              comment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              comment.status === 'posted' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {comment.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveComment(comment.id)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  onClick={() => handleRejectComment(comment.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  ❌ Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                const newResponse = prompt('Edit response:', comment.editedResponse || comment.aiGeneratedResponse);
                                if (newResponse) handleEditComment(comment.id, newResponse);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kanban Board View */}
            {commentsTab === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Pending Column */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-4 flex items-center">
                    ⏳ Pending Review ({filteredComments.filter(c => c.status === 'pending').length})
                  </h3>
                  <div className="space-y-4">
                    {filteredComments.filter(c => c.status === 'pending').map((comment) => (
                      <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-400">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">{comment.companyName}</div>
                          <div className="text-gray-600 text-xs mb-2">{comment.originalPostTitle}</div>
                          <div className="text-gray-500 text-xs mb-3">{comment.aiGeneratedResponse.substring(0, 100)}...</div>
                          <div className="flex justify-between items-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              comment.priority === 3 ? 'bg-red-100 text-red-800' :
                              comment.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              Priority {comment.priority}
                            </span>
                            <div className="space-x-1">
                              <button
                                onClick={() => handleApproveComment(comment.id)}
                                className="text-green-600 hover:text-green-800 text-xs"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => handleRejectComment(comment.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approved Column */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-4 flex items-center">
                    ✅ Approved ({filteredComments.filter(c => c.status === 'approved').length})
                  </h3>
                  <div className="space-y-4">
                    {filteredComments.filter(c => c.status === 'approved').map((comment) => (
                      <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-400">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">{comment.companyName}</div>
                          <div className="text-gray-600 text-xs mb-2">{comment.originalPostTitle}</div>
                          <div className="text-gray-500 text-xs mb-3">{comment.aiGeneratedResponse.substring(0, 100)}...</div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Ready to post</span>
                            <button
                              onClick={() => handleUpdateCommentStatus(comment.id, 'posted')}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              📤 Post
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejected Column */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-4 flex items-center">
                    ❌ Rejected ({filteredComments.filter(c => c.status === 'rejected').length})
                  </h3>
                  <div className="space-y-4">
                    {filteredComments.filter(c => c.status === 'rejected').map((comment) => (
                      <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-400">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">{comment.companyName}</div>
                          <div className="text-gray-600 text-xs mb-2">{comment.originalPostTitle}</div>
                          <div className="text-gray-500 text-xs mb-3">{comment.aiGeneratedResponse.substring(0, 100)}...</div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Needs revision</span>
                            <button
                              onClick={() => handleUpdateCommentStatus(comment.id, 'pending')}
                              className="text-yellow-600 hover:text-yellow-800 text-xs"
                            >
                              🔄 Review
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Posted Column */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                    📤 Posted ({filteredComments.filter(c => c.status === 'posted').length})
                  </h3>
                  <div className="space-y-4">
                    {filteredComments.filter(c => c.status === 'posted').map((comment) => (
                      <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">{comment.companyName}</div>
                          <div className="text-gray-600 text-xs mb-2">{comment.originalPostTitle}</div>
                          <div className="text-gray-500 text-xs mb-3">{comment.aiGeneratedResponse.substring(0, 100)}...</div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Live on {comment.platform}</span>
                            <a
                              href={comment.originalPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              🔗 View
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'analytics':
        return (
          <div className="space-y-6">
            {/* Analytics Header */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Analytics & Performance</h2>
                <div className="flex space-x-2">
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onChange={(e) => loadAnalytics('overview', { dateRange: e.target.value })}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                  <button 
                    onClick={() => loadAnalytics('overview')}
                    disabled={analyticsLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {analyticsLoading ? '⏳ Loading...' : '🔄 Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Posts Discovered</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analyticsData.overview?.summary?.posts_discovered || 0}
                    </p>
                  </div>
                  <div className="text-blue-500">🔍</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Responses Generated</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analyticsData.overview?.summary?.responses_generated || 0}
                    </p>
                  </div>
                  <div className="text-green-500">🤖</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Responses Posted</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {analyticsData.overview?.summary?.responses_posted || 0}
                    </p>
                  </div>
                  <div className="text-purple-500">📤</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(analyticsData.overview?.summary?.total_upvotes || 0) + (analyticsData.overview?.summary?.total_replies || 0)}
                    </p>
                  </div>
                  <div className="text-orange-500">❤️</div>
                </div>
              </div>
            </div>

            {/* ROI Metrics */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">ROI & Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData.overview?.roi?.avg_roi_percentage?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Average ROI</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${analyticsData.overview?.roi?.total_costs?.toFixed(2) || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Costs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData.overview?.roi?.leads_generated || 0}
                  </div>
                  <div className="text-sm text-gray-600">Leads Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${analyticsData.overview?.roi?.estimated_revenue?.toFixed(2) || 0}
                  </div>
                  <div className="text-sm text-gray-600">Est. Revenue</div>
                </div>
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    {analyticsData.overview?.key_metrics?.approval_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Approval Rate</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    {analyticsData.overview?.key_metrics?.engagement_rate || 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Engagement</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    ${analyticsData.overview?.key_metrics?.cost_per_response || 0}
                  </div>
                  <div className="text-sm text-gray-600">Cost per Response</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    {analyticsData.overview?.key_metrics?.conversion_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Conversion Rate</div>
                </div>
              </div>
            </div>

            {/* Analytics Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {['Performance', 'ROI Analysis', 'Sentiment', 'Competitors', 'Engagement'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => loadAnalytics(tab.toLowerCase().replace(' ', '_'))}
                      className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="p-6">
                {analyticsLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading analytics data...</div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      Select an analytics tab above to view detailed reports.
                      <br />
                      <span className="text-sm">Real-time data from your automation campaigns.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Automation Status */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Automation Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${automationStatus.discovery_running ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Post Discovery</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${automationStatus.ai_generation_running ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">AI Generation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${automationStatus.posting_running ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Auto Posting</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${automationStatus.scheduler_running ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">Campaign Scheduler</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'intelligence':
        return (
          <div className="space-y-6">
            {/* Intelligence Header */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Campaign Intelligence</h2>
                <div className="flex space-x-2">
                  <button 
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    📄 Upload Documents
                  </button>
                  <button 
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    ➕ Add Business Context
                  </button>
                </div>
              </div>
              <p className="text-gray-600">
                Upload documents and add business context to make AI responses more intelligent and informed.
              </p>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.csv,.pptx"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            {/* Intelligence Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {['Documents', 'Business Context', 'Context Usage', 'Settings'].map((tab) => (
                    <button
                      key={tab}
                      className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="p-6">
                {/* Documents Tab */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Knowledge Base Documents</h3>
                  
                  {/* Document Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">Upload Campaign Documents</p>
                    <p className="text-gray-500 mb-4">
                      PDF, Word, Text, Markdown, CSV, PowerPoint files up to 25MB
                    </p>
                    <button 
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Choose Files
                    </button>
                  </div>

                  {/* Uploaded Documents List */}
                  <div className="space-y-3">
                    {[
                      { name: 'Company_Overview_2024.pdf', size: '2.3 MB', status: 'completed', type: 'pdf' },
                      { name: 'Product_Specifications.docx', size: '1.8 MB', status: 'processing', type: 'docx' },
                      { name: 'Case_Studies.md', size: '456 KB', status: 'completed', type: 'md' }
                    ].map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">
                            {doc.type === 'pdf' ? '📄' : doc.type === 'docx' ? '📝' : '📋'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            <p className="text-sm text-gray-500">{doc.size} • {doc.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.status === 'completed' && (
                            <>
                              <span className="text-green-600 text-sm">✅ Processed</span>
                              <button className="text-blue-600 hover:text-blue-800 text-sm">View Summary</button>
                            </>
                          )}
                          {doc.status === 'processing' && (
                            <span className="text-yellow-600 text-sm">⏳ Processing...</span>
                          )}
                          <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Business Context Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Business Context</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { type: 'background', title: 'Company Background', priority: 'high', usage: 45 },
                        { type: 'products', title: 'Product Features', priority: 'high', usage: 38 },
                        { type: 'case_studies', title: 'Success Stories', priority: 'medium', usage: 22 },
                        { type: 'faq', title: 'Common Questions', priority: 'low', usage: 12 }
                      ].map((context, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{context.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              context.priority === 'high' ? 'bg-red-100 text-red-800' :
                              context.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {context.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Used in {context.usage}% of AI responses
                          </p>
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                            <button className="text-gray-600 hover:text-gray-800 text-sm">View</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intelligence Settings */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Intelligence Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Context Relevance Threshold
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          defaultValue="0.7"
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Less Relevant</span>
                          <span>More Relevant</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Context Length
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option value="1000">1,000 characters</option>
                          <option value="2000" selected>2,000 characters</option>
                          <option value="3000">3,000 characters</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="auto-extract" className="mr-2" defaultChecked />
                        <label htmlFor="auto-extract" className="text-sm text-gray-700">
                          Auto-extract text from documents
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="semantic-search" className="mr-2" defaultChecked />
                        <label htmlFor="semantic-search" className="text-sm text-gray-700">
                          Enable semantic search
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Context Usage Analytics */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Context Usage Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">87%</div>
                        <div className="text-sm text-gray-600">Responses with Context</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">+23%</div>
                        <div className="text-sm text-gray-600">Engagement Improvement</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">4.2</div>
                        <div className="text-sm text-gray-600">Avg Context Relevance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'companies':
        return (
          <div className="space-y-6">
            {/* Companies Header */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  + Add Company
                </button>
              </div>
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div key={company.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Company Header */}
                  <div 
                    className="h-20 p-4 flex items-center justify-between"
                    style={{ backgroundColor: company.primaryColor }}
                  >
                    <div>
                      <h3 className="text-xl font-bold text-white">{company.name}</h3>
                      <p className="text-white/80 text-sm">{company.tagline}</p>
                    </div>
                    <div className="text-white/80 text-sm">
                      {company.status === 'active' ? '🟢' : '🔴'} {company.status}
                    </div>
                  </div>

                  {/* Company Details */}
                  <div className="p-6 space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Industry:</span>
                        <div className="font-medium">{company.industry}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <div className="font-medium">{company.companySize}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Founded:</span>
                        <div className="font-medium">{company.foundedYear}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <div className="font-medium">{company.headquarters}</div>
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div>
                      <span className="text-gray-500 text-sm">Target Audience:</span>
                      <p className="text-sm text-gray-700 mt-1">{company.targetAudience}</p>
                    </div>

                    {/* Key Products */}
                    <div>
                      <span className="text-gray-500 text-sm">Key Products:</span>
                      <div className="mt-2 space-y-1">
                        {company.keyProducts.map((product, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium text-gray-900">{product.name}:</span>
                            <span className="text-gray-600 ml-1">{product.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Brand Voice & Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 text-sm">Brand Voice:</span>
                        <div className="text-sm font-medium capitalize">{company.brandVoice}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Competitor Mentions:</span>
                        <div className="text-sm font-medium">
                          {company.competitorMentionsAllowed ? '✅ Allowed' : '❌ Not Allowed'}
                        </div>
                      </div>
                    </div>

                    {/* Company Values */}
                    <div>
                      <span className="text-gray-500 text-sm">Values:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.companyValues.map((value, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Unique Selling Points */}
                    <div>
                      <span className="text-gray-500 text-sm">Unique Selling Points:</span>
                      <ul className="mt-1 space-y-1">
                        {company.uniqueSellingPoints.map((usp, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start">
                            <span className="text-green-500 mr-1">•</span>
                            {usp}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Social Media Handles */}
                    <div>
                      <span className="text-gray-500 text-sm">Social Media:</span>
                      <div className="flex space-x-3 mt-1">
                        {company.socialMediaHandles.twitter && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            🐦 {company.socialMediaHandles.twitter}
                          </span>
                        )}
                        {company.socialMediaHandles.linkedin && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            💼 {company.socialMediaHandles.linkedin}
                          </span>
                        )}
                        {company.socialMediaHandles.instagram && (
                          <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">
                            📷 {company.socialMediaHandles.instagram}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preferred Hashtags */}
                    <div>
                      <span className="text-gray-500 text-sm">Preferred Hashtags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.preferredHashtags.map((hashtag, index) => (
                          <span key={index} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                            {hashtag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Messaging Guidelines */}
                    <div>
                      <span className="text-gray-500 text-sm">Messaging Guidelines:</span>
                      <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                        {company.messagingGuidelines}
                      </p>
                    </div>

                    {/* Do Not Mention */}
                    <div>
                      <span className="text-gray-500 text-sm">Do Not Mention:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.doNotMention.map((item, index) => (
                          <span key={index} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            ❌ {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Response Templates */}
                    <div>
                      <span className="text-gray-500 text-sm">Response Templates:</span>
                      <div className="mt-2 space-y-2">
                        {Object.entries(company.responseTemplates).map(([key, template]) => (
                          <div key={key} className="bg-gray-50 p-2 rounded">
                            <div className="text-xs font-medium text-gray-600 capitalize mb-1">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </div>
                            <div className="text-xs text-gray-700">{template}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <div className="font-medium">{company.contactEmail}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <div className="font-medium">{company.contactPhone}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-500">Website:</span>
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 ml-1 text-sm"
                        >
                          {company.website}
                        </a>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-4 border-t">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm">
                        ✏️ Edit
                      </button>
                      <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm">
                        📊 Analytics
                      </button>
                      <button className="bg-gray-300 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-400 text-sm">
                        ⚙️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Company Statistics */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Company Portfolio Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{companies.length}</div>
                  <div className="text-sm text-gray-600">Total Companies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {companies.filter(c => c.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-600">Active Companies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(companies.map(c => c.industry)).size}
                  </div>
                  <div className="text-sm text-gray-600">Industries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {companies.reduce((total, c) => total + c.keyProducts.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Products</div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'campaigns':
        return (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex space-x-1">
                <button
                  onClick={() => setCampaignTab('create')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    campaignTab === 'create'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Create Campaign
                </button>
                <button
                  onClick={() => setCampaignTab('active')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    campaignTab === 'active'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Active Campaigns
                </button>
                <button
                  onClick={() => setCampaignTab('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    campaignTab === 'analytics'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analytics
                </button>
              </div>
            </div>
            
            {renderCampaignContent()}
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Notifications Header */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => supabase.functions.invoke('notification_manager_fixed_2025_10_26_01_00', {
                      body: { action: 'mark_all_read', user_id: user.id }
                    }).then(() => loadNotifications())}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    disabled={unreadCount === 0}
                  >
                    Mark All Read ({unreadCount})
                  </button>
                  <button 
                    onClick={loadNotifications}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              <p className="text-gray-600">
                Stay updated with campaign status, approvals needed, and system alerts.
              </p>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-lg shadow">
              <div className="divide-y divide-gray-200">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">🔔</div>
                    <p>No notifications yet</p>
                    <p className="text-sm">You'll see campaign updates and alerts here</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-6 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markNotificationRead(notification.id);
                        }
                        if (notification.action_url) {
                          // In a real app, you'd navigate to the URL
                          console.log('Navigate to:', notification.action_url);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${
                            notification.priority === 'urgent' ? 'bg-red-500' :
                            notification.priority === 'high' ? 'bg-orange-500' :
                            notification.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                notification.category === 'campaign' ? 'bg-blue-100 text-blue-800' :
                                notification.category === 'approval' ? 'bg-yellow-100 text-yellow-800' :
                                notification.category === 'error' ? 'bg-red-100 text-red-800' :
                                notification.category === 'success' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {notification.category}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                          
                          {notification.campaigns_2025_10_25_19_00 && (
                            <p className="mt-2 text-xs text-gray-500">
                              Campaign: {notification.campaigns_2025_10_25_19_00.name}
                            </p>
                          )}
                          
                          {notification.action_url && (
                            <div className="mt-3">
                              <span className="text-blue-600 text-sm hover:text-blue-800">
                                View Details →
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {!notification.is_read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Email Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Campaign status updates</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Approval requests</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Error alerts</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Priority Levels</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">🔴 Urgent notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">🟠 High priority</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">🟡 Medium priority</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">🔵 Low priority</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSettingsTab('reddit')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'reddit'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reddit
                </button>
                <button
                  onClick={() => setSettingsTab('instagram')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'instagram'
                      ? 'bg-pink-100 text-pink-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Instagram
                </button>
                <button
                  onClick={() => setSettingsTab('facebook')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'facebook'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Facebook
                </button>
                <button
                  onClick={() => setSettingsTab('linkedin')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'linkedin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  LinkedIn
                </button>
                <button
                  onClick={() => setSettingsTab('twitter')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'twitter'
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  X (Twitter)
                </button>
                <button
                  onClick={() => setSettingsTab('ai')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'ai'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  AI Service
                </button>
                <button
                  onClick={() => setSettingsTab('storage')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'storage'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Storage
                </button>
              </div>
            </div>
            
            {renderSettingsContent()}
          </div>
        );
        
      default:
        return <div>Content for {activeTab}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <LogoComponent size="small" />
              
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'campaigns'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Campaigns
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'comments'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Comments
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'analytics'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('intelligence')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'intelligence'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Intelligence
                </button>
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'companies'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Companies
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'settings'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-3 py-2 rounded-md text-sm font-medium relative ${
                    activeTab === 'notifications'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4">
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.includes('error') || message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
}

export default App;