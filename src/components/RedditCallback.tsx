import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const RedditCallback: React.FC = () => {
  const { user } = useAuth();

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

        // Get stored OAuth data
        const storedData = sessionStorage.getItem('reddit_oauth_data');
        if (!storedData) {
          throw new Error('OAuth session data not found');
        }

        const oauthData = JSON.parse(storedData);
        
        if (oauthData.state !== state) {
          throw new Error('Invalid state parameter');
        }

        // Exchange code for tokens
        const { data, error: exchangeError } = await supabase.functions.invoke('reddit_auth_2025_10_24_09_00', {
          body: {
            action: 'exchange_code',
            code: code,
            client_id: oauthData.client_id,
            client_secret: oauthData.client_secret,
            redirect_uri: oauthData.redirect_uri,
            account_name: oauthData.account_name
          }
        });

        if (exchangeError) throw exchangeError;

        if (data.success) {
          toast({
            title: 'Success',
            description: `Reddit account "${data.reddit_user.name}" connected successfully!`,
          });

          // Clean up session storage
          sessionStorage.removeItem('reddit_oauth_data');

          // Close popup and refresh parent
          if (window.opener) {
            window.opener.location.reload();
            window.close();
          } else {
            // If not in popup, redirect to main app
            window.location.href = '/';
          }
        } else {
          throw new Error('Failed to exchange authorization code');
        }

      } catch (error: any) {
        console.error('Reddit OAuth callback error:', error);
        toast({
          title: 'OAuth Error',
          description: error.message,
          variant: 'destructive',
        });

        // Close popup or redirect
        if (window.opener) {
          window.close();
        } else {
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Reddit Authorization</h2>
        <p className="text-gray-600">Please wait while we complete the connection...</p>
      </div>
    </div>
  );
};