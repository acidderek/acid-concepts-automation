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

    const { campaign_id, platform, monitoring_rules } = await req.json()

    console.log(`Starting post discovery for campaign ${campaign_id} on ${platform}`)

    let discoveredPosts = []

    // Reddit Post Discovery
    if (platform === 'reddit') {
      discoveredPosts = await discoverRedditPosts(monitoring_rules)
    }
    // LinkedIn Post Discovery  
    else if (platform === 'linkedin') {
      discoveredPosts = await discoverLinkedInPosts(monitoring_rules)
    }
    // Twitter/X Post Discovery
    else if (platform === 'twitter') {
      discoveredPosts = await discoverTwitterPosts(monitoring_rules)
    }
    // Facebook Post Discovery
    else if (platform === 'facebook') {
      discoveredPosts = await discoverFacebookPosts(monitoring_rules)
    }

    // Store discovered posts in database
    const storedPosts = []
    for (const post of discoveredPosts) {
      const { data, error } = await supabaseClient
        .from('discovered_posts_2025_10_25_19_00')
        .insert({
          campaign_id,
          platform,
          platform_post_id: post.id,
          post_url: post.url,
          post_title: post.title,
          post_content: post.content,
          post_author: post.author,
          post_author_karma: post.author_karma || 0,
          post_upvotes: post.upvotes || 0,
          post_comments_count: post.comments_count || 0,
          post_created_at: post.created_at,
          subreddit_or_group: post.subreddit_or_group,
          post_flair: post.flair,
          is_nsfw: post.is_nsfw || false,
          post_metadata: post.metadata || {}
        })
        .select()
        .single()

      if (!error && data) {
        storedPosts.push(data)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        discovered_count: discoveredPosts.length,
        stored_count: storedPosts.length,
        posts: storedPosts
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Post discovery error:', error)
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

async function discoverRedditPosts(rules) {
  try {
    const subreddit = rules.target_location || 'entrepreneur'
    const keywords = rules.include_keywords?.split(',').map(k => k.trim()) || []
    
    // Use Reddit API to search for posts
    const searchQuery = keywords.length > 0 ? keywords.join(' OR ') : ''
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchQuery)}&restrict_sr=1&sort=new&limit=25`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PostDiscoveryBot/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data = await response.json()
    const posts = []

    for (const item of data.data?.children || []) {
      const post = item.data
      
      // Apply filtering rules
      if (rules.min_upvotes && post.score < rules.min_upvotes) continue
      if (rules.max_age && (Date.now() - post.created_utc * 1000) > rules.max_age * 60 * 60 * 1000) continue
      if (rules.min_comments && post.num_comments < rules.min_comments) continue
      if (rules.max_comments && post.num_comments > rules.max_comments) continue
      
      // Check exclude keywords
      if (rules.exclude_keywords) {
        const excludeWords = rules.exclude_keywords.split(',').map(k => k.trim().toLowerCase())
        const postText = (post.title + ' ' + post.selftext).toLowerCase()
        if (excludeWords.some(word => postText.includes(word))) continue
      }

      posts.push({
        id: post.id,
        url: `https://reddit.com${post.permalink}`,
        title: post.title,
        content: post.selftext || '',
        author: post.author,
        author_karma: post.author_flair_text || 0,
        upvotes: post.score,
        comments_count: post.num_comments,
        created_at: new Date(post.created_utc * 1000).toISOString(),
        subreddit_or_group: `r/${post.subreddit}`,
        flair: post.link_flair_text,
        is_nsfw: post.over_18,
        metadata: {
          reddit_id: post.id,
          permalink: post.permalink,
          domain: post.domain,
          thumbnail: post.thumbnail
        }
      })
    }

    return posts
  } catch (error) {
    console.error('Reddit discovery error:', error)
    return []
  }
}

async function discoverLinkedInPosts(rules) {
  // LinkedIn requires OAuth and has strict API access
  // For demo, return mock data structure
  console.log('LinkedIn discovery - requires OAuth setup')
  return [
    {
      id: 'linkedin_demo_1',
      url: 'https://linkedin.com/posts/demo1',
      title: 'How to scale your business with automation',
      content: 'Looking for advice on scaling business operations...',
      author: 'business_leader',
      author_karma: 500,
      upvotes: 25,
      comments_count: 8,
      created_at: new Date().toISOString(),
      subreddit_or_group: 'Business Automation Group',
      flair: null,
      is_nsfw: false,
      metadata: { platform: 'linkedin', demo: true }
    }
  ]
}

async function discoverTwitterPosts(rules) {
  // Twitter API v2 requires authentication
  // For demo, return mock data structure
  console.log('Twitter discovery - requires API authentication')
  return [
    {
      id: 'twitter_demo_1',
      url: 'https://twitter.com/user/status/123',
      title: 'Tweet about AI automation tools',
      content: 'What are the best AI tools for automating social media?',
      author: 'tech_enthusiast',
      author_karma: 1200,
      upvotes: 45,
      comments_count: 12,
      created_at: new Date().toISOString(),
      subreddit_or_group: '#AIAutomation',
      flair: null,
      is_nsfw: false,
      metadata: { platform: 'twitter', demo: true }
    }
  ]
}

async function discoverFacebookPosts(rules) {
  // Facebook requires app approval and page access tokens
  // For demo, return mock data structure
  console.log('Facebook discovery - requires page access tokens')
  return [
    {
      id: 'facebook_demo_1',
      url: 'https://facebook.com/groups/business/posts/123',
      title: 'Business automation discussion',
      content: 'Has anyone tried automating their customer service?',
      author: 'group_member',
      author_karma: 300,
      upvotes: 18,
      comments_count: 6,
      created_at: new Date().toISOString(),
      subreddit_or_group: 'Business Automation Group',
      flair: null,
      is_nsfw: false,
      metadata: { platform: 'facebook', demo: true }
    }
  ]
}