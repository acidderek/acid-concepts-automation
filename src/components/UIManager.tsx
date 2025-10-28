import React, { useState, useEffect } from 'react';
import SocialManager from './SocialManager';
import CampaignManager from './CampaignManager';
import CompanyManager from './CompanyManager';
import AnalyticsManager from './AnalyticsManager';
import SettingsManager from './SettingsManager';
import { supabase } from '@/integrations/supabase/client';

// ACID Logo Component (restored from backup)
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

interface UIManagerProps {
  user: any;
  message: string;
  setMessage: (message: string) => void;
  onSignOut: () => void;
}

const UIManager: React.FC<UIManagerProps> = ({ user, message, setMessage, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle Reddit OAuth callback on main page
  useEffect(() => {
    const handleRedditOAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        setMessage('🔄 Processing Reddit authentication...');
        
        try {
          // Verify state parameter
          const storedState = localStorage.getItem('reddit_oauth_state');
          if (state !== storedState) {
            setMessage('❌ Invalid state parameter');
            return;
          }

          // Parse state to get user_id
          const stateData = JSON.parse(atob(state));
          const userId = stateData.user_id;

          // Get user's Reddit app credentials
          const { data: credentials, error: credError } = await supabase
            .from('user_api_keys')
            .select('*')
            .eq('user_id', userId)
            .in('service', ['reddit_client_id', 'reddit_client_secret'])
            .eq('status', 'active');

          if (credError || !credentials || credentials.length < 2) {
            setMessage('❌ Reddit app credentials not found');
            return;
          }

          const creds: any = {};
          credentials.forEach(item => {
            creds[item.service] = item.key_value;
          });

          // Exchange authorization code for access token
          const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${creds.reddit_client_id}:${creds.reddit_client_secret}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'CampaignBot/1.0'
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: window.location.origin
            })
          });

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            setMessage(`❌ Failed to get access token: ${tokenResponse.status}`);
            return;
          }

          const tokenData = await tokenResponse.json();

          if (!tokenData.access_token) {
            setMessage('❌ No access token received from Reddit');
            return;
          }

          // Get Reddit user info
          const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'User-Agent': 'CampaignBot/1.0'
            }
          });

          let redditUsername = 'Unknown';
          if (userResponse.ok) {
            const userData = await userResponse.json();
            redditUsername = userData.name;
          }

          // Save Reddit credentials
          const credentialsToSave = [
            {
              user_id: userId,
              service: 'reddit_access_token',
              key_name: 'Reddit Access Token',
              key_value: tokenData.access_token,
              status: 'active'
            },
            {
              user_id: userId,
              service: 'reddit_username',
              key_name: 'Reddit Username',
              key_value: redditUsername,
              status: 'active'
            }
          ];

          if (tokenData.refresh_token) {
            credentialsToSave.push({
              user_id: userId,
              service: 'reddit_refresh_token',
              key_name: 'Reddit Refresh Token',
              key_value: tokenData.refresh_token,
              status: 'active'
            });
          }

          // Delete existing tokens first
          await supabase
            .from('user_api_keys')
            .delete()
            .eq('user_id', userId)
            .in('service', ['reddit_access_token', 'reddit_refresh_token', 'reddit_username']);

          // Insert new tokens
          const { error: saveError } = await supabase
            .from('user_api_keys')
            .insert(credentialsToSave);

          if (saveError) {
            console.error('Error saving Reddit tokens:', saveError);
            setMessage('❌ Failed to save Reddit authentication');
            return;
          }

          // Clean up
          localStorage.removeItem('reddit_oauth_state');
          
          // Remove OAuth parameters from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          setMessage('✅ Reddit authentication successful!');

        } catch (error) {
          console.error('Reddit OAuth error:', error);
          setMessage(`❌ Error processing Reddit authorization: ${error.message}`);
        }
      }
    };

    handleRedditOAuth();
  }, [setMessage]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      
      case 'campaigns':
        return <CampaignManager user={user} setMessage={setMessage} />;
      
      case 'social':
        return <SocialManager user={user} setMessage={setMessage} />;
      
      case 'companies':
        return <CompanyManager user={user} setMessage={setMessage} />;
      
      case 'analytics':
        return <AnalyticsManager user={user} setMessage={setMessage} />;
      
      case 'settings':
        return <SettingsManager user={user} setMessage={setMessage} />;
      
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <LogoComponent size="small" />
              <h1 className="text-xl font-bold text-gray-900">
                Professional Automation Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={onSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: '📊' },
              { key: 'campaigns', label: 'Campaigns', icon: '🎯' },
              { key: 'social', label: 'Social Tools', icon: '🔧' },
              { key: 'companies', label: 'Companies', icon: '🏢' },
              { key: 'analytics', label: 'Analytics', icon: '📈' },
              { key: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Status Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-800 text-sm">{message}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

// Dashboard Component
const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Campaigns</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 mt-1">No active campaigns</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Executions</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-600 mt-1">Ready to start</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Rate</h3>
          <p className="text-3xl font-bold text-purple-600">--</p>
          <p className="text-sm text-gray-600 mt-1">No data yet</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🚀 Multi-Platform Social Media Automation
        </h3>
        <p className="text-gray-600 mb-6">
          Automate your engagement across Reddit, Instagram, Facebook, LinkedIn, Quora, and more 
          with intelligent responses and monitoring.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { name: 'Reddit', color: 'bg-orange-100 text-orange-800' },
            { name: 'Instagram', color: 'bg-pink-100 text-pink-800' },
            { name: 'LinkedIn', color: 'bg-blue-100 text-blue-800' },
            { name: 'Facebook', color: 'bg-blue-100 text-blue-800' }
          ].map((platform) => (
            <div key={platform.name} className={`p-3 rounded-lg ${platform.color} text-center`}>
              <span className="font-medium">{platform.name}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800">Key Features:</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Multi-platform monitoring
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Smart keyword targeting
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              AI-powered responses
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Cross-platform analytics
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UIManager;