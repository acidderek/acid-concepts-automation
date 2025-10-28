import React, { useState } from 'react';

interface AISettingsProps {
  user: any;
  setMessage: (message: string) => void;
}

const AISettings: React.FC<AISettingsProps> = ({ user, setMessage }) => {
  const [aiSettings, setAiSettings] = useState({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 150,
    systemPrompt: 'You are a helpful community member providing valuable insights.',
    contextAnalysis: true,
    sentimentCheck: true,
    duplicateCheck: true
  });

  const [engagementRules, setEngagementRules] = useState({
    responseStyle: 'helpful',
    maxResponseLength: 200,
    includeEmojis: false,
    includeQuestions: true,
    avoidControversy: true,
    personalityTone: 'professional'
  });

  const handleAiSettingsChange = (key: string, value: any) => {
    setAiSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleEngagementRulesChange = (key: string, value: any) => {
    setEngagementRules(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    setMessage('✅ AI settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* AI Model Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">🤖 AI Model Configuration</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={aiSettings.model}
              onChange={(e) => handleAiSettingsChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cost-effective)</option>
              <option value="gpt-4">GPT-4 (High Quality)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (Balanced)</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature ({aiSettings.temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={aiSettings.temperature}
              onChange={(e) => handleAiSettingsChange('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Response Length
            </label>
            <input
              type="number"
              value={aiSettings.maxTokens}
              onChange={(e) => handleAiSettingsChange('maxTokens', parseInt(e.target.value))}
              min="50"
              max="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Tokens (roughly 4 characters per token)</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              AI Features
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={aiSettings.contextAnalysis}
                  onChange={(e) => handleAiSettingsChange('contextAnalysis', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Context Analysis</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={aiSettings.sentimentCheck}
                  onChange={(e) => handleAiSettingsChange('sentimentCheck', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Sentiment Check</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={aiSettings.duplicateCheck}
                  onChange={(e) => handleAiSettingsChange('duplicateCheck', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Duplicate Detection</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">📝 System Prompt</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base System Prompt
            </label>
            <textarea
              value={aiSettings.systemPrompt}
              onChange={(e) => handleAiSettingsChange('systemPrompt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Define how the AI should behave and respond..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleAiSettingsChange('systemPrompt', 'You are a helpful community member providing valuable insights and engaging in meaningful discussions.')}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              📚 Helpful Expert
            </button>
            <button
              onClick={() => handleAiSettingsChange('systemPrompt', 'You are a professional consultant sharing industry knowledge and best practices.')}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              💼 Professional
            </button>
            <button
              onClick={() => handleAiSettingsChange('systemPrompt', 'You are a friendly community member who asks thoughtful questions and encourages discussion.')}
              className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              🤝 Community Builder
            </button>
          </div>
        </div>
      </div>

      {/* Response Style Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">🎨 Response Style</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Style
            </label>
            <select
              value={engagementRules.responseStyle}
              onChange={(e) => handleEngagementRulesChange('responseStyle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="helpful">Helpful & Informative</option>
              <option value="promotional">Promotional (Subtle)</option>
              <option value="neutral">Neutral & Objective</option>
              <option value="expert">Expert & Authoritative</option>
              <option value="casual">Casual & Friendly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personality Tone
            </label>
            <select
              value={engagementRules.personalityTone}
              onChange={(e) => handleEngagementRulesChange('personalityTone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="authoritative">Authoritative</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Response Length (characters)
            </label>
            <input
              type="number"
              value={engagementRules.maxResponseLength}
              onChange={(e) => handleEngagementRulesChange('maxResponseLength', parseInt(e.target.value))}
              min="50"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Response Features
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={engagementRules.includeEmojis}
                  onChange={(e) => handleEngagementRulesChange('includeEmojis', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include Emojis</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={engagementRules.includeQuestions}
                  onChange={(e) => handleEngagementRulesChange('includeQuestions', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Ask Follow-up Questions</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={engagementRules.avoidControversy}
                  onChange={(e) => handleEngagementRulesChange('avoidControversy', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Avoid Controversial Topics</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          💾 Save AI Settings
        </button>
      </div>
    </div>
  );
};

export default AISettings;