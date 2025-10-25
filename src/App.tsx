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

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [keywords, setKeywords] = useState('');
  const [responseTemplate, setResponseTemplate] = useState('');
  const [maxResponses, setMaxResponses] = useState(10);
  const [isActive, setIsActive] = useState(false);

  // Settings state
  const [redditClientId, setRedditClientId] = useState('');
  const [redditClientSecret, setRedditClientSecret] = useState('');
  const [redditRedirectUri, setRedditRedirectUri] = useState('');
  const [redditUsername, setRedditUsername] = useState('');
  const [redditPassword, setRedditPassword] = useState('');

  const [aiProvider, setAiProvider] = useState('openai');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');

  const [wasabiAccessKey, setWasabiAccessKey] = useState('');
  const [wasabiSecretKey, setWasabiSecretKey] = useState('');
  const [wasabiEndpoint, setWasabiEndpoint] = useState('s3.wasabisys.com');
  const [wasabiRegion, setWasabiRegion] = useState('us-east-1');
  const [bucketName, setBucketName] = useState('');
  const [buckets, setBuckets] = useState([]);

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
    setMessage('Campaign created successfully! (Demo mode)');
    
    // Reset form
    setCampaignName('');
    setSubreddit('');
    setKeywords('');
    setResponseTemplate('');
    setMaxResponses(10);
    setIsActive(false);
  };

  const handleSaveRedditSettings = async (e) => {
    e.preventDefault();
    setMessage('Reddit settings saved successfully! (Demo mode)');
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
            <img 
              src="/images/acidlogo.png" 
              alt="Acid Concepts" 
              className="mx-auto h-16 w-auto mb-4"
              onError={(e) => {
                console.log('Logo failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
            <h2 className="text-3xl font-bold text-gray-900">Acid Concepts</h2>
            <p className="mt-2 text-gray-600">Professional Automation Platform</p>
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
            <p className="text-gray-600 mb-6">Configure your Reddit API credentials to enable automation features.</p>
            
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
                  placeholder="https://your-domain.com/auth/callback"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reddit Username
                  </label>
                  <input
                    type="text"
                    value={redditUsername}
                    onChange={(e) => setRedditUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Reddit username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reddit Password
                  </label>
                  <input
                    type="password"
                    value={redditPassword}
                    onChange={(e) => setRedditPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Reddit password"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How to get Reddit API credentials:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="underline">reddit.com/prefs/apps</a></li>
                  <li>2. Click "Create App" or "Create Another App"</li>
                  <li>3. Choose "web app" as the app type</li>
                  <li>4. Set redirect URI to your domain + /auth/callback</li>
                  <li>5. Copy the client ID and secret</li>
                </ol>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Reddit Settings
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
    switch (campaignTab) {
      case 'create':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">Create New Campaign</h3>
            
            <form onSubmit={handleCreateCampaign} className="space-y-6">
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
                    placeholder="My Reddit Campaign"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Subreddit
                  </label>
                  <input
                    type="text"
                    value={subreddit}
                    onChange={(e) => setSubreddit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="r/technology"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AI, automation, technology"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Template
                </label>
                <textarea
                  value={responseTemplate}
                  onChange={(e) => setResponseTemplate(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Thanks for sharing! This is really interesting..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Responses per Day
                  </label>
                  <input
                    type="number"
                    value={maxResponses}
                    onChange={(e) => setMaxResponses(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Activate immediately
                  </label>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Campaign
              </button>
            </form>
          </div>
        );
        
      case 'active':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-6">Active Campaigns</h3>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Campaigns</h4>
              <p className="text-gray-600 mb-4">Create your first campaign to get started</p>
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
              <h3 className="text-xl font-bold mb-6">Campaign Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 text-sm">Total Posts Monitored</h4>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 text-sm">Responses Sent</h4>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 text-sm">Engagement Rate</h4>
                  <p className="text-2xl font-bold text-yellow-600">0%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 text-sm">AI Usage</h4>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                </div>
              </div>
              
              <div className="text-center py-8">
                <p className="text-gray-600">Analytics will be available once campaigns are executed and monitoring data is collected.</p>
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
              <h3 className="text-xl font-bold mb-4">Reddit Automation Platform</h3>
              <p className="text-gray-600 mb-6">Automate your Reddit engagement with intelligent responses and monitoring.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Key Features:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Automated post monitoring
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Keyword-based targeting
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      AI-powered responses
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Real-time analytics
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Quick Actions:</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setActiveTab('campaigns');
                        setCampaignTab('create');
                      }}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-left"
                    >
                      Create New Campaign
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-left"
                    >
                      Configure Settings
                    </button>
                  </div>
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
        
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex space-x-1">
                <button
                  onClick={() => setSettingsTab('reddit')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'reddit'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reddit API
                </button>
                <button
                  onClick={() => setSettingsTab('ai')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'ai'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  AI Service
                </button>
                <button
                  onClick={() => setSettingsTab('storage')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    settingsTab === 'storage'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Object Storage
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
              <img 
                src="/images/acidlogo.png" 
                alt="Acid Concepts" 
                className="h-8 w-auto"
                onError={(e) => {
                  console.log('Header logo failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
              
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
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === 'settings'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Settings
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
