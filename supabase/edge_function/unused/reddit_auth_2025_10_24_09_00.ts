import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

interface RedditTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'exchange_code': {
        const { code, client_id, client_secret, redirect_uri } = payload
        
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${client_id}:${client_secret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditAutomationApp/1.0'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri
          })
        })

        if (!tokenResponse.ok) {
          throw new Error(`Reddit API error: ${tokenResponse.status}`)
        }

        const tokenData: RedditTokenResponse = await tokenResponse.json()
        
        // Get user info from Reddit
        const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomationApp/1.0'
          }
        })

        const userData = await userResponse.json()
        
        // Store or update Reddit account
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
        
        const { data: account, error: dbError } = await supabaseClient
          .from('reddit_accounts_2025_10_24_09_00')
          .upsert({
            user_id: user.id,
            account_name: payload.account_name || userData.name,
            client_id: client_id,
            client_secret: client_secret,
            username: userData.name,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`)
        }

        return new Response(JSON.stringify({ 
          success: true, 
          account: account,
          reddit_user: userData 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'refresh_token': {
        const { account_id } = payload
        
        // Get account details
        const { data: account, error: fetchError } = await supabaseClient
          .from('reddit_accounts_2025_10_24_09_00')
          .select('*')
          .eq('id', account_id)
          .eq('user_id', user.id)
          .single()

        if (fetchError || !account) {
          throw new Error('Account not found')
        }

        // Refresh the token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${account.client_id}:${account.client_secret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditAutomationApp/1.0'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token
          })
        })

        if (!tokenResponse.ok) {
          throw new Error(`Reddit token refresh failed: ${tokenResponse.status}`)
        }

        const tokenData: RedditTokenResponse = await tokenResponse.json()
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

        // Update account with new token
        const { error: updateError } = await supabaseClient
          .from('reddit_accounts_2025_10_24_09_00')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || account.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', account_id)

        if (updateError) {
          throw new Error(`Failed to update token: ${updateError.message}`)
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Token refreshed successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Reddit auth error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})