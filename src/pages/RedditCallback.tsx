import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RedditCallback: React.FC = () => {
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`Reddit OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        setStatus('Exchanging authorization code...');

        // Get user from parent window or localStorage
        const userStr = localStorage.getItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
        if (!userStr) {
          throw new Error('User not authenticated');
        }

        const authData = JSON.parse(userStr);
        const userId = authData.user?.id;

        if (!userId) {
          throw new Error('User ID not found');
        }

        // Call Edge Function to handle callback
        const { data, error: callbackError } = await supabase.functions.invoke('simple_reddit_oauth_2025_10_26_16_00', {
          body: {
            action: 'handle_callback',
            user_id: userId,
            code: code,
            state: state,
            redirect_uri: window.location.origin + '/auth/reddit/callback'
          }
        });

        if (callbackError) throw callbackError;

        if (data.success) {
          setStatus('✅ Reddit account connected successfully!');
          
          // Send success message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'REDDIT_OAUTH_SUCCESS',
              data: data.reddit_user
            }, window.location.origin);
          }

          // Close popup after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          throw new Error(data.error || 'Unknown error occurred');
        }

      } catch (error) {
        console.error('Reddit callback error:', error);
        setStatus(`❌ Error: ${error.message}`);
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'REDDIT_OAUTH_ERROR',
            error: error.message
          }, window.location.origin);
        }

        // Close popup after 3 seconds
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reddit Authentication</h2>
          <p className="text-gray-600 mb-4">{status}</p>
          {status.includes('✅') && (
            <p className="text-sm text-gray-500">This window will close automatically...</p>
          )}
          {status.includes('❌') && (
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RedditCallback;