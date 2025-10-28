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
    console.log('Reddit OAuth - Request received')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request data
    let requestData = {}
    const body = await req.text()
    console.log('Raw request body:', body)
    
    if (body && body.trim()) {
      try {
        requestData = JSON.parse(body)
        console.log('Parsed request data:', requestData)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          received_body: body
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { action = 'get_status', user_id } = requestData
    console.log('Action:', action, 'User ID:', user_id)

    // Validate user_id
    if (!user_id) {
      console.error('No user_id provided in request')
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required',
        received_data: requestData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_status') {
      console.log('Getting Reddit auth status for user:', user_id)
      
      // Check if user has Reddit account connected
      const { data: redditAccount, error: accountError } = await supabase
        .from('reddit_accounts_2025_10_26_00_00')
        .select('*')
        .eq('user_id', user_id)
        .single()

      console.log('Reddit account query result:', { data: redditAccount, error: accountError })

      if (accountError && accountError.code !== 'PGRST116') {
        console.error('Database error:', accountError)
        throw new Error(`Database error: ${accountError.message}`)
      }

      if (!redditAccount) {
        console.log('No Reddit account found for user')
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
      console.log('Token expired:', tokenExpired)

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

    } else if (action === 'start_auth') {
      console.log('Starting Reddit OAuth for user:', user_id)
      
      const { redirect_uri } = requestData
      
      // Get Reddit API credentials from database
      const { data: redditKeys, error: keysError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('key_value, key_type')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['client_id', 'client_secret'])

      console.log('Reddit keys query result:', { data: redditKeys, error: keysError })

      if (keysError) {
        throw new Error(`Failed to get Reddit credentials: ${keysError.message}`)
      }

      if (!redditKeys || redditKeys.length < 2) {
        throw new Error('Reddit API credentials not found. Please save your Client ID and Client Secret in Settings first.')
      }

      const clientId = redditKeys.find(k => k.key_type === 'client_id')?.key_value
      const clientSecret = redditKeys.find(k => k.key_type === 'client_secret')?.key_value

      if (!clientId || !clientSecret) {
        throw new Error('Reddit Client ID and Secret are required. Please check your API credentials in Settings.')
      }

      console.log('Found Reddit credentials, generating OAuth URL')

      // Generate state parameter for security
      const state = crypto.randomUUID()
      const finalRedirectUri = redirect_uri || `${new URL(req.url).origin}/auth/reddit/callback`
      
      console.log('Redirect URI:', finalRedirectUri)
      console.log('State:', state)
      
      // Store state in database for verification
      const { error: stateError } = await supabase
        .from('oauth_states_2025_10_26_00_00')
        .insert({
          user_id,
          platform: 'reddit',
          state,
          redirect_uri: finalRedirectUri,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      if (stateError) {
        console.error('State storage error:', stateError)
        throw new Error(`Failed to store OAuth state: ${stateError.message}`)
      }

      // Build Reddit OAuth URL
      const scopes = ['identity', 'read', 'submit', 'edit', 'vote', 'save', 'history']
      const authUrl = new URL('https://www.reddit.com/api/v1/authorize')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('redirect_uri', finalRedirectUri)
      authUrl.searchParams.set('duration', 'permanent')
      authUrl.searchParams.set('scope', scopes.join(' '))

      console.log('Generated auth URL:', authUrl.toString())

      return new Response(JSON.stringify({
        success: true,
        auth_url: authUrl.toString(),
        state,
        redirect_uri: finalRedirectUri,
        message: 'Redirect to Reddit for authentication'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'handle_callback') {
      console.log('Handling Reddit OAuth callback for user:', user_id)
      
      const { code, state } = requestData

      if (!code || !state) {
        throw new Error('Missing required parameters: code and state are required')
      }

      console.log('Callback code:', code.substring(0, 10) + '...', 'State:', state)

      // Verify state parameter
      const { data: stateRecord, error: stateError } = await supabase
        .from('oauth_states_2025_10_26_00_00')
        .select('*')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .eq('state', state)
        .single()

      if (stateError || !stateRecord) {
        console.error('State verification failed:', stateError)
        throw new Error('Invalid or expired state parameter. Please try authenticating again.')
      }

      // Check if state is expired
      if (new Date(stateRecord.expires_at) < new Date()) {
        throw new Error('Authentication session expired. Please try again.')
      }

      console.log('State verified, exchanging code for token')

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
        console.error('Token exchange failed:', errorText)
        throw new Error(`Reddit token exchange failed: ${errorText}`)
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful')

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
      console.log('Got Reddit user info:', redditUser.name)

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

      console.log('Reddit OAuth completed successfully')

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

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Reddit OAuth Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})