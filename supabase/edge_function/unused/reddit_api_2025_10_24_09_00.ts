import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name, X-API-Token',
}

interface RedditApiRequest {
  action: 'comment' | 'reply' | 'vote' | 'search' | 'test_channel'
  subreddit?: string
  channel_id?: string
  target_id?: string
  text?: string
  vote_dir?: number // 1 for upvote, -1 for downvote, 0 for remove vote
  query?: string
  sort?: string
  time_filter?: string
  limit?: number
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

    // Check for API token authentication (for portal access)
    const apiToken = req.headers.get('X-API-Token')
    let userId: string

    if (apiToken) {
      // Validate API token
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('api_tokens_2025_10_24_09_00')
        .select('user_id, permissions, is_active, expires_at')
        .eq('token_hash', apiToken)
        .single()

      if (tokenError || !tokenData || !tokenData.is_active) {
        throw new Error('Invalid API token')
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        throw new Error('API token expired')
      }

      userId = tokenData.user_id

      // Update last used timestamp
      await supabaseClient
        .from('api_tokens_2025_10_24_09_00')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token_hash', apiToken)

    } else {
      // Regular user authentication
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('No authorization provided')
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        throw new Error('Invalid authentication')
      }
      userId = user.id
    }

    const requestData: RedditApiRequest = await req.json()
    const { action } = requestData

    // Log the API request
    const logEntry = {
      user_id: userId,
      action_type: action,
      subreddit: requestData.subreddit,
      target_id: requestData.target_id,
      payload: requestData,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    }

    switch (action) {
      case 'test_channel': {
        const { channel_id } = requestData
        
        // Get channel and account info
        const { data: channel, error: channelError } = await supabaseClient
          .from('subreddit_channels_2025_10_24_09_00')
          .select(`
            *,
            reddit_accounts_2025_10_24_09_00 (*)
          `)
          .eq('id', channel_id)
          .eq('user_id', userId)
          .single()

        if (channelError || !channel) {
          throw new Error('Channel not found')
        }

        const account = channel.reddit_accounts_2025_10_24_09_00

        // Test Reddit API access by getting subreddit info
        const testResponse = await fetch(`https://oauth.reddit.com/r/${channel.subreddit_name}/about`, {
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'User-Agent': 'RedditAutomationApp/1.0'
          }
        })

        const testResult = {
          success: testResponse.ok,
          status: testResponse.status,
          message: testResponse.ok ? 'Channel is working' : `Error: ${testResponse.status}`
        }

        // Update channel test status
        await supabaseClient
          .from('subreddit_channels_2025_10_24_09_00')
          .update({
            last_tested_at: new Date().toISOString(),
            test_status: testResult.success ? 'success' : 'failed'
          })
          .eq('id', channel_id)

        logEntry.status = testResult.success ? 'success' : 'failed'
        logEntry.error_message = testResult.success ? undefined : testResult.message

        await supabaseClient.from('api_logs_2025_10_24_09_00').insert(logEntry)

        return new Response(JSON.stringify(testResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'search': {
        const { subreddit, query, sort = 'relevance', time_filter = 'all', limit = 25 } = requestData
        
        // Get active Reddit account for this subreddit
        const { data: channel, error: channelError } = await supabaseClient
          .from('subreddit_channels_2025_10_24_09_00')
          .select(`
            *,
            reddit_accounts_2025_10_24_09_00 (*)
          `)
          .eq('subreddit_name', subreddit)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (channelError || !channel) {
          throw new Error('No active channel found for this subreddit')
        }

        const account = channel.reddit_accounts_2025_10_24_09_00

        // Search Reddit
        const searchUrl = new URL(`https://oauth.reddit.com/r/${subreddit}/search`)
        searchUrl.searchParams.set('q', query || '')
        searchUrl.searchParams.set('sort', sort)
        searchUrl.searchParams.set('t', time_filter)
        searchUrl.searchParams.set('limit', limit.toString())
        searchUrl.searchParams.set('restrict_sr', 'true')

        const searchResponse = await fetch(searchUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'User-Agent': 'RedditAutomationApp/1.0'
          }
        })

        if (!searchResponse.ok) {
          throw new Error(`Reddit search failed: ${searchResponse.status}`)
        }

        const searchData = await searchResponse.json()
        
        logEntry.status = 'success'
        await supabaseClient.from('api_logs_2025_10_24_09_00').insert(logEntry)

        return new Response(JSON.stringify({
          success: true,
          data: searchData.data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'comment': {
        const { target_id, text, subreddit } = requestData
        
        if (!target_id || !text) {
          throw new Error('Missing target_id or text for comment')
        }

        // Get active Reddit account for this subreddit
        const { data: channel, error: channelError } = await supabaseClient
          .from('subreddit_channels_2025_10_24_09_00')
          .select(`
            *,
            reddit_accounts_2025_10_24_09_00 (*)
          `)
          .eq('subreddit_name', subreddit)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (channelError || !channel) {
          throw new Error('No active channel found for this subreddit')
        }

        const account = channel.reddit_accounts_2025_10_24_09_00

        // Post comment to Reddit
        const commentResponse = await fetch('https://oauth.reddit.com/api/comment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditAutomationApp/1.0'
          },
          body: new URLSearchParams({
            thing_id: target_id,
            text: text
          })
        })

        if (!commentResponse.ok) {
          throw new Error(`Reddit comment failed: ${commentResponse.status}`)
        }

        const commentData = await commentResponse.json()
        
        logEntry.status = 'success'
        await supabaseClient.from('api_logs_2025_10_24_09_00').insert(logEntry)

        return new Response(JSON.stringify({
          success: true,
          data: commentData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'reply': {
        const { target_id, text, subreddit } = requestData
        
        if (!target_id || !text) {
          throw new Error('Missing target_id or text for reply')
        }

        // Get active Reddit account for this subreddit
        const { data: channel, error: channelError } = await supabaseClient
          .from('subreddit_channels_2025_10_24_09_00')
          .select(`
            *,
            reddit_accounts_2025_10_24_09_00 (*)
          `)
          .eq('subreddit_name', subreddit)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (channelError || !channel) {
          throw new Error('No active channel found for this subreddit')
        }

        const account = channel.reddit_accounts_2025_10_24_09_00

        // Post reply to Reddit
        const replyResponse = await fetch('https://oauth.reddit.com/api/comment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditAutomationApp/1.0'
          },
          body: new URLSearchParams({
            thing_id: target_id,
            text: text
          })
        })

        if (!replyResponse.ok) {
          throw new Error(`Reddit reply failed: ${replyResponse.status}`)
        }

        const replyData = await replyResponse.json()
        
        logEntry.status = 'success'
        await supabaseClient.from('api_logs_2025_10_24_09_00').insert(logEntry)

        return new Response(JSON.stringify({
          success: true,
          data: replyData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'vote': {
        const { target_id, vote_dir, subreddit } = requestData
        
        if (!target_id || vote_dir === undefined) {
          throw new Error('Missing target_id or vote_dir for voting')
        }

        // Get active Reddit account for this subreddit
        const { data: channel, error: channelError } = await supabaseClient
          .from('subreddit_channels_2025_10_24_09_00')
          .select(`
            *,
            reddit_accounts_2025_10_24_09_00 (*)
          `)
          .eq('subreddit_name', subreddit)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (channelError || !channel) {
          throw new Error('No active channel found for this subreddit')
        }

        const account = channel.reddit_accounts_2025_10_24_09_00

        // Vote on Reddit
        const voteResponse = await fetch('https://oauth.reddit.com/api/vote', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditAutomationApp/1.0'
          },
          body: new URLSearchParams({
            id: target_id,
            dir: vote_dir.toString()
          })
        })

        if (!voteResponse.ok) {
          throw new Error(`Reddit vote failed: ${voteResponse.status}`)
        }

        logEntry.status = 'success'
        await supabaseClient.from('api_logs_2025_10_24_09_00').insert(logEntry)

        return new Response(JSON.stringify({
          success: true,
          message: 'Vote submitted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Reddit API error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})