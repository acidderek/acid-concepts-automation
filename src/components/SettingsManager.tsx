import React, { useState } from 'react';
import RedditSettings from './settings/RedditSettings';
import AISettings from './settings/AISettings';
import SocialSettings from './settings/SocialSettings';
import CampaignSettings from './settings/CampaignSettings';
import APIKeySettings from './settings/APIKeySettings';
import DocumentSettings from './settings/DocumentSettings';

interface SettingsManagerProps {
  user: any;
  setMessage: (message: string) => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ user, setMessage }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('reddit');

  const settingsTabs = [
    { key: 'reddit', label: 'Reddit OAuth', icon: '🔴', description: 'Reddit API authentication' },
    { key: 'ai', label: 'AI Settings', icon: '🤖', description: 'AI models and prompts' },
    { key: 'social', label: 'Social Platforms', icon: '📱', description: 'Instagram, Facebook, LinkedIn, Twitter' },
    { key: 'campaigns', label: 'Campaign Rules', icon: '⚙️', description: 'Monitoring and engagement rules' },
    { key: 'apikeys', label: 'API Keys', icon: '🔑', description: 'Third-party service keys' },
    { key: 'documents', label: 'Documents', icon: '📄', description: 'Upload business context' }
  ];

  const renderSettingsContent = () => {
    switch (activeSettingsTab) {
      case 'reddit':
        return <RedditSettings user={user} setMessage={setMessage} />;
      case 'ai':
        return <AISettings user={user} setMessage={setMessage} />;
      case 'social':
        return <SocialSettings user={user} setMessage={setMessage} />;
      case 'campaigns':
        return <CampaignSettings user={user} setMessage={setMessage} />;
      case 'apikeys':
        return <APIKeySettings user={user} setMessage={setMessage} />;
      case 'documents':
        return <DocumentSettings user={user} setMessage={setMessage} />;
      default:
        return <RedditSettings user={user} setMessage={setMessage} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">⚙️ Platform Settings</h2>
        <p className="text-gray-600">
          Configure authentication, AI models, campaign rules, and platform integrations.
        </p>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Settings">
            {settingsTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSettingsTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeSettingsTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="p-6">
          {/* Tab Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {settingsTabs.find(tab => tab.key === activeSettingsTab)?.label}
            </h3>
            <p className="text-gray-600">
              {settingsTabs.find(tab => tab.key === activeSettingsTab)?.description}
            </p>
          </div>

          {/* Settings Component */}
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;