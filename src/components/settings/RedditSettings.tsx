import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RedditSettingsProps {
  user: any;
  setMessage: (message: string) => void;
}

const RedditSettings: React.FC<RedditSettingsProps> = ({ user, setMessage }) => {
  const [redditAuthStatus, setRedditAuthStatus] = useState({
    authenticated: false,
    loading: false,
    user: null,
    tokenExpired: false
  });

  const [loading, setLoading] = useState(false);
  const [redditAccounts, setRedditAccounts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    username: '',
    client_id: '',
    client_secret: '',
    redirect_uri: `${window.location.origin}/auth/reddit/callback`
  });

  // Check Reddit authentication status and load accounts
  useEffect(() => {
    checkRedditAuth();
    loadRedditAccounts();
  }, [user]);

  const loadRedditAccounts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load Reddit credentials from user_api_keys table
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .like('service', 'reddit_%')
        .eq('status', 'active');

      if (error) {
        console.error('Error loading Reddit credentials:', error);
        setMessage('❌ Failed to load Reddit credentials');
        return;
      }

      console.log('Raw Reddit credentials:', data);
      console.log('User ID:', user.id);

      // Group credentials by account (for now, assume one account but structure for multiple)
      const accountsMap: any = {};
      
      data?.forEach(item => {
        // Extract account identifier (for now, use 'default' but could be extended)
        const accountKey = 'default';
        
        if (!accountsMap[accountKey]) {
          accountsMap[accountKey] = {
            id: accountKey,
            username: 'Not set',
            client_id: 'Not set',
            client_secret: 'Not set',
            redirect_uri: 'Not set',
            status: 'incomplete',
            last_used: 'Not tracked',
            api_calls_today: 0,
            rate_limit_remaining: 1000
          };
        }
        
        // Map the service to account properties
        switch (item.service) {
          case 'reddit_username':
            accountsMap[accountKey].username = item.key_value;
            break;
          case 'reddit_client_id':
            accountsMap[accountKey].client_id = `${item.key_value.substring(0, 8)}...`;
            accountsMap[accountKey].full_client_id = item.key_value;
            break;
          case 'reddit_client_secret':
            accountsMap[accountKey].client_secret = `${item.key_value.substring(0, 8)}...`;
            accountsMap[accountKey].has_secret = true;
            break;
          case 'reddit_redirect_uri':
            accountsMap[accountKey].redirect_uri = item.key_value;
            break;
        }
      });

      // Convert to array and determine status
      const accounts = Object.values(accountsMap).map((account: any) => {
        // Determine status based on what credentials are available
        let status = 'incomplete';
        if (account.full_client_id && account.has_secret) {
          status = 'configured';
        }
        if (account.username !== 'Not set' && account.full_client_id && account.has_secret) {
          status = 'active';
        }
        
        return {
          ...account,
          status
        };
      });

      setRedditAccounts(accounts);
      console.log('Processed Reddit accounts:', accounts);
      
      // Update auth status based on accounts
      if (accounts.length > 0 && accounts[0].status === 'active') {
        setRedditAuthStatus({
          authenticated: true,
          loading: false,
          user: accounts[0].username,
          tokenExpired: false
        });
      }
      
    } catch (error) {
      console.error('Exception loading Reddit accounts:', error);
      setMessage('❌ Error loading Reddit accounts');
    } finally {
      setLoading(false);
    }
  };

  const checkRedditAuth = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('service', 'reddit_access_token')
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking Reddit auth:', error);
        return;
      }

      if (data?.key_value) {
        setRedditAuthStatus({
          authenticated: true,
          loading: false,
          user: 'Connected',
          tokenExpired: false
        });
        setMessage('✅ Reddit authentication verified');
      } else {
        setRedditAuthStatus({
          authenticated: false,
          loading: false,
          user: null,
          tokenExpired: false
        });
      }
    } catch (error) {
      console.error('Error checking Reddit auth:', error);
      setMessage('❌ Error checking Reddit authentication');
    } finally {
      setLoading(false);
    }
  };

  const startRedditAuth = async () => {
    if (!user?.id) {
      setMessage('❌ Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔄 Checking Reddit credentials...');

      // Check if user has Reddit credentials configured
      const { data: credentials, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .in('service', ['reddit_client_id', 'reddit_client_secret', 'reddit_redirect_uri'])
        .eq('status', 'active');

      if (error) {
        console.error('Error checking credentials:', error);
        setMessage('❌ Error checking Reddit credentials');
        return;
      }

      const creds: any = {};
      credentials?.forEach(item => {
        creds[item.service] = item.key_value;
      });

      if (!creds.reddit_client_id || !creds.reddit_client_secret) {
        setMessage('❌ Please configure Reddit Client ID and Secret in API Keys settings first');
        return;
      }

      // Generate state parameter for security
      const state = btoa(JSON.stringify({
        user_id: user.id,
        timestamp: Date.now(),
        random: Math.random().toString(36)
      }));

      // Use user's configured Reddit app credentials
      const clientId = creds.reddit_client_id;
      const redirectUri = creds.reddit_redirect_uri || `${window.location.origin}/auth/reddit/callback`;
      const scope = encodeURIComponent('identity read submit vote');
      
      const authUrl = `https://www.reddit.com/api/v1/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `state=${state}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `duration=permanent&` +
        `scope=${scope}`;

      // Store state in localStorage for verification
      localStorage.setItem('reddit_oauth_state', state);
      
      setMessage('🔄 Redirecting to Reddit for authorization...');
      
      // Redirect to Reddit OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('Error starting Reddit auth:', error);
      setMessage('❌ Error starting Reddit authentication');
      setLoading(false);
    }
  };

  const addRedditAccount = async () => {
    if (!user?.id) {
      setMessage('❌ Please log in first');
      return;
    }

    if (!newAccount.client_id || !newAccount.client_secret) {
      setMessage('❌ Please provide at least Client ID and Client Secret');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔄 Adding Reddit account...');

      // Prepare credentials to insert
      const credentialsToInsert = [
        {
          user_id: user.id,
          service: 'reddit_client_id',
          key_name: 'Reddit Client ID',
          key_value: newAccount.client_id,
          status: 'active'
        },
        {
          user_id: user.id,
          service: 'reddit_client_secret',
          key_name: 'Reddit Client Secret',
          key_value: newAccount.client_secret,
          status: 'active'
        }
      ];

      if (newAccount.username) {
        credentialsToInsert.push({
          user_id: user.id,
          service: 'reddit_username',
          key_name: 'Reddit Username',
          key_value: newAccount.username,
          status: 'active'
        });
      }

      if (newAccount.redirect_uri) {
        credentialsToInsert.push({
          user_id: user.id,
          service: 'reddit_redirect_uri',
          key_name: 'Reddit Redirect URI',
          key_value: newAccount.redirect_uri,
          status: 'active'
        });
      }

      // First, delete any existing Reddit credentials for this user
      const { error: deleteError } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .in('service', ['reddit_client_id', 'reddit_client_secret', 'reddit_username', 'reddit_redirect_uri']);

      if (deleteError) {
        console.error('Error deleting existing Reddit credentials:', deleteError);
      }

      // Insert new credentials
      const { error } = await supabase
        .from('user_api_keys')
        .insert(credentialsToInsert);

      if (error) {
        console.error('Error adding Reddit credentials:', error);
        console.error('Credentials being inserted:', credentialsToInsert);
        setMessage(`❌ Error adding Reddit account: ${error.message}`);
        return;
      }

      console.log('✅ Reddit credentials saved successfully');

      // Now get an access token using the credentials
      await getRedditAccessToken(newAccount.client_id, newAccount.client_secret);

      // Reset form and reload accounts
      setNewAccount({
        username: '',
        client_id: '',
        client_secret: '',
        redirect_uri: `${window.location.origin}/auth/reddit/callback`
      });
      setShowAddForm(false);
      loadRedditAccounts();
      setMessage('✅ Reddit account added successfully');

    } catch (error) {
      console.error('Exception adding Reddit account:', error);
      setMessage('❌ Error adding Reddit account');
    } finally {
      setLoading(false);
    }
  };

  const getRedditAccessToken = async (clientId: string, clientSecret: string) => {
    try {
      setMessage('🔄 Getting Reddit access token...');

      // Use Reddit's client credentials flow to get an access token
      const credentials = btoa(`${clientId}:${clientSecret}`);
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CampaignBot/1.0'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }

      const tokenData = await response.json();
      
      if (tokenData.access_token) {
        // Save the access token
        const { error } = await supabase
          .from('user_api_keys')
          .insert({
            user_id: user.id,
            service: 'reddit_access_token',
            key_name: 'Reddit Access Token',
            key_value: tokenData.access_token,
            status: 'active'
          });

        if (error) {
          console.error('Error saving access token:', error);
          setMessage('⚠️ Reddit credentials saved but failed to get access token');
        } else {
          setMessage('✅ Reddit account added and authenticated successfully!');
        }
      } else {
        throw new Error('No access token received from Reddit');
      }

    } catch (error) {
      console.error('Error getting Reddit access token:', error);
      setMessage(`⚠️ Reddit credentials saved but authentication failed: ${error.message}`);
    }
  };

  const startRedditOAuth = async () => {
    if (!user?.id) {
      setMessage('❌ Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔄 Checking Reddit app configuration...');

      // Check if user has Reddit app credentials configured
      const { data: credentials, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .in('service', ['reddit_client_id', 'reddit_client_secret'])
        .eq('status', 'active');

      if (error) {
        console.error('Error checking credentials:', error);
        setMessage('❌ Error checking Reddit credentials');
        return;
      }

      const creds: any = {};
      credentials?.forEach(item => {
        creds[item.service] = item.key_value;
      });

      if (!creds.reddit_client_id || !creds.reddit_client_secret) {
        setMessage('❌ Please configure Reddit Client ID and Secret using "⚙️ Manual Setup" first');
        return;
      }

      // Generate state parameter for security
      const state = btoa(JSON.stringify({
        user_id: user.id,
        timestamp: Date.now(),
        random: Math.random().toString(36)
      }));

      // Use user's configured Reddit app credentials
      const clientId = creds.reddit_client_id;
      const redirectUri = `${window.location.origin}`;
      const scope = encodeURIComponent('identity read submit vote');
      
      const authUrl = `https://www.reddit.com/api/v1/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `state=${state}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `duration=permanent&` +
        `scope=${scope}`;

      // Store state in localStorage for verification
      localStorage.setItem('reddit_oauth_state', state);
      
      setMessage('🔄 Redirecting to Reddit for authorization...');
      
      // Redirect to Reddit OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('Error starting Reddit OAuth:', error);
      setMessage('❌ Error starting Reddit authentication');
      setLoading(false);
    }
  };

  const testAccessToken = async () => {
    if (!user?.id) {
      setMessage('❌ Please log in first');
      return;
    }

    try {
      setLoading(true);
      setMessage('🔄 Testing Reddit access token...');

      // Check if access token exists
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_api_keys')
        .select('key_value')
        .eq('user_id', user.id)
        .eq('service', 'reddit_access_token')
        .eq('status', 'active')
        .single();

      if (tokenError || !tokenData?.key_value) {
        setMessage('❌ No Reddit access token found. Please complete OAuth flow first.');
        return;
      }

      console.log('Found access token:', tokenData.key_value.substring(0, 20) + '...');

      // Test the token by making a simple API call
      const testResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.key_value}`,
          'User-Agent': 'CampaignBot/1.0'
        }
      });

      console.log('Reddit API test response:', testResponse.status, testResponse.statusText);

      if (testResponse.ok) {
        const userData = await testResponse.json();
        console.log('Reddit user data:', userData);
        setMessage(`✅ Reddit token is valid! Authenticated as: ${userData.name}`);
      } else {
        const errorText = await testResponse.text();
        console.error('Reddit API error:', errorText);
        setMessage(`❌ Reddit token is invalid or expired (${testResponse.status})`);
      }

    } catch (error) {
      console.error('Error testing Reddit token:', error);
      setMessage(`❌ Error testing Reddit token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectReddit = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setMessage('🔄 Removing Reddit credentials...');

      // Remove Reddit credentials from user_api_keys
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .in('service', ['reddit_client_id', 'reddit_client_secret', 'reddit_username', 'reddit_redirect_uri', 'reddit_access_token']);

      if (error) {
        console.error('Error removing Reddit credentials:', error);
        setMessage('❌ Error removing Reddit credentials');
        return;
      }

      setRedditAuthStatus({
        authenticated: false,
        loading: false,
        user: null,
        tokenExpired: false
      });

      // Reload accounts to reflect changes
      loadRedditAccounts();
      setMessage('✅ Reddit credentials removed successfully');
    } catch (error) {
      console.error('Error removing Reddit credentials:', error);
      setMessage('❌ Error removing Reddit credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reddit OAuth Status */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">🔴 Reddit Authentication</h4>
        
        <div className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                redditAuthStatus.authenticated ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="font-medium">
                  {redditAuthStatus.authenticated ? 'Connected' : 'Not Connected'}
                </p>
                {redditAuthStatus.user && (
                  <p className="text-sm text-gray-600">
                    Reddit User: {redditAuthStatus.user}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              {redditAuthStatus.authenticated ? (
                <>
                  <button
                    onClick={checkRedditAuth}
                    disabled={loading}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    {loading ? '🔄' : '🔄'} Refresh
                  </button>
                  <button
                    onClick={disconnectReddit}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '🔄' : '🔌'} Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={startRedditAuth}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? '🔄 Connecting...' : '🔗 Connect Reddit'}
                </button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">📋 Setup Instructions:</h5>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Create a Reddit app at <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="underline">reddit.com/prefs/apps</a></li>
              <li>Set the redirect URI to: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/auth/reddit/callback</code></li>
              <li>Copy your Client ID and configure it in the system</li>
              <li>Click "Connect Reddit" to authenticate</li>
            </ol>
          </div>

          {/* Permissions Info */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">🔐 Required Permissions:</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• <strong>identity</strong> - Access your Reddit username</li>
              <li>• <strong>read</strong> - Read posts and comments</li>
              <li>• <strong>submit</strong> - Post comments and replies</li>
              <li>• <strong>vote</strong> - Upvote and downvote posts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reddit Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">⚙️ Reddit Configuration</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Subreddits
            </label>
            <textarea
              placeholder="technology, programming, webdev"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list of default subreddits</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Keywords
            </label>
            <textarea
              placeholder="AI, automation, startup"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list of default keywords</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit (minutes)
            </label>
            <input
              type="number"
              defaultValue={3}
              min={1}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum time between posts</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Posts Per Session
            </label>
            <input
              type="number"
              defaultValue={20}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum posts to fetch per session</p>
          </div>
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            💾 Save Configuration
          </button>
        </div>
      </div>

      {/* Reddit Accounts Management Table */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">🔗 Reddit Accounts</h4>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mr-3"
          >
            {loading ? '🔄 Loading...' : '⚙️ Manual Setup'}
          </button>
          <button
            onClick={startRedditOAuth}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? '🔄 Connecting...' : '🔗 Connect with OAuth'}
          </button>
          <button
            onClick={testAccessToken}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 Testing...' : '🧪 Test Token'}
          </button>
        </div>

        {/* Add Account Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 mb-4">
            <h4 className="text-lg font-semibold mb-4">⚙️ Manual Reddit App Setup</h4>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h5 className="font-medium text-blue-900 mb-2">📋 Setup Instructions:</h5>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" className="underline">Reddit App Preferences</a></li>
                <li>Click "Create App" or "Create Another App"</li>
                <li>Choose "web app" as the app type</li>
                <li>Set redirect URI to: <code className="bg-blue-100 px-1 rounded">{window.location.origin}</code></li>
                <li>Copy the Client ID and Secret below</li>
                <li>After saving, use "🔗 Connect with OAuth" for full authentication</li>
              </ol>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reddit Username (optional)
                </label>
                <input
                  type="text"
                  value={newAccount.username}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your_reddit_username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID *
                </label>
                <input
                  type="text"
                  value={newAccount.client_id}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, client_id: e.target.value }))}
                  placeholder="Your Reddit app client ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret *
                </label>
                <input
                  type="password"
                  value={newAccount.client_secret}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, client_secret: e.target.value }))}
                  placeholder="Your Reddit app client secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redirect URI
                </label>
                <input
                  type="url"
                  value={newAccount.redirect_uri}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, redirect_uri: e.target.value }))}
                  placeholder="https://yoursite.com/auth/reddit/callback"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addRedditAccount}
                disabled={loading || !newAccount.client_id || !newAccount.client_secret}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? '🔄 Adding...' : '➕ Add Account'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-2"></div>
                        Loading Reddit accounts...
                      </div>
                    </td>
                  </tr>
                ) : redditAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="text-4xl mb-2">🔗</div>
                      <p className="text-lg font-medium mb-2">No Reddit Accounts Connected</p>
                      <p className="text-sm">Add your first Reddit account to get started with automation.</p>
                    </td>
                  </tr>
                ) : (
                redditAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          u/{account.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {account.client_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : account.status === 'configured'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {account.status === 'active' ? '✅ Active' : 
                         account.status === 'configured' ? '🔧 Configured' : 
                         '⚠️ Incomplete'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.last_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.api_calls_today}/1000 calls
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.rate_limit_remaining} remaining
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => checkRedditAuth()}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        🧪 Test
                      </button>
                      <button
                        onClick={() => setMessage('🔄 Refreshing token...')}
                        className="text-green-600 hover:text-green-900"
                      >
                        🔄 Refresh
                      </button>
                      <button
                        onClick={() => disconnectReddit()}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>

          {redditAccounts.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔗</div>
              <p className="text-lg font-medium mb-2">No Reddit Accounts Connected</p>
              <p className="text-sm">Click "Add New Account" to connect your first Reddit account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RedditSettings;