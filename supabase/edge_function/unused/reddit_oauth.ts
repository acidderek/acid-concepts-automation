import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Fixed Reddit OAuth - Request:', JSON.stringify(requestBody, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, redirect_uri, code, state } = requestBody;

    if (!user_id) {
      throw new Error('User ID is required');
    }

    switch (action) {
      case 'get_status': {
        console.log('Checking Reddit auth status for user:', user_id);
        
        // Check for valid Reddit token in FIXED table
        const { data: tokens, error: tokenError } = await supabaseClient
          .from('reddit_tokens')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (tokenError) {
          console.error('Token check error:', tokenError);
          return new Response(JSON.stringify({
            success: true,
            authenticated: false,
            user: null,
            tokenExpired: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!tokens || tokens.length === 0) {
          return new Response(JSON.stringify({
            success: true,
            authenticated: false,
            user: null,
            tokenExpired: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const token = tokens[0];
        const now = new Date();
        const expiresAt = new Date(token.expires_at);
        const isExpired = now >= expiresAt;

        if (isExpired) {
          return new Response(JSON.stringify({
            success: true,
            authenticated: false,
            user: null,
            tokenExpired: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Test the token with Reddit API
        try {
          const testResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `Bearer ${token.access_token}`,
              'User-Agent': 'RedditAutomation/1.0'
            }
          });

          console.log('DEBUG: Reddit API test response status:', testResponse.status);
          
          if (testResponse.ok) {
            const userData = await testResponse.json();
            console.log('DEBUG: Reddit API test successful, user:', userData.name);
            
            return new Response(JSON.stringify({
              success: true,
              authenticated: true,
              user: {
                username: userData.name || token.reddit_username,
                expires_at: token.expires_at
              },
              tokenExpired: false
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            return new Response(JSON.stringify({
              success: true,
              authenticated: false,
              user: null,
              tokenExpired: true
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (apiError) {
          console.error('Reddit API test error:', apiError);
          return new Response(JSON.stringify({
            success: true,
            authenticated: false,
            user: null,
            tokenExpired: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'start_auth': {
        console.log('Starting Reddit OAuth for user:', user_id);
        
        if (!redirect_uri) {
          throw new Error('Redirect URI is required');
        }

        // Get Reddit API keys from FIXED table
        const { data: apiKeys, error: keyError } = await supabaseClient
          .from('api_keys')
          .select('key_type, key_value')
          .eq('user_id', user_id)
          .eq('platform', 'reddit');

        if (keyError) {
          throw new Error(`Failed to get API keys: ${keyError.message}`);
        }

        const clientId = apiKeys?.find(k => k.key_type === 'client_id')?.key_value;
        if (!clientId) {
          throw new Error('Reddit Client ID not found. Please add it in Settings.');
        }

        // Generate state for OAuth
        const oauthState = crypto.randomUUID();
        
        // Store state in CLEAN table
        const { error: stateError } = await supabaseClient
          .from('oauth_states')
          .insert({
            user_id,
            state: oauthState,
            expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
          });

        if (stateError) {
          throw new Error(`Failed to store OAuth state: ${stateError.message}`);
        }

        // Build Reddit OAuth URL
        const authUrl = `https://www.reddit.com/api/v1/authorize?` +
          `client_id=${clientId}&` +
          `response_type=code&` +
          `state=${oauthState}&` +
          `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
          `duration=permanent&` +
          `scope=identity,read,submit`;

        return new Response(JSON.stringify({
          success: true,
          auth_url: authUrl,
          state: oauthState
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'handle_callback': {
        console.log('Handling Reddit OAuth callback for user:', user_id);
        
        if (!code || !state) {
          throw new Error('Code and state are required');
        }

        // Verify state
        const { data: stateData, error: stateError } = await supabaseClient
          .from('oauth_states')
          .select('*')
          .eq('user_id', user_id)
          .eq('state', state)
          .single();

        if (stateError || !stateData) {
          throw new Error('Invalid or expired OAuth state');
        }

        // Get API keys
        const { data: apiKeys, error: keyError } = await supabaseClient
          .from('api_keys')
          .select('key_type, key_value')
          .eq('user_id', user_id)
          .eq('platform', 'reddit');

        if (keyError) {
          throw new Error(`Failed to get API keys: ${keyError.message}`);
        }

        const clientId = apiKeys?.find(k => k.key_type === 'client_id')?.key_value;
        const clientSecret = apiKeys?.find(k => k.key_type === 'client_secret')?.key_value;

        if (!clientId || !clientSecret) {
          throw new Error('Reddit API credentials not found');
        }

        // Exchange code for token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditAutomation/1.0'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri
          })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
        }

        const tokenData = await tokenResponse.json();

        // Get Reddit user info
        const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0'
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to get Reddit user info');
        }

        const userData = await userResponse.json();

        // Store token with reddit_username
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const { error: tokenInsertError } = await supabaseClient
          .from('reddit_tokens')
          .upsert({
            user_id,
            reddit_username: userData.name,  // Include reddit_username!
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            scope: tokenData.scope,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (tokenInsertError) {
          throw new Error(`Failed to store token: ${tokenInsertError.message}`);
        }

        // Clean up OAuth state
        await supabaseClient
          .from('oauth_states')
          .delete()
          .eq('user_id', user_id)
          .eq('state', state);

        return new Response(JSON.stringify({
          success: true,
          reddit_user: {
            username: userData.name,
            expires_at: expiresAt.toISOString()
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Fixed Reddit OAuth Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});