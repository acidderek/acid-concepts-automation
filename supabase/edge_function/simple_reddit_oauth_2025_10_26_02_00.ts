import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const requestData = await req.json()
    console.log('Reddit OAuth request:', requestData)

    const { action, user_id } = requestData

    if (action === 'get_status') {
      // Check if user has Reddit account connected
      const { data: redditAccount, error } = await supabase
        .from('reddit_accounts_2025_10_26_00_00')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!redditAccount) {
        return new Response(JSON.stringify({
          success: true,
          authenticated: false,
          message: 'Reddit account not connected'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: true,
        authenticated: true,
        reddit_user: {
          username: redditAccount.reddit_username,
          karma: redditAccount.karma,
          verified: redditAccount.is_verified,
          connected_at: redditAccount.connected_at
        },
        message: 'Reddit authenticated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'start_auth') {
      // Get Reddit API credentials
      const { data: redditKeys, error: keysError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('key_value, key_type')
        .eq('user_id', user_id)
        .eq('platform', 'reddit')
        .in('key_type', ['client_id', 'client_secret'])

      if (keysError || !redditKeys || redditKeys.length < 2) {
        throw new Error('Reddit API credentials not found. Please save your Client ID and Client Secret in Settings first.')
      }

      const clientId = redditKeys.find(k => k.key_type === 'client_id')?.key_value
      if (!clientId) {
        throw new Error('Reddit Client ID not found. Please check your API credentials in Settings.')
      }

      // Generate state and redirect URL
      const state = crypto.randomUUID()
      const redirectUri = requestData.redirect_uri || `${new URL(req.url).origin}/auth/reddit/callback`
      
      // Store state for verification
      await supabase
        .from('oauth_states_2025_10_26_00_00')
        .insert({
          user_id,
          platform: 'reddit',
          state,
          redirect_uri: redirectUri,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })

      // Build Reddit OAuth URL
      const scopes = ['identity', 'read', 'submit', 'edit']
      const authUrl = new URL('https://www.reddit.com/api/v1/authorize')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('duration', 'permanent')
      authUrl.searchParams.set('scope', scopes.join(' '))

      return new Response(JSON.stringify({
        success: true,
        auth_url: authUrl.toString(),
        message: 'Redirect to Reddit for authentication'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown action'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Reddit OAuth error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})