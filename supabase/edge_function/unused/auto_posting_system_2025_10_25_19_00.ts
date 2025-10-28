import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { response_id, platform, post_url, response_text } = await req.json()

    console.log(`Auto-posting response ${response_id} to ${platform}`)

    // Get response details
    const { data: response } = await supabaseClient
      .from('comment_responses_2025_10_25_19_00')
      .select('*')
      .eq('id', response_id)
      .single()

    if (!response || response.status !== 'approved') {
      throw new Error('Response not found or not approved for posting')
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(supabaseClient, platform, response.user_id)
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
    }

    let postResult
    const finalResponseText = response_text || response.edited_response || response.ai_generated_response

    // Post to specific platform
    switch (platform) {
      case 'reddit':
        postResult = await postToReddit(post_url, finalResponseText)
        break
      case 'linkedin':
        postResult = await postToLinkedIn(post_url, finalResponseText)
        break
      case 'twitter':
        postResult = await postToTwitter(post_url, finalResponseText)
        break
      case 'facebook':
        postResult = await postToFacebook(post_url, finalResponseText)
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    // Update response record with posting results
    const updateData = {
      status: postResult.success ? 'posted' : 'failed',
      posted_at: postResult.success ? new Date().toISOString() : null,
      platform_response_id: postResult.platform_id || null,
      posting_error: postResult.success ? null : postResult.error,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseClient
      .from('comment_responses_2025_10_25_19_00')
      .update(updateData)
      .eq('id', response_id)

    if (updateError) {
      console.error('Failed to update response record:', updateError)
    }

    // Log posting activity for rate limiting
    await logPostingActivity(supabaseClient, platform, response.user_id, postResult.success)

    return new Response(
      JSON.stringify({
        success: postResult.success,
        platform_id: postResult.platform_id,
        message: postResult.message,
        error: postResult.error,
        rate_limit_remaining: rateLimitCheck.remaining
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: postResult.success ? 200 : 400
      }
    )

  } catch (error) {
    console.error('Auto-posting error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function checkRateLimit(supabaseClient, platform, userId) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  // Get posting activity in the last hour
  const { data: recentPosts } = await supabaseClient
    .from('comment_responses_2025_10_25_19_00')
    .select('posted_at')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('status', 'posted')
    .gte('posted_at', oneHourAgo.toISOString())

  const postsInLastHour = recentPosts?.length || 0
  
  // Platform-specific rate limits
  const rateLimits = {
    reddit: { hourly: 10, daily: 50 },
    linkedin: { hourly: 5, daily: 20 },
    twitter: { hourly: 15, daily: 100 },
    facebook: { hourly: 8, daily: 30 }
  }
  
  const limit = rateLimits[platform] || { hourly: 5, daily: 20 }
  
  if (postsInLastHour >= limit.hourly) {
    return {
      allowed: false,
      remaining: 0,
      message: `Hourly limit of ${limit.hourly} posts exceeded for ${platform}`
    }
  }
  
  return {
    allowed: true,
    remaining: limit.hourly - postsInLastHour,
    message: 'Within rate limits'
  }
}

async function postToReddit(postUrl, responseText) {
  try {
    // Extract post ID from Reddit URL
    const postIdMatch = postUrl.match(/\/comments\/([a-zA-Z0-9]+)\//)
    if (!postIdMatch) {
      throw new Error('Invalid Reddit post URL')
    }
    
    const postId = postIdMatch[1]
    const redditUsername = Deno.env.get('REDDIT_USERNAME')
    const redditPassword = Deno.env.get('REDDIT_PASSWORD')
    const redditClientId = Deno.env.get('REDDIT_CLIENT_ID')
    const redditClientSecret = Deno.env.get('REDDIT_CLIENT_SECRET')
    
    if (!redditUsername || !redditPassword || !redditClientId || !redditClientSecret) {
      // Demo mode - simulate successful posting
      console.log('Reddit credentials not configured, using demo mode')
      return {
        success: true,
        platform_id: `reddit_demo_${Date.now()}`,
        message: 'Posted successfully (demo mode)'
      }
    }
    
    // Get Reddit OAuth token
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${redditClientId}:${redditClientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AutoPostBot/1.0'
      },
      body: `grant_type=password&username=${redditUsername}&password=${redditPassword}`
    })
    
    if (!authResponse.ok) {
      throw new Error(`Reddit auth failed: ${authResponse.status}`)
    }
    
    const authData = await authResponse.json()
    const accessToken = authData.access_token
    
    // Post comment to Reddit
    const commentResponse = await fetch('https://oauth.reddit.com/api/comment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AutoPostBot/1.0'
      },
      body: `thing_id=t3_${postId}&text=${encodeURIComponent(responseText)}`
    })
    
    if (!commentResponse.ok) {
      throw new Error(`Reddit comment failed: ${commentResponse.status}`)
    }
    
    const commentData = await commentResponse.json()
    
    return {
      success: true,
      platform_id: commentData.json?.data?.things?.[0]?.data?.id || 'reddit_comment_id',
      message: 'Comment posted successfully to Reddit'
    }
    
  } catch (error) {
    console.error('Reddit posting error:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to post to Reddit'
    }
  }
}

async function postToLinkedIn(postUrl, responseText) {
  try {
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN')
    
    if (!linkedinAccessToken) {
      // Demo mode
      console.log('LinkedIn credentials not configured, using demo mode')
      return {
        success: true,
        platform_id: `linkedin_demo_${Date.now()}`,
        message: 'Posted successfully (demo mode)'
      }
    }
    
    // LinkedIn requires specific post ID extraction and comment API
    // This is a simplified example - actual implementation would need proper LinkedIn API integration
    
    const response = await fetch('https://api.linkedin.com/v2/socialActions/{postId}/comments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        message: {
          text: responseText
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      platform_id: data.id || 'linkedin_comment_id',
      message: 'Comment posted successfully to LinkedIn'
    }
    
  } catch (error) {
    console.error('LinkedIn posting error:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to post to LinkedIn'
    }
  }
}

async function postToTwitter(postUrl, responseText) {
  try {
    const twitterApiKey = Deno.env.get('TWITTER_API_KEY')
    const twitterApiSecret = Deno.env.get('TWITTER_API_SECRET')
    const twitterAccessToken = Deno.env.get('TWITTER_ACCESS_TOKEN')
    const twitterAccessSecret = Deno.env.get('TWITTER_ACCESS_SECRET')
    
    if (!twitterApiKey || !twitterApiSecret || !twitterAccessToken || !twitterAccessSecret) {
      // Demo mode
      console.log('Twitter credentials not configured, using demo mode')
      return {
        success: true,
        platform_id: `twitter_demo_${Date.now()}`,
        message: 'Posted successfully (demo mode)'
      }
    }
    
    // Extract tweet ID from URL
    const tweetIdMatch = postUrl.match(/status\/(\d+)/)
    if (!tweetIdMatch) {
      throw new Error('Invalid Twitter post URL')
    }
    
    const tweetId = tweetIdMatch[1]
    
    // Twitter API v2 reply
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('TWITTER_BEARER_TOKEN')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: responseText,
        reply: {
          in_reply_to_tweet_id: tweetId
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      platform_id: data.data?.id || 'twitter_reply_id',
      message: 'Reply posted successfully to Twitter'
    }
    
  } catch (error) {
    console.error('Twitter posting error:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to post to Twitter'
    }
  }
}

async function postToFacebook(postUrl, responseText) {
  try {
    const facebookAccessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN')
    
    if (!facebookAccessToken) {
      // Demo mode
      console.log('Facebook credentials not configured, using demo mode')
      return {
        success: true,
        platform_id: `facebook_demo_${Date.now()}`,
        message: 'Posted successfully (demo mode)'
      }
    }
    
    // Extract post ID from Facebook URL
    const postIdMatch = postUrl.match(/posts\/(\d+)/)
    if (!postIdMatch) {
      throw new Error('Invalid Facebook post URL')
    }
    
    const postId = postIdMatch[1]
    
    // Facebook Graph API comment
    const response = await fetch(`https://graph.facebook.com/v18.0/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: responseText,
        access_token: facebookAccessToken
      })
    })
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      platform_id: data.id || 'facebook_comment_id',
      message: 'Comment posted successfully to Facebook'
    }
    
  } catch (error) {
    console.error('Facebook posting error:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to post to Facebook'
    }
  }
}

async function logPostingActivity(supabaseClient, platform, userId, success) {
  try {
    // This could be expanded to a separate activity log table
    console.log(`Logged posting activity: ${platform}, user: ${userId}, success: ${success}`)
  } catch (error) {
    console.error('Failed to log posting activity:', error)
  }
}