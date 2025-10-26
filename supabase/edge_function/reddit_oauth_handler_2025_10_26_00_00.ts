import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'start_auth'

    if (action === 'start_auth') {
      // Start Reddit OAuth flow
      const { user_id, redirect_uri } = await req.json()

      if (!user_id) {
        throw new Error('User ID is required')
      }

      // Get Reddit API credentials from database
      const { data: redditKeys, error: keysError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('key_value')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['client_id', 'client_secret'])

      if (keysError || !redditKeys || redditKeys.length < 2) {
        throw new Error('Reddit API credentials not found. Please configure them in Settings first.')
      }

      const clientId = redditKeys.find(k => k.key_type === 'client_id')?.key_value
      const clientSecret = redditKeys.find(k => k.key_type === 'client_secret')?.key_value

      if (!clientId || !clientSecret) {
        throw new Error('Reddit Client ID and Secret are required')
      }

      // Generate state parameter for security
      const state = crypto.randomUUID()
      
      // Store state in database for verification
      await supabase
        .from('oauth_states_2025_10_26_00_00')
        .insert({
          user_id,
          platform: 'reddit',
          state,
          redirect_uri: redirect_uri || `${url.origin}/auth/reddit/callback`,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      // Build Reddit OAuth URL
      const scopes = ['identity', 'read', 'submit', 'edit', 'vote', 'save', 'history']
      const authUrl = new URL('https://www.reddit.com/api/v1/authorize')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('redirect_uri', redirect_uri || `${url.origin}/auth/reddit/callback`)
      authUrl.searchParams.set('duration', 'permanent')
      authUrl.searchParams.set('scope', scopes.join(' '))

      return new Response(JSON.stringify({
        success: true,
        auth_url: authUrl.toString(),
        state,
        message: 'Redirect to Reddit for authentication'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'handle_callback') {
      // Handle Reddit OAuth callback
      const { code, state, user_id } = await req.json()

      if (!code || !state || !user_id) {
        throw new Error('Missing required parameters: code, state, or user_id')
      }

      // Verify state parameter
      const { data: stateRecord, error: stateError } = await supabase
        .from('oauth_states_2025_10_26_00_00')
        .select('*')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .eq('state', state)
        .single()

      if (stateError || !stateRecord) {
        throw new Error('Invalid or expired state parameter')
      }

      // Check if state is expired
      if (new Date(stateRecord.expires_at) < new Date()) {
        throw new Error('Authentication session expired. Please try again.')
      }

      // Get Reddit API credentials
      const { data: redditKeys, error: keysError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('key_value, key_type')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['client_id', 'client_secret'])

      if (keysError || !redditKeys || redditKeys.length < 2) {
        throw new Error('Reddit API credentials not found')
      }

      const clientId = redditKeys.find(k => k.key_type === 'client_id')?.key_value
      const clientSecret = redditKeys.find(k => k.key_type === 'client_secret')?.key_value

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AcidConcepts/1.0'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: stateRecord.redirect_uri
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        throw new Error(`Reddit token exchange failed: ${errorText}`)
      }

      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        throw new Error(`Reddit OAuth error: ${tokenData.error_description || tokenData.error}`)
      }

      // Get user info from Reddit
      const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'AcidConcepts/1.0'
        }
      })

      if (!userResponse.ok) {
        throw new Error('Failed to get Reddit user info')
      }

      const redditUser = await userResponse.json()

      // Store access token and refresh token
      await supabase
        .from('api_keys_2025_10_25_19_00')
        .upsert([
          {
            user_id,
            platform: 'reddit',
            key_type: 'access_token',
            key_name: 'Reddit Access Token',
            key_value: tokenData.access_token,
            is_valid: true,
            last_validated: new Date().toISOString()
          },
          {
            user_id,
            platform: 'reddit',
            key_type: 'refresh_token',
            key_name: 'Reddit Refresh Token',
            key_value: tokenData.refresh_token,
            is_valid: true,
            last_validated: new Date().toISOString()
          }
        ])

      // Store Reddit user info
      await supabase
        .from('reddit_accounts_2025_10_26_00_00')
        .upsert({
          user_id,
          reddit_username: redditUser.name,
          reddit_id: redditUser.id,
          karma: redditUser.total_karma || 0,
          created_utc: redditUser.created_utc,
          is_verified: redditUser.verified || false,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          connected_at: new Date().toISOString()
        })

      // Clean up state record
      await supabase
        .from('oauth_states_2025_10_26_00_00')
        .delete()
        .eq('id', stateRecord.id)

      return new Response(JSON.stringify({
        success: true,
        reddit_user: {
          username: redditUser.name,
          id: redditUser.id,
          karma: redditUser.total_karma || 0,
          verified: redditUser.verified || false
        },
        message: 'Reddit authentication successful!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'refresh_token') {
      // Refresh Reddit access token
      const { user_id } = await req.json()

      if (!user_id) {
        throw new Error('User ID is required')
      }

      // Get refresh token and credentials
      const { data: tokens, error: tokenError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('key_value, key_type')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['refresh_token', 'client_id', 'client_secret'])

      if (tokenError || !tokens || tokens.length < 3) {
        throw new Error('Reddit tokens or credentials not found')
      }

      const refreshToken = tokens.find(t => t.key_type === 'refresh_token')?.key_value
      const clientId = tokens.find(t => t.key_type === 'client_id')?.key_value
      const clientSecret = tokens.find(t => t.key_type === 'client_secret')?.key_value

      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Missing required Reddit credentials')
      }

      // Refresh the access token
      const refreshResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AcidConcepts/1.0'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      })

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Reddit token')
      }

      const newTokenData = await refreshResponse.json()

      // Update access token
      await supabase
        .from('api_keys_2025_10_25_19_00')
        .update({
          key_value: newTokenData.access_token,
          last_validated: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .eq('key_type', 'access_token')

      return new Response(JSON.stringify({
        success: true,
        message: 'Reddit token refreshed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'get_status') {
      // Get Reddit authentication status
      const { user_id } = await req.json()

      if (!user_id) {
        throw new Error('User ID is required')
      }

      // Check if user has Reddit account connected
      const { data: redditAccount, error: accountError } = await supabase
        .from('reddit_accounts_2025_10_26_00_00')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (accountError || !redditAccount) {
        return new Response(JSON.stringify({
          success: true,
          authenticated: false,
          message: 'Reddit account not connected'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check if token is still valid
      const tokenExpired = new Date(redditAccount.token_expires_at) < new Date()

      return new Response(JSON.stringify({
        success: true,
        authenticated: true,
        token_expired: tokenExpired,
        reddit_user: {
          username: redditAccount.reddit_username,
          karma: redditAccount.karma,
          verified: redditAccount.is_verified,
          connected_at: redditAccount.connected_at
        },
        message: tokenExpired ? 'Token expired, refresh needed' : 'Reddit authenticated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Reddit OAuth Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})