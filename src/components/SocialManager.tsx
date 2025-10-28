import React, { useState } from 'react';
import Reddit from './social/Reddit';
import Instagram from './social/Instagram';
import LinkedIn from './social/LinkedIn';
import Facebook from './social/Facebook';

interface SocialManagerProps {
  user: any;
  setMessage: (message: string) => void;
}

const SocialManager: React.FC<SocialManagerProps> = ({ user, setMessage }) => {
  const [activePlatform, setActivePlatform] = useState('reddit');

  const platforms = [
    { key: 'reddit', name: 'Reddit', icon: '🔴', color: 'bg-orange-100 text-orange-700' },
    { key: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-100 text-pink-700' },
    { key: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-100 text-blue-700' },
    { key: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-700' }
  ];

  const renderPlatformContent = () => {
    switch (activePlatform) {
      case 'reddit':
        return <Reddit user={user} setMessage={setMessage} />;
      case 'instagram':
        return <Instagram user={user} setMessage={setMessage} />;
      case 'linkedin':
        return <LinkedIn user={user} setMessage={setMessage} />;
      case 'facebook':
        return <Facebook user={user} setMessage={setMessage} />;
      default:
        return <Reddit user={user} setMessage={setMessage} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 Social Media Tools</h2>
        <p className="text-gray-600 mb-6">
          Manage and automate your engagement across different social media platforms.
        </p>
        
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
      </div>

      {/* Platform Content */}
      <div className="bg-white rounded-lg shadow">
        {renderPlatformContent()}
      </div>
    </div>
  );
};

export default SocialManager;