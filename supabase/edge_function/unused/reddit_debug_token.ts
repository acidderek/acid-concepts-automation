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
    console.log('FIXED DEBUG: Request received:', JSON.stringify(requestBody, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id } = requestBody;

    if (!user_id) {
      throw new Error('User ID is required');
    }

    if (action === 'debug_reddit_token') {
      console.log('FIXED DEBUG: Checking Reddit token for user:', user_id);
      
      // Check if we have any Reddit tokens in CLEAN table
      const { data: tokens, error: tokenError } = await supabaseClient
        .from('reddit_tokens')  // FIXED: Using clean table name
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      console.log('FIXED DEBUG: Token query result:', { tokens, tokenError });

      if (tokenError) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token query failed',
          details: tokenError,
          step: 'token_query'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!tokens || tokens.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No Reddit tokens found',
          step: 'no_tokens',
          user_id: user_id
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const latestToken = tokens[0];
      console.log('FIXED DEBUG: Latest token found:', {
        id: latestToken.id,
        reddit_username: latestToken.reddit_username,
        created_at: latestToken.created_at,
        expires_at: latestToken.expires_at,
        has_access_token: !!latestToken.access_token
      });

      // Test the token with Reddit API
      if (latestToken.access_token) {
        console.log('FIXED DEBUG: Testing Reddit API with token...');
        
        try {
          const testResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `Bearer ${latestToken.access_token}`,
              'User-Agent': 'RedditAutomation/1.0'
            }
          });

          console.log('FIXED DEBUG: Reddit API test response status:', testResponse.status);
          
          if (testResponse.ok) {
            const userData = await testResponse.json();
            console.log('FIXED DEBUG: Reddit API test successful, user:', userData.name);
            
            return new Response(JSON.stringify({
              success: true,
              message: 'Reddit token is valid',
              reddit_user: userData.name,
              stored_username: latestToken.reddit_username,
              token_expires: latestToken.expires_at,
              step: 'token_valid'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            const errorText = await testResponse.text();
            console.log('FIXED DEBUG: Reddit API test failed:', testResponse.status, errorText);
            
            return new Response(JSON.stringify({
              success: false,
              error: 'Reddit token is invalid or expired',
              reddit_status: testResponse.status,
              reddit_error: errorText,
              step: 'token_invalid'
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (fetchError) {
          console.log('FIXED DEBUG: Reddit API fetch error:', fetchError);
          
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to test Reddit API',
            details: fetchError.message,
            step: 'api_fetch_error'
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'No access token in latest record',
        step: 'no_access_token'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If we get here, unknown action
    return new Response(JSON.stringify({
      success: false,
      error: `Unknown action: ${action}`,
      available_actions: ['debug_reddit_token']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('FIXED DEBUG: Edge Function Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      step: 'general_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});