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
  const [settingsTab, setSettingsTab] = useState('api-keys');

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['reddit']);

  // Real database integration states
  const [companies, setCompanies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [analytics, setAnalytics] = useState({
    total_posts: 0,
    total_responses: 0,
    engagement_rate: 0,
    active_campaigns: 0,
    pending_responses: 0,
    success_rate: 0
  });

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

  // FIXED API Key management function
  const handleSaveAPIKey = async (platform, keyData) => {
    try {
      if (platform === 'reddit') {
        // For Reddit, save both client_id and client_secret
        if (keyData.client_id) {
          const { data: clientData, error: clientError } = await supabase.functions.invoke('api_key_manager_simple_2025_10_25_23_00', {
            body: {
              action: 'store_key',
              platform: 'reddit',
              key_type: 'client_id',
              key_value: keyData.client_id,
              key_name: 'Reddit Client ID',
              user_id: user?.id
            }
          });
          if (clientError) throw clientError;
        }
        
        if (keyData.client_secret) {
          const { data: secretData, error: secretError } = await supabase.functions.invoke('api_key_manager_simple_2025_10_25_23_00', {
            body: {
              action: 'store_key',
              platform: 'reddit',
              key_type: 'client_secret',
              key_value: keyData.client_secret,
              key_name: 'Reddit Client Secret',
              user_id: user?.id
            }
          });
          if (secretError) throw secretError;
        }
      } else {
        // For other platforms, use api_key
        const keyValue = keyData.api_key || keyData.secret_key || keyData.publishable_key;
        const keyType = keyData.secret_key ? 'secret_key' : keyData.publishable_key ? 'publishable_key' : 'api_key';
        
        const { data, error } = await supabase.functions.invoke('api_key_manager_simple_2025_10_25_23_00', {
          body: {
            action: 'store_key',
            platform: platform,
            key_type: keyType,
            key_value: keyValue,
            key_name: `${platform} API Key`,
            user_id: user?.id
          }
        });
        
        if (error) throw error;
      }
      
      setMessage(`${platform} API key saved successfully!`);
    } catch (error) {
      setMessage(`Error saving ${platform} API key: ` + error.message);
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

  // Custom SVG Logo Component - YOUR CUSTOM ACID LOGO
  const LogoComponent = ({ size = "large" }) => {
    const dimensions = size === "large" ? { width: 200, height: 54 } : { width: 120, height: 32 };
    
    return (
      <div className={size === "large" ? "flex justify-center" : "flex items-center"}>
        <svg 
          width={dimensions.width} 
          height={dimensions.height} 
          viewBox="0 0 755.97 201.99" 
          xmlns="http://www.w3.org/2000/svg"
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
      </div>
    );
  };

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
                          id="openai-key"
                        />
                        <button 
                          onClick={() => {
                            const key = document.getElementById('openai-key').value;
                            if (key) handleSaveAPIKey('openai', { api_key: key });
                          }}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save & Test
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">OpenRouter</h4>
                        <input
                          type="password"
                          placeholder="sk-or-v1-..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          id="openrouter-key"
                        />
                        <button 
                          onClick={() => {
                            const key = document.getElementById('openrouter-key').value;
                            if (key) handleSaveAPIKey('openrouter', { api_key: key });
                          }}
                          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
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
                            id="reddit-client-id"
                          />
                          <input
                            type="password"
                            placeholder="Client Secret"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            id="reddit-client-secret"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const clientId = document.getElementById('reddit-client-id').value;
                            const clientSecret = document.getElementById('reddit-client-secret').value;
                            if (clientId && clientSecret) {
                              handleSaveAPIKey('reddit', { client_id: clientId, client_secret: clientSecret });
                            }
                          }}
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
                            id="stripe-pub-key"
                          />
                          <input
                            type="password"
                            placeholder="Secret Key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            id="stripe-secret-key"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const pubKey = document.getElementById('stripe-pub-key').value;
                            const secretKey = document.getElementById('stripe-secret-key').value;
                            if (pubKey && secretKey) {
                              handleSaveAPIKey('stripe', { publishable_key: pubKey, secret_key: secretKey });
                            }
                          }}
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
                          id="resend-key"
                        />
                        <button 
                          onClick={() => {
                            const key = document.getElementById('resend-key').value;
                            if (key) handleSaveAPIKey('resend', { api_key: key });
                          }}
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
                    <p className="text-gray-600">Platform configurations will be available after API keys are set up.</p>
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
              <LogoComponent size="small" />
              <span className="ml-3 text-xl font-semibold text-gray-900">Campaign Intelligence</span>
            </div>
            
            <div className="flex items-center space-x-4">
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