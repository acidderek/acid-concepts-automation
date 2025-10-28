import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';

const RedditCallback: React.FC = () => {
  const [status, setStatus] = useState('🔄 Processing Reddit authorization...');
  const navigate = useNavigate();

  useEffect(() => {
    handleRedditCallback();
  }, []);

  const handleRedditCallback = async () => {
    console.log('🔄 Starting Reddit OAuth callback process...');
    console.log('Current URL:', window.location.href);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      console.log('OAuth parameters:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', error });

      if (error) {
        setStatus(`❌ Reddit authorization failed: ${error}`);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code || !state) {
        setStatus('❌ Missing authorization code or state parameter');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Verify state parameter
      const storedState = localStorage.getItem('reddit_oauth_state');
      if (state !== storedState) {
        setStatus('❌ Invalid state parameter - possible CSRF attack');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Parse state to get user_id
      const stateData = JSON.parse(atob(state));
      const userId = stateData.user_id;
      console.log('Extracted user ID from state:', userId);

      setStatus('🔄 Exchanging authorization code for access token...');

      // Get user's Reddit app credentials
      const { data: credentials, error: credError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)
        .in('service', ['reddit_client_id', 'reddit_client_secret'])
        .eq('status', 'active');

      if (credError || !credentials || credentials.length < 2) {
        setStatus('❌ Reddit app credentials not found');
        setTimeout(() => navigate('/settings'), 3000);
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
          redirect_uri: `${window.location.origin}`
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        setStatus(`❌ Failed to get access token: ${tokenResponse.status} ${errorText}`);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      const tokenData = await tokenResponse.json();
      console.log('Token response from Reddit:', { 
        access_token: tokenData.access_token ? 'present' : 'missing',
        refresh_token: tokenData.refresh_token ? 'present' : 'missing',
        expires_in: tokenData.expires_in 
      });

      if (!tokenData.access_token) {
        setStatus('❌ No access token received from Reddit');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      setStatus('🔄 Getting Reddit user info...');

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

      setStatus('🔄 Saving Reddit authentication...');

      // Save/update Reddit credentials with OAuth tokens
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

      console.log('Database save result:', { saveError, credentialsCount: credentialsToSave.length });

      if (saveError) {
        console.error('Error saving Reddit tokens:', saveError);
        setStatus('❌ Failed to save Reddit authentication');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Clean up
      localStorage.removeItem('reddit_oauth_state');

      setStatus('✅ Reddit authentication successful! Redirecting...');
      setTimeout(() => navigate('/settings'), 2000);

    } catch (error) {
      console.error('Reddit callback error:', error);
      setStatus(`❌ Error processing Reddit authorization: ${error.message}`);
      setTimeout(() => navigate('/settings'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Reddit Authentication
          </h2>
          <p className="text-gray-600 mb-6">
            {status}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default RedditCallback;