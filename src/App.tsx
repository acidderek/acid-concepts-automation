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
  const [commentsTab, setCommentsTab] = useState('table');
  const [commentsView, setCommentsView] = useState('all');

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('reddit');
  const [targetLocation, setTargetLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [responseTemplate, setResponseTemplate] = useState('');
  const [maxResponses, setMaxResponses] = useState(10);
  const [isActive, setIsActive] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['reddit']);
  const [platformConfigs, setPlatformConfigs] = useState({});
  
  // Real database integration states
  const [companies, setCompanies] = useState([]);
  
  // Multi-platform campaign states
  const [selectedPlatforms, setSelectedPlatforms] = useState(['reddit']);
  const [platformConfigs, setPlatformConfigs] = useState({});
  
  // Real database integration states
  const [companies, setCompanies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [analytics, setAnalytics] = useState({});
  const [automationStatus, setAutomationStatus] = useState({});
  
  // Campaign Intelligence states
  const [intelligenceTab, setIntelligenceTab] = useState('documents');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [businessContext, setBusinessContext] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);

  // API Key Management states
  const [apiKeys, setApiKeys] = useState({});
  const [keyValidation, setKeyValidation] = useState({});
The key additions are:

  // Multi-platform campaign states
  const [selectedPlatforms, setSelectedPlatforms] = useState(['reddit']);
  const [platformConfigs, setPlatformConfigs] = useState({});

  // Advanced monitoring and AI settings
  const [monitoringRules, setMonitoringRules] = useState({
    minUpvotes: 10,
    maxAge: 24,
    excludeKeywords: '',
    includeKeywords: '',
    minComments: 5,
    maxComments: 100,
    authorKarma: 100
  });

  const [engagementRules, setEngagementRules] = useState({
    responseStyle: 'helpful',
    maxResponseLength: 200,
    includeEmojis: false,
    includeQuestions: true,
    avoidControversy: true,
    personalityTone: 'professional'
  });
  const [scheduleSettings, setScheduleSettings] = useState({
    timezone: 'UTC',
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    activeHours: { start: 9, end: 17 },
    postsPerHour: 2,
    randomizeDelay: true,
    minDelay: 15,
    maxDelay: 45,
    batchSize: 5
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

  // Real database integration functions
  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_responses_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analytics_dashboard_2025_10_25_19_00', {
        body: { user_id: user?.id }
      });
      
      if (error) throw error;
      setAnalytics(data || {});
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Campaign automation functions
  const handleCreateRealCampaign = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('campaign_automation_engine_2025_10_25_19_00', {
        body: {
          action: 'create',
          user_id: user?.id,
          campaign_data: {
            name: campaignName,
            platforms: selectedPlatforms,
            monitoring_rules: monitoringRules,
            engagement_rules: engagementRules,
            schedule_settings: scheduleSettings,
            ai_settings: aiSettings
          }
        }
      });
      
      if (error) throw error;
      setMessage('Campaign created successfully!');
      loadCampaigns();
    } catch (error) {
      setMessage('Error creating campaign: ' + error.message);
    }
  };

  const handleStartRealCampaign = async (campaignId) => {
    try {
      const { data, error } = await supabase.functions.invoke('campaign_automation_engine_2025_10_25_19_00', {
        body: {
          action: 'start',
          campaign_id: campaignId,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      setMessage('Campaign started successfully!');
      loadCampaigns();
    } catch (error) {
      setMessage('Error starting campaign: ' + error.message);
    }
  };

  const handleStopRealCampaign = async (campaignId) => {
    try {
      const { data, error } = await supabase.functions.invoke('campaign_automation_engine_2025_10_25_19_00', {
        body: {
          action: 'stop',
          campaign_id: campaignId,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      setMessage('Campaign stopped successfully!');
      loadCampaigns();
    } catch (error) {
      setMessage('Error stopping campaign: ' + error.message);
    }
  };

  // API Key management functions
  const handleSaveAPIKey = async (platform, keyData) => {
    try {
      const { data, error } = await supabase.functions.invoke('api_key_manager_2025_10_25_19_00', {
        body: {
          action: 'store',
          user_id: user?.id,
          platform: platform,
          credentials: keyData
        }
      });
      
      if (error) throw error;
      setMessage(`${platform} API key saved successfully!`);
    } catch (error) {
      setMessage(`Error saving ${platform} API key: ` + error.message);
    }
  };

  // Document processing functions
  const handleFileUpload = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-intelligence-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke('document_processing_engine_2025_10_25_19_00', {
        body: {
          action: 'process',
          user_id: user?.id,
          file_path: filePath,
          file_name: file.name
        }
      });
      
      if (error) throw error;
      setMessage('Document uploaded and processed successfully!');
      loadDocuments();
    } catch (error) {
      setMessage('Error uploading document: ' + error.message);
    }
  };

  // Notification functions
  const markNotificationRead = async (notificationId) => {
    try {
      const { error } = await supabase.functions.invoke('notification_manager_2025_10_25_19_00', {
        body: {
          action: 'mark_read',
          notification_id: notificationId,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Authentication functions
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

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadCompanies();
      loadCampaigns();
      loadComments();
      loadNotifications();
      loadAnalytics();
    }
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadNotifications();
        loadAnalytics();
      }, 30000); // Update every 30 seconds

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Custom SVG Logo Component
  const LogoComponent = () => (
    <div className="flex items-center justify-center">
      <svg width="160" height="50" viewBox="0 0 160 50" className="h-10 w-auto">
        <defs>
          <linearGradient id="acidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <text x="80" y="32" fontSize="24" fontWeight="bold" fill="url(#acidGradient)" fontFamily="Arial, sans-serif" textAnchor="middle">
          ACID
        </text>
      </svg>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <LogoComponent />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Professional Automation Platform</h2>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
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
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('error') || message.includes('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Campaigns</h3>
                <p className="text-3xl font-bold text-blue-600">{campaigns.filter(c => c.status === 'active').length}</p>
                <p className="text-sm text-gray-500">Currently running</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Responses</h3>
                <p className="text-3xl font-bold text-green-600">{comments.length}</p>
                <p className="text-sm text-gray-500">Generated responses</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Rate</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {comments.length > 0 ? Math.round((comments.filter(c => c.status === 'posted').length / comments.length) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-500">Response success</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h3>
                <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
                <p className="text-sm text-gray-500">Unread alerts</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {comments.slice(0, 5).map((comment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{comment.campaign_name || 'Campaign'}</p>
                      <p className="text-sm text-gray-600">{comment.platform} • {comment.status}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'campaigns':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  {['create', 'active', 'analytics'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCampaignTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        campaignTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {campaignTab === 'create' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateRealCampaign(); }} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Name
                      </label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platforms
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['reddit', 'linkedin', 'twitter', 'facebook', 'instagram', 'quora', 'producthunt', 'substack'].map((platform) => (
                          <label key={platform} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedPlatforms.includes(platform)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPlatforms([...selectedPlatforms, platform]);
                                } else {
                                  setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="capitalize">{platform}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monitoring Rules
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Min Upvotes</label>
                          <input
                            type="number"
                            value={monitoringRules.minUpvotes}
                            onChange={(e) => setMonitoringRules({...monitoringRules, minUpvotes: parseInt(e.target.value)})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Max Age (hours)</label>
                          <input
                            type="number"
                            value={monitoringRules.maxAge}
                            onChange={(e) => setMonitoringRules({...monitoringRules, maxAge: parseInt(e.target.value)})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Settings
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Response Style</label>
                          <select
                            value={engagementRules.responseStyle}
                            onChange={(e) => setEngagementRules({...engagementRules, responseStyle: e.target.value})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="helpful">Helpful</option>
                            <option value="promotional">Promotional</option>
                            <option value="neutral">Neutral</option>
                            <option value="expert">Expert</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Max Length</label>
                          <input
                            type="number"
                            value={engagementRules.maxResponseLength}
                            onChange={(e) => setEngagementRules({...engagementRules, maxResponseLength: parseInt(e.target.value)})}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Campaign
                    </button>
                  </form>
                )}

                {campaignTab === 'active' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Campaigns</h3>
                    {campaigns.length > 0 ? (
                      campaigns.map((campaign, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{campaign.name}</h4>
                              <p className="text-sm text-gray-600">Status: {campaign.status}</p>
                              <p className="text-sm text-gray-600">Platforms: {campaign.platforms?.join(', ')}</p>
                            </div>
                            <div className="flex space-x-2">
                              {campaign.status === 'active' ? (
                                <button
                                  onClick={() => handleStopRealCampaign(campaign.id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Stop
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartRealCampaign(campaign.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Start
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No campaigns created yet</p>
                    )}
                  </div>
                )}

                {campaignTab === 'analytics' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Campaign Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900">Total Posts Discovered</h4>
                        <p className="text-2xl font-bold text-blue-600">{analytics.total_posts || 0}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900">Responses Generated</h4>
                        <p className="text-2xl font-bold text-green-600">{analytics.total_responses || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-900">Engagement Rate</h4>
                        <p className="text-2xl font-bold text-purple-600">{analytics.engagement_rate || 0}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'comments':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Comment Management</h2>
                  <div className="flex space-x-4">
                    <select
                      value={commentsView}
                      onChange={(e) => setCommentsView(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">All Comments</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {comments.filter(comment => commentsView === 'all' || comment.status === commentsView).map((comment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{comment.campaign_name}</h4>
                          <p className="text-sm text-gray-600">{comment.platform} • {comment.subreddit_or_group}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          comment.status === 'approved' ? 'bg-green-100 text-green-800' :
                          comment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {comment.status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Original Post:</p>
                        <p className="text-sm text-gray-600">{comment.original_post_title}</p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">AI Generated Response:</p>
                        <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">{comment.ai_generated_response}</p>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Confidence: {Math.round((comment.ai_confidence_score || 0) * 100)}%</span>
                        <span>Engagement Potential: {comment.engagement_potential || 0}/10</span>
                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  
                  {comments.filter(comment => commentsView === 'all' || comment.status === commentsView).length === 0 && (
                    <p className="text-gray-500 text-center py-8">No comments found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Analytics Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                  <h3 className="text-sm font-medium opacity-90">Total Campaigns</h3>
                  <p className="text-3xl font-bold">{campaigns.length}</p>
                  <p className="text-sm opacity-75">All time</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                  <h3 className="text-sm font-medium opacity-90">Active Campaigns</h3>
                  <p className="text-3xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
                  <p className="text-sm opacity-75">Currently running</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                  <h3 className="text-sm font-medium opacity-90">Total Responses</h3>
                  <p className="text-3xl font-bold">{comments.length}</p>
                  <p className="text-sm opacity-75">Generated</p>
                </div>
                
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                  <h3 className="text-sm font-medium opacity-90">Success Rate</h3>
                  <p className="text-3xl font-bold">
                    {comments.length > 0 ? Math.round((comments.filter(c => c.status === 'posted').length / comments.length) * 100) : 0}%
                  </p>
                  <p className="text-sm opacity-75">Response success</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-4">Platform Distribution</h3>
                  <div className="space-y-2">
                    {['reddit', 'linkedin', 'twitter', 'facebook'].map(platform => {
                      const count = comments.filter(c => c.platform === platform).length;
                      const percentage = comments.length > 0 ? (count / comments.length) * 100 : 0;
                      return (
                        <div key={platform} className="flex items-center justify-between">
                          <span className="capitalize text-sm">{platform}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-4">Response Status</h3>
                  <div className="space-y-2">
                    {['pending', 'approved', 'rejected', 'posted'].map(status => {
                      const count = comments.filter(c => c.status === status).length;
                      const percentage = comments.length > 0 ? (count / comments.length) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className="capitalize text-sm">{status}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  status === 'approved' ? 'bg-green-600' :
                                  status === 'rejected' ? 'bg-red-600' :
                                  status === 'posted' ? 'bg-blue-600' :
                                  'bg-yellow-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'intelligence':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  {['documents', 'context', 'knowledge'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setIntelligenceTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        intelligenceTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {intelligenceTab === 'documents' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Document Upload</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                          id="file-upload"
                          accept=".pdf,.doc,.docx,.txt,.md"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <p className="text-gray-600">Click to upload documents</p>
                          <p className="text-sm text-gray-500">PDF, DOC, DOCX, TXT, MD files supported</p>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Uploaded Documents</h4>
                      <div className="space-y-2">
                        {uploadedDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-gray-600">Processed • {doc.pages} pages</p>
                            </div>
                            <span className="text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                        {uploadedDocuments.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {intelligenceTab === 'context' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Business Context</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Company Information</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Companies:</strong> {companies.length} configured</p>
                          <p><strong>Industries:</strong> Technology, Automation, Security</p>
                          <p><strong>Target Audience:</strong> Business owners, Developers, Entrepreneurs</p>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Content Guidelines</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Tone:</strong> Professional, Helpful</p>
                          <p><strong>Style:</strong> Informative, Solution-focused</p>
                          <p><strong>Avoid:</strong> Overly promotional content</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {intelligenceTab === 'knowledge' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Knowledge Base</h3>
                    <div className="space-y-4">
                      {knowledgeBase.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.summary}</p>
                          <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                            <span>Source: {item.source}</span>
                            <span>Relevance: {item.relevance_score}/10</span>
                          </div>
                        </div>
                      ))}
                      {knowledgeBase.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No knowledge base entries yet. Upload documents to build your knowledge base.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'companies':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Company Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">
                          {company.name?.charAt(0) || 'C'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold">{company.name}</h3>
                        <p className="text-sm text-gray-600">{company.industry}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>Website:</strong> {company.website}</p>
                      <p><strong>Founded:</strong> {company.founded_year}</p>
                      <p><strong>Size:</strong> {company.company_size}</p>
                      <p><strong>Headquarters:</strong> {company.headquarters}</p>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Tagline:</p>
                      <p className="text-sm text-gray-600 italic">"{company.tagline}"</p>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Key Products:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.key_products?.split(',').map((product, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {product.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {companies.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">No companies configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {notifications.map((notification, index) => (
                  <div 
                    key={index} 
                    className={`p-6 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => !notification.read && markNotificationRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        notification.priority === 'urgent' ? 'bg-red-500' :
                        notification.priority === 'high' ? 'bg-orange-500' :
                        notification.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        
                        {notification.category && (
                          <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                            notification.category === 'campaign' ? 'bg-blue-100 text-blue-800' :
                            notification.category === 'approval' ? 'bg-yellow-100 text-yellow-800' :
                            notification.category === 'error' ? 'bg-red-100 text-red-800' :
                            notification.category === 'success' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {notifications.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  {['api-keys', 'platforms', 'preferences'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSettingsTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        settingsTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.replace('-', ' ')}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {settingsTab === 'api-keys' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">API Key Management</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">OpenAI</h4>
                        <input
                          type="password"
                          placeholder="sk-..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button 
                          onClick={() => handleSaveAPIKey('openai', { api_key: 'test' })}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save & Test
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Reddit</h4>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Client ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <input
                            type="password"
                            placeholder="Client Secret"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <button 
                          onClick={() => handleSaveAPIKey('reddit', { client_id: 'test', client_secret: 'test' })}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save & Test
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Stripe</h4>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Publishable Key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <input
                            type="password"
                            placeholder="Secret Key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <button 
                          onClick={() => handleSaveAPIKey('stripe', { publishable_key: 'test', secret_key: 'test' })}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save & Test
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Resend</h4>
                        <input
                          type="password"
                          placeholder="API Key"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button 
                          onClick={() => handleSaveAPIKey('resend', { api_key: 'test' })}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save & Test
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'platforms' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Platform Configuration</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {['reddit', 'linkedin', 'twitter', 'facebook', 'instagram'].map(platform => (
                        <div key={platform} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium capitalize">{platform}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              keyValidation[platform] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {keyValidation[platform] ? 'Connected' : 'Not configured'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Configure {platform} integration for automated posting and monitoring.
                          </p>
                          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            Configure
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === 'preferences' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">User Preferences</h3>
                    
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Notification Settings</h4>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-2" defaultChecked />
                            <span className="text-sm">Email notifications for campaign updates</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-2" defaultChecked />
                            <span className="text-sm">Push notifications for urgent alerts</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-2" />
                            <span className="text-sm">Weekly performance reports</span>
                          </label>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Default Settings</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Default AI Model
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option>GPT-3.5 Turbo</option>
                              <option>GPT-4</option>
                              <option>Claude</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Timezone
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option>UTC</option>
                              <option>EST</option>
                              <option>PST</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <LogoComponent />
              <span className="ml-3 text-xl font-semibold text-gray-900">Campaign Intelligence</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button 
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 0-8-3-8-6s4-6 9-6 9 3 9 6c0 3-3 6-8 6z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'campaigns', label: 'Campaigns' },
              { key: 'comments', label: 'Comments' },
              { key: 'analytics', label: 'Analytics' },
              { key: 'intelligence', label: 'Intelligence' },
              { key: 'companies', label: 'Companies' },
              { key: 'notifications', label: 'Notifications' },
              { key: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.key === 'notifications' && unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.includes('error') || message.includes('Error') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}
        
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
