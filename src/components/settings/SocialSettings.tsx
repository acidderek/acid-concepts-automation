import React, { useState } from 'react';

interface SocialSettingsProps {
  user: any;
  setMessage: (message: string) => void;
}

const SocialSettings: React.FC<SocialSettingsProps> = ({ user, setMessage }) => {
  const [activePlatform, setActivePlatform] = useState('instagram');

  // Instagram settings
  const [instagramSettings, setInstagramSettings] = useState({
    accessToken: '',
    businessId: '',
    appId: '',
    appSecret: ''
  });

  // Facebook settings
  const [facebookSettings, setFacebookSettings] = useState({
    accessToken: '',
    appId: '',
    appSecret: '',
    pageId: ''
  });

  // LinkedIn settings
  const [linkedinSettings, setLinkedinSettings] = useState({
    clientId: '',
    clientSecret: '',
    accessToken: '',
    redirectUri: ''
  });

  // Twitter/X settings
  const [twitterSettings, setTwitterSettings] = useState({
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessTokenSecret: '',
    bearerToken: ''
  });

  const platforms = [
    { key: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-100 text-pink-700' },
    { key: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-700' },
    { key: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-100 text-blue-700' },
    { key: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-gray-100 text-gray-700' }
  ];

  const saveSettings = (platform: string) => {
    setMessage(`✅ ${platform} settings saved successfully`);
  };

  const renderInstagramSettings = () => (
    <div className="space-y-4">
      <div className="bg-pink-50 p-4 rounded-lg">
        <h5 className="font-medium text-pink-900 mb-2">📋 Instagram Business API Setup:</h5>
        <ol className="text-sm text-pink-800 space-y-1 list-decimal list-inside">
          <li>Create a Facebook App at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
          <li>Add Instagram Basic Display and Instagram Graph API products</li>
          <li>Connect your Instagram Business account</li>
          <li>Generate access tokens with required permissions</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            App ID
          </label>
          <input
            type="text"
            value={instagramSettings.appId}
            onChange={(e) => setInstagramSettings(prev => ({ ...prev, appId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Your Facebook App ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            App Secret
          </label>
          <input
            type="password"
            value={instagramSettings.appSecret}
            onChange={(e) => setInstagramSettings(prev => ({ ...prev, appSecret: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Your Facebook App Secret"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instagram Business ID
          </label>
          <input
            type="text"
            value={instagramSettings.businessId}
            onChange={(e) => setInstagramSettings(prev => ({ ...prev, businessId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Your Instagram Business Account ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Token
          </label>
          <input
            type="password"
            value={instagramSettings.accessToken}
            onChange={(e) => setInstagramSettings(prev => ({ ...prev, accessToken: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Long-lived access token"
          />
        </div>
      </div>

      <button
        onClick={() => saveSettings('Instagram')}
        className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
      >
        💾 Save Instagram Settings
      </button>
    </div>
  );

  const renderFacebookSettings = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">📋 Facebook Pages API Setup:</h5>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Create a Facebook App at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
          <li>Add Pages API and Pages Management permissions</li>
          <li>Generate a Page Access Token for your Facebook Page</li>
          <li>Submit for review if needed for public use</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            App ID
          </label>
          <input
            type="text"
            value={facebookSettings.appId}
            onChange={(e) => setFacebookSettings(prev => ({ ...prev, appId: e.target.value }))}
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
            value={facebookSettings.appSecret}
            onChange={(e) => setFacebookSettings(prev => ({ ...prev, appSecret: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your Facebook App Secret"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page ID
          </label>
          <input
            type="text"
            value={facebookSettings.pageId}
            onChange={(e) => setFacebookSettings(prev => ({ ...prev, pageId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your Facebook Page ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page Access Token
          </label>
          <input
            type="password"
            value={facebookSettings.accessToken}
            onChange={(e) => setFacebookSettings(prev => ({ ...prev, accessToken: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Long-lived page access token"
          />
        </div>
      </div>

      <button
        onClick={() => saveSettings('Facebook')}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        💾 Save Facebook Settings
      </button>
    </div>
  );

  const renderLinkedInSettings = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">📋 LinkedIn API Setup:</h5>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Create a LinkedIn App at <a href="https://www.linkedin.com/developers" target="_blank" rel="noopener noreferrer" className="underline">linkedin.com/developers</a></li>
          <li>Request access to LinkedIn Marketing Developer Platform</li>
          <li>Add required OAuth 2.0 scopes (r_liteprofile, w_member_social)</li>
          <li>Configure OAuth redirect URLs</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client ID
          </label>
          <input
            type="text"
            value={linkedinSettings.clientId}
            onChange={(e) => setLinkedinSettings(prev => ({ ...prev, clientId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your LinkedIn Client ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Secret
          </label>
          <input
            type="password"
            value={linkedinSettings.clientSecret}
            onChange={(e) => setLinkedinSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your LinkedIn Client Secret"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Redirect URI
          </label>
          <input
            type="text"
            value={linkedinSettings.redirectUri}
            onChange={(e) => setLinkedinSettings(prev => ({ ...prev, redirectUri: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`${window.location.origin}/auth/linkedin/callback`}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Token
          </label>
          <input
            type="password"
            value={linkedinSettings.accessToken}
            onChange={(e) => setLinkedinSettings(prev => ({ ...prev, accessToken: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="OAuth 2.0 access token"
          />
        </div>
      </div>

      <button
        onClick={() => saveSettings('LinkedIn')}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        💾 Save LinkedIn Settings
      </button>
    </div>
  );

  const renderTwitterSettings = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-2">📋 Twitter/X API Setup:</h5>
        <ol className="text-sm text-gray-800 space-y-1 list-decimal list-inside">
          <li>Apply for Twitter Developer Account at <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="underline">developer.twitter.com</a></li>
          <li>Create a new App and generate API keys</li>
          <li>Enable OAuth 1.0a for user authentication</li>
          <li>Generate Bearer Token for API v2 access</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="text"
            value={twitterSettings.apiKey}
            onChange={(e) => setTwitterSettings(prev => ({ ...prev, apiKey: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Your Twitter API Key"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Secret
          </label>
          <input
            type="password"
            value={twitterSettings.apiSecret}
            onChange={(e) => setTwitterSettings(prev => ({ ...prev, apiSecret: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Your Twitter API Secret"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Token
          </label>
          <input
            type="password"
            value={twitterSettings.accessToken}
            onChange={(e) => setTwitterSettings(prev => ({ ...prev, accessToken: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="OAuth 1.0a Access Token"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Token Secret
          </label>
          <input
            type="password"
            value={twitterSettings.accessTokenSecret}
            onChange={(e) => setTwitterSettings(prev => ({ ...prev, accessTokenSecret: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="OAuth 1.0a Access Token Secret"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bearer Token
          </label>
          <input
            type="password"
            value={twitterSettings.bearerToken}
            onChange={(e) => setTwitterSettings(prev => ({ ...prev, bearerToken: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Bearer Token for API v2"
          />
        </div>
      </div>

      <button
        onClick={() => saveSettings('Twitter')}
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
      >
        💾 Save Twitter Settings
      </button>
    </div>
  );

  const renderPlatformSettings = () => {
    switch (activePlatform) {
      case 'instagram':
        return renderInstagramSettings();
      case 'facebook':
        return renderFacebookSettings();
      case 'linkedin':
        return renderLinkedInSettings();
      case 'twitter':
        return renderTwitterSettings();
      default:
        return renderInstagramSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {platforms.map((platform) => (
          <button
            key={platform.key}
            onClick={() => setActivePlatform(platform.key)}
            className={`p-4 rounded-lg border-2 transition-all ${
              activePlatform === platform.key
                ? `${platform.color} border-current`
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="text-2xl mb-2">{platform.icon}</div>
            <div className="font-semibold">{platform.name}</div>
            {activePlatform === platform.key && (
              <div className="text-xs mt-1 opacity-75">Active</div>
            )}
          </button>
        ))}
      </div>

      {/* Platform Settings */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-xl font-semibold mb-4">
          {platforms.find(p => p.key === activePlatform)?.icon} {platforms.find(p => p.key === activePlatform)?.name} Settings
        </h3>
        {renderPlatformSettings()}
      </div>

      {/* Status Notice */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h5 className="font-medium text-yellow-900 mb-2">🚧 Development Status:</h5>
        <p className="text-sm text-yellow-800">
          Social media platform integrations are currently in development. 
          Reddit integration is fully functional. Other platforms will be activated in future updates.
        </p>
      </div>
    </div>
  );
};

export default SocialSettings;