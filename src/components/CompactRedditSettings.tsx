import React, { useState, useEffect } from 'react';
import { supabase } from './integrations/supabase/client';

const CompactRedditSettings = ({ 
  redditClientId, 
  setRedditClientId,
  redditClientSecret, 
  setRedditClientSecret,
  redditAuthStatus,
  startRedditAuth,
  checkDatabase,
  handleSaveRedditSettings,
  setMessage 
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Reddit API Configuration</h3>
      
      {/* Compact Status Bar */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-4">
        <div className="flex items-center space-x-3">
          <span className={`w-3 h-3 rounded-full ${redditAuthStatus.authenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm font-medium">
            {redditAuthStatus.authenticated ? '✅ Connected' : '❌ Not Connected'}
          </span>
          {redditAuthStatus.authenticated && redditAuthStatus.reddit_user && (
            <span className="text-sm text-gray-600">
              @{redditAuthStatus.reddit_user.username}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {!redditAuthStatus.authenticated && (
            <button
              onClick={startRedditAuth}
              className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
              disabled={!redditClientId || !redditClientSecret}
            >
              Connect
            </button>
          )}
          <button
            onClick={checkDatabase}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Check DB
          </button>
        </div>
      </div>

      {/* Compact Credentials Form */}
      <form onSubmit={handleSaveRedditSettings} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input
              type="text"
              value={redditClientId}
              onChange={(e) => setRedditClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reddit app client ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={redditClientSecret}
              onChange={(e) => setRedditClientSecret(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reddit app client secret"
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium"
            >
              Save Credentials
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <strong>Callback URL:</strong> {window.location.origin}/auth/reddit/callback
        </div>
      </form>

      {/* Setup Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <strong>Setup:</strong> 1. Go to reddit.com/prefs/apps 2. Create "web app" 3. Use callback URL above 4. Copy Client ID & Secret
      </div>
    </div>
  );
};

export default CompactRedditSettings;