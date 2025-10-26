import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, user_id, redirect_uri, code, state } = await req.json()

    if (action === 'start_auth') {
      // Get Reddit credentials from database
      const { data: credentials, error: credError } = await supabaseClient
        .from('api_keys_2025_10_25_19_00')
        .select('key_type, key_value')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['client_id', 'client_secret'])

      if (credError) throw credError
      if (!credentials || credentials.length < 2) {
        throw new Error('Reddit API credentials not found. Please save your Client ID and Secret first.')
      }

      const clientId = credentials.find(c => c.key_type === 'client_id')?.key_value
      const clientSecret = credentials.find(c => c.key_type === 'client_secret')?.key_value

      if (!clientId || !clientSecret) {
        throw new Error('Missing Reddit Client ID or Secret')
      }

      // Generate state parameter for security
      const stateParam = crypto.randomUUID()
      
      // Store state in database for verification
      await supabaseClient
        .from('oauth_states_2025_10_25_19_00')
        .upsert({
          user_id,
          platform: 'reddit',
          state: stateParam,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      // Build Reddit OAuth URL
      const authUrl = new URL('https://www.reddit.com/api/v1/authorize')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('state', stateParam)
      authUrl.searchParams.set('redirect_uri', redirect_uri)
      authUrl.searchParams.set('duration', 'permanent')
      authUrl.searchParams.set('scope', 'identity read submit')

      return new Response(
        JSON.stringify({ 
          success: true, 
          auth_url: authUrl.toString(),
          state: stateParam
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'handle_callback') {
      // Handle OAuth callback
      if (!code || !state) {
        throw new Error('Missing authorization code or state')
      }

      // Verify state parameter
      const { data: stateRecord, error: stateError } = await supabaseClient
        .from('oauth_states_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .eq('state', state)
        .single()

      if (stateError || !stateRecord) {
        throw new Error('Invalid or expired state parameter')
      }

      // Get Reddit credentials
      const { data: credentials, error: credError } = await supabaseClient
        .from('api_keys_2025_10_25_19_00')
        .select('key_type, key_value')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['client_id', 'client_secret'])

      if (credError) throw credError

      const clientId = credentials.find(c => c.key_type === 'client_id')?.key_value
      const clientSecret = credentials.find(c => c.key_type === 'client_secret')?.key_value

      // Exchange code for access token
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
      })

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()

      // Get user info from Reddit
      const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'RedditAutomation/1.0'
        }
      })

      if (!userResponse.ok) {
        throw new Error(`Failed to get user info: ${userResponse.status}`)
      }

      const userData = await userResponse.json()

      // Store tokens and user info
      await supabaseClient
        .from('reddit_tokens_2025_10_26_16_00')
        .upsert({
          user_id,
          reddit_username: userData.name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          scope: tokenData.scope,
          created_at: new Date().toISOString()
        })

      // Clean up state
      await supabaseClient
        .from('oauth_states_2025_10_25_19_00')
        .delete()
        .eq('user_id', user_id)
        .eq('state', state)

      return new Response(
        JSON.stringify({ 
          success: true, 
          reddit_user: {
            username: userData.name,
            id: userData.id,
            karma: userData.total_karma,
            verified: userData.verified
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'get_status') {
      // Check if user has valid Reddit token
      const { data: token, error: tokenError } = await supabaseClient
        .from('reddit_tokens_2025_10_26_16_00')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (tokenError || !token) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            authenticated: false,
            user: null
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if token is expired
      const isExpired = new Date(token.expires_at) < new Date()

      return new Response(
        JSON.stringify({ 
          success: true, 
          authenticated: !isExpired,
          user: {
            username: token.reddit_username,
            expires_at: token.expires_at
          },
          tokenExpired: isExpired
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Reddit OAuth error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})