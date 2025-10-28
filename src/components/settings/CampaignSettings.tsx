import React, { useState } from 'react';

interface CampaignSettingsProps {
  user: any;
  setMessage: (message: string) => void;
}

const CampaignSettings: React.FC<CampaignSettingsProps> = ({ user, setMessage }) => {
  const [monitoringRules, setMonitoringRules] = useState({
    minUpvotes: 10,
    maxAge: 24,
    excludeKeywords: '',
    includeKeywords: '',
    minComments: 5,
    maxComments: 100,
    authorKarma: 100
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

  const saveSettings = () => {
    setMessage('✅ Campaign settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Monitoring Rules */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">🔍 Content Monitoring Rules</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Upvotes
            </label>
            <input
              type="number"
              value={monitoringRules.minUpvotes}
              onChange={(e) => setMonitoringRules(prev => ({ ...prev, minUpvotes: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Post Age (hours)
            </label>
            <input
              type="number"
              value={monitoringRules.maxAge}
              onChange={(e) => setMonitoringRules(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exclude Keywords
            </label>
            <input
              type="text"
              value={monitoringRules.excludeKeywords}
              onChange={(e) => setMonitoringRules(prev => ({ ...prev, excludeKeywords: e.target.value }))}
              placeholder="spam, scam, fake"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include Keywords
            </label>
            <input
              type="text"
              value={monitoringRules.includeKeywords}
              onChange={(e) => setMonitoringRules(prev => ({ ...prev, includeKeywords: e.target.value }))}
              placeholder="AI, automation, startup"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Schedule Settings */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold mb-4">📅 Schedule Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={scheduleSettings.timezone}
              onChange={(e) => setScheduleSettings(prev => ({ ...prev, timezone: e.target.value }))}
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
              Posts Per Hour
            </label>
            <input
              type="number"
              value={scheduleSettings.postsPerHour}
              onChange={(e) => setScheduleSettings(prev => ({ ...prev, postsPerHour: parseInt(e.target.value) }))}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active Hours
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={scheduleSettings.activeHours.start}
                onChange={(e) => setScheduleSettings(prev => ({ 
                  ...prev, 
                  activeHours: { ...prev.activeHours, start: parseInt(e.target.value) }
                }))}
                min="0"
                max="23"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="py-2">to</span>
              <input
                type="number"
                value={scheduleSettings.activeHours.end}
                onChange={(e) => setScheduleSettings(prev => ({ 
                  ...prev, 
                  activeHours: { ...prev.activeHours, end: parseInt(e.target.value) }
                }))}
                min="0"
                max="23"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              value={scheduleSettings.batchSize}
              onChange={(e) => setScheduleSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
              min="1"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Active Days
          </label>
          <div className="flex flex-wrap gap-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <label key={day} className="flex items-center">
                <input
                  type="checkbox"
                  checked={scheduleSettings.activeDays.includes(day)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setScheduleSettings(prev => ({ 
                        ...prev, 
                        activeDays: [...prev.activeDays, day]
                      }));
                    } else {
                      setScheduleSettings(prev => ({ 
                        ...prev, 
                        activeDays: prev.activeDays.filter(d => d !== day)
                      }));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm capitalize">{day}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          💾 Save Campaign Settings
        </button>
      </div>
    </div>
  );
};

export default CampaignSettings;