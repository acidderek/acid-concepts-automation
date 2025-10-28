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

    const { action, user_id, subreddit, post_url, limit = 25 } = await req.json()
    console.log('Reddit comment fetch request:', { action, user_id, subreddit, post_url, limit })

    if (action === 'fetch_comments') {
      // Get user's Reddit token
      const { data: tokens, error: tokenError } = await supabaseClient
        .from('reddit_tokens_2025_10_26_16_00')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (tokenError || !tokens || tokens.length === 0) {
        throw new Error('No Reddit token found. Please connect your Reddit account first.')
      }

      const token = tokens[0]
      
      // Check if token is expired
      if (new Date(token.expires_at) < new Date()) {
        throw new Error('Reddit token has expired. Please reconnect your Reddit account.')
      }

      console.log('Using Reddit token for user:', token.reddit_username)

      let redditUrl
      let postId = null
      let postTitle = null

      if (post_url) {
        // Extract post ID from URL
        const urlMatch = post_url.match(/\/comments\/([a-zA-Z0-9]+)\//)
        if (!urlMatch) {
          throw new Error('Invalid Reddit post URL format')
        }
        postId = urlMatch[1]
        redditUrl = `https://oauth.reddit.com/comments/${postId}.json?limit=${limit}&sort=new`
        
        // Get post info first
        const postResponse = await fetch(`https://oauth.reddit.com/comments/${postId}.json?limit=1`, {
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'User-Agent': 'RedditAutomation/1.0'
          }
        })

        if (postResponse.ok) {
          const postData = await postResponse.json()
          if (postData && postData.length > 0 && postData[0].data.children.length > 0) {
            postTitle = postData[0].data.children[0].data.title
          }
        }
      } else if (subreddit) {
        // Get recent comments from subreddit
        redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments.json?limit=${limit}&sort=new`
      } else {
        throw new Error('Either subreddit or post_url must be provided')
      }

      console.log('Fetching from Reddit URL:', redditUrl)

      // Fetch comments from Reddit
      const response = await fetch(redditUrl, {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'User-Agent': 'RedditAutomation/1.0'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Reddit API error:', response.status, errorText)
        throw new Error(`Reddit API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Reddit API response received')

      let comments = []

      if (post_url) {
        // Extract comments from post
        if (data && data.length > 1 && data[1].data && data[1].data.children) {
          comments = data[1].data.children
            .filter(child => child.kind === 't1' && child.data.body && child.data.body !== '[deleted]')
            .map(child => ({
              reddit_comment_id: child.data.id,
              reddit_post_id: postId,
              subreddit: child.data.subreddit,
              post_title: postTitle,
              comment_author: child.data.author,
              comment_body: child.data.body,
              comment_score: child.data.score || 0,
              comment_created_utc: new Date(child.data.created_utc * 1000).toISOString(),
              parent_id: child.data.parent_id,
              permalink: `https://reddit.com${child.data.permalink}`
            }))
        }
      } else {
        // Extract comments from subreddit
        if (data && data.data && data.data.children) {
          comments = data.data.children
            .filter(child => child.kind === 't1' && child.data.body && child.data.body !== '[deleted]')
            .map(child => ({
              reddit_comment_id: child.data.id,
              reddit_post_id: child.data.link_id?.replace('t3_', '') || 'unknown',
              subreddit: child.data.subreddit,
              post_title: null, // We'd need another API call to get this
              comment_author: child.data.author,
              comment_body: child.data.body,
              comment_score: child.data.score || 0,
              comment_created_utc: new Date(child.data.created_utc * 1000).toISOString(),
              parent_id: child.data.parent_id,
              permalink: `https://reddit.com${child.data.permalink}`
            }))
        }
      }

      console.log(`Found ${comments.length} comments to store`)

      // Store comments in database
      let storedCount = 0
      let skippedCount = 0

      for (const comment of comments) {
        try {
          const { error: insertError } = await supabaseClient
            .from('reddit_comments_2025_10_26_18_00')
            .insert({
              user_id,
              ...comment
            })

          if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation
              skippedCount++
              console.log(`Skipped duplicate comment: ${comment.reddit_comment_id}`)
            } else {
              console.error('Error inserting comment:', insertError)
            }
          } else {
            storedCount++
          }
        } catch (error) {
          console.error('Error processing comment:', error)
        }
      }

      console.log(`Stored ${storedCount} new comments, skipped ${skippedCount} duplicates`)

      return new Response(
        JSON.stringify({ 
          success: true,
          total_found: comments.length,
          stored: storedCount,
          skipped: skippedCount,
          message: `Successfully fetched ${comments.length} comments. Stored ${storedCount} new comments, skipped ${skippedCount} duplicates.`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'get_comments') {
      // Get stored comments for review
      const { data: comments, error: commentsError } = await supabaseClient
        .from('reddit_comments_2025_10_26_18_00')
        .select('*')
        .eq('user_id', user_id)
        .order('fetched_at', { ascending: false })
        .limit(limit || 50)

      if (commentsError) {
        throw new Error(`Failed to fetch comments: ${commentsError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          comments: comments || [],
          count: comments?.length || 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'update_review_status') {
      const { comment_id, review_status, review_notes } = await req.json()
      
      const { error: updateError } = await supabaseClient
        .from('reddit_comments_2025_10_26_18_00')
        .update({
          review_status,
          review_notes,
          is_reviewed: true
        })
        .eq('id', comment_id)
        .eq('user_id', user_id)

      if (updateError) {
        throw new Error(`Failed to update comment: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Comment review status updated successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Reddit comment fetch error:', error)
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