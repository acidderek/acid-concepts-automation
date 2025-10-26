import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

interface CampaignExecutionRequest {
  action: 'run_campaign' | 'analyze_post' | 'get_campaign_status'
  campaign_id?: string
  run_type?: 'manual' | 'scheduled'
  post_data?: any
}

interface RedditPost {
  id: string
  name: string
  title: string
  selftext: string
  author: string
  url: string
  score: number
  num_comments: number
  created_utc: number
  subreddit: string
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

    const requestData: CampaignExecutionRequest = await req.json()
    const { action } = requestData

    switch (action) {
      case 'run_campaign': {
        const { campaign_id, run_type = 'manual' } = requestData
        
        if (!campaign_id) {
          throw new Error('Campaign ID is required')
        }

        // Get campaign details
        const { data: campaign, error: campaignError } = await supabaseClient
          .from('campaigns_2025_10_24_09_00')
          .select(`
            *,
            campaign_channels_2025_10_24_09_00 (
              *,
              subreddit_channels_2025_10_24_09_00 (
                *,
                reddit_accounts_2025_10_24_09_00 (*)
              )
            ),
            campaign_documents_2025_10_24_09_00 (*)
          `)
          .eq('id', campaign_id)
          .eq('user_id', user.id)
          .single()

        if (campaignError || !campaign) {
          throw new Error('Campaign not found')
        }

        // Create campaign run record
        const { data: campaignRun, error: runError } = await supabaseClient
          .from('campaign_runs_2025_10_24_09_00')
          .insert({
            campaign_id: campaign_id,
            run_type: run_type,
            status: 'running'
          })
          .select()
          .single()

        if (runError) {
          throw new Error(`Failed to create campaign run: ${runError.message}`)
        }

        const startTime = Date.now()
        let totalDiscovered = 0
        let totalAnalyzed = 0
        let totalEngaged = 0
        let totalSkipped = 0

        try {
          // Process each channel in the campaign
          for (const campaignChannel of campaign.campaign_channels_2025_10_24_09_00) {
            if (!campaignChannel.is_active) continue

            const channel = campaignChannel.subreddit_channels_2025_10_24_09_00
            const account = channel.reddit_accounts_2025_10_24_09_00

            // Discover new posts from this subreddit
            const posts = await discoverPosts(
              channel.subreddit_name,
              account.access_token,
              campaign.max_posts_per_run
            )

            totalDiscovered += posts.length

            // Process each discovered post
            for (const post of posts) {
              // Check if we've already processed this post
              const { data: existingPost } = await supabaseClient
                .from('monitored_posts_2025_10_24_09_00')
                .select('id')
                .eq('campaign_id', campaign_id)
                .eq('reddit_post_id', post.id)
                .single()

              if (existingPost) continue

              // Store the post
              const { data: storedPost, error: storeError } = await supabaseClient
                .from('monitored_posts_2025_10_24_09_00')
                .insert({
                  campaign_id: campaign_id,
                  channel_id: channel.id,
                  reddit_post_id: post.id,
                  reddit_fullname: post.name,
                  subreddit: post.subreddit,
                  title: post.title,
                  content: post.selftext,
                  author: post.author,
                  url: post.url,
                  score: post.score,
                  num_comments: post.num_comments,
                  created_utc: new Date(post.created_utc * 1000).toISOString()
                })
                .select()
                .single()

              if (storeError) {
                console.error('Failed to store post:', storeError)
                continue
              }

              // Analyze post with AI
              const analysis = await analyzePostWithAI(post, campaign)
              totalAnalyzed++

              // Update post with analysis results
              await supabaseClient
                .from('monitored_posts_2025_10_24_09_00')
                .update({
                  ai_analysis_status: 'analyzed',
                  ai_relevance_score: analysis.relevance_score,
                  ai_decision: analysis.decision,
                  ai_reasoning: analysis.reasoning,
                  ai_suggested_comment: analysis.suggested_comment,
                  ai_confidence: analysis.confidence,
                  analyzed_at: new Date().toISOString()
                })
                .eq('id', storedPost.id)

              // Execute engagement based on AI decision
              if (analysis.decision === 'comment' && analysis.suggested_comment) {
                const engagementResult = await engageWithPost(
                  post,
                  'comment',
                  analysis.suggested_comment,
                  account.access_token
                )
                
                await supabaseClient
                  .from('monitored_posts_2025_10_24_09_00')
                  .update({
                    engagement_status: engagementResult.success ? 'completed' : 'failed',
                    engagement_action: 'commented',
                    engagement_result: engagementResult,
                    engaged_at: new Date().toISOString()
                  })
                  .eq('id', storedPost.id)

                if (engagementResult.success) totalEngaged++
              } else if (analysis.decision === 'vote') {
                const engagementResult = await engageWithPost(
                  post,
                  'vote',
                  null,
                  account.access_token
                )
                
                await supabaseClient
                  .from('monitored_posts_2025_10_24_09_00')
                  .update({
                    engagement_status: engagementResult.success ? 'completed' : 'failed',
                    engagement_action: 'voted',
                    engagement_result: engagementResult,
                    engaged_at: new Date().toISOString()
                  })
                  .eq('id', storedPost.id)

                if (engagementResult.success) totalEngaged++
              } else {
                // Skip engagement
                await supabaseClient
                  .from('monitored_posts_2025_10_24_09_00')
                  .update({
                    engagement_status: 'skipped',
                    engagement_action: 'skipped'
                  })
                  .eq('id', storedPost.id)

                totalSkipped++
              }

              // Log AI usage
              await supabaseClient
                .from('ai_usage_logs_2025_10_24_09_00')
                .insert({
                  user_id: user.id,
                  campaign_id: campaign_id,
                  provider: campaign.ai_provider,
                  model: campaign.ai_model,
                  prompt_tokens: analysis.usage?.prompt_tokens || 0,
                  completion_tokens: analysis.usage?.completion_tokens || 0,
                  total_tokens: analysis.usage?.total_tokens || 0,
                  cost_usd: analysis.usage?.cost_usd || 0,
                  request_type: 'post_analysis',
                  response_time_ms: analysis.response_time_ms || 0
                })
            }
          }

          // Update campaign run as completed
          const executionTime = Date.now() - startTime
          await supabaseClient
            .from('campaign_runs_2025_10_24_09_00')
            .update({
              status: 'completed',
              posts_discovered: totalDiscovered,
              posts_analyzed: totalAnalyzed,
              posts_engaged: totalEngaged,
              posts_skipped: totalSkipped,
              execution_time_ms: executionTime,
              completed_at: new Date().toISOString()
            })
            .eq('id', campaignRun.id)

          // Update campaign last run time
          await supabaseClient
            .from('campaigns_2025_10_24_09_00')
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: campaign.is_scheduled ? 
                new Date(Date.now() + campaign.monitoring_frequency * 60 * 1000).toISOString() : 
                null
            })
            .eq('id', campaign_id)

          return new Response(JSON.stringify({
            success: true,
            run_id: campaignRun.id,
            stats: {
              discovered: totalDiscovered,
              analyzed: totalAnalyzed,
              engaged: totalEngaged,
              skipped: totalSkipped,
              execution_time_ms: executionTime
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } catch (error) {
          // Update campaign run as failed
          await supabaseClient
            .from('campaign_runs_2025_10_24_09_00')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', campaignRun.id)

          throw error
        }
      }

      case 'get_campaign_status': {
        const { campaign_id } = requestData
        
        if (!campaign_id) {
          throw new Error('Campaign ID is required')
        }

        // Get latest campaign run
        const { data: latestRun } = await supabaseClient
          .from('campaign_runs_2025_10_24_09_00')
          .select('*')
          .eq('campaign_id', campaign_id)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        // Get campaign stats
        const { count: totalPosts } = await supabaseClient
          .from('monitored_posts_2025_10_24_09_00')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign_id)

        const { count: engagedPosts } = await supabaseClient
          .from('monitored_posts_2025_10_24_09_00')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign_id)
          .eq('engagement_status', 'completed')

        return new Response(JSON.stringify({
          success: true,
          latest_run: latestRun,
          stats: {
            total_posts: totalPosts || 0,
            engaged_posts: engagedPosts || 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Campaign execution error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function discoverPosts(subreddit: string, accessToken: string, limit: number): Promise<RedditPost[]> {
  const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/new?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'RedditAutomationApp/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`)
  }

  const data = await response.json()
  return data.data.children.map((child: any) => child.data)
}

async function analyzePostWithAI(post: RedditPost, campaign: any) {
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  // Build context from campaign documents
  const documentsContext = campaign.campaign_documents_2025_10_24_09_00
    .filter((doc: any) => doc.is_active)
    .map((doc: any) => `${doc.name}:\n${doc.content}`)
    .join('\n\n')

  const systemPrompt = campaign.ai_system_prompt || `
You are an AI assistant that analyzes Reddit posts for relevance to a marketing campaign. 
Based on the provided context documents and post content, determine if this post is relevant 
for engagement and what type of engagement would be appropriate.

Context Documents:
${documentsContext}

Respond with a JSON object containing:
- relevance_score: number between 0.0 and 1.0
- decision: "comment", "vote", or "skip"
- reasoning: string explaining your decision
- suggested_comment: string (only if decision is "comment")
- confidence: number between 0.0 and 1.0
`

  const userPrompt = `
Post Title: ${post.title}
Post Content: ${post.selftext || 'No content'}
Post URL: ${post.url}
Subreddit: r/${post.subreddit}
Author: u/${post.author}
Score: ${post.score}
Comments: ${post.num_comments}

Analyze this post and provide your recommendation.
`

  const startTime = Date.now()

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://reddit-automation-app.com',
        'X-Title': 'Acid Concepts Professional Platform'
      },
      body: JSON.stringify({
        model: campaign.ai_model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: campaign.ai_temperature,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    const analysis = JSON.parse(data.choices[0].message.content)
    
    return {
      ...analysis,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
        cost_usd: calculateCost(campaign.ai_model, data.usage)
      },
      response_time_ms: responseTime
    }

  } catch (error) {
    console.error('AI analysis error:', error)
    return {
      relevance_score: 0.0,
      decision: 'skip',
      reasoning: `AI analysis failed: ${error.message}`,
      suggested_comment: null,
      confidence: 0.0,
      response_time_ms: Date.now() - startTime
    }
  }
}

async function engageWithPost(post: RedditPost, action: string, comment: string | null, accessToken: string) {
  try {
    if (action === 'comment' && comment) {
      const response = await fetch('https://oauth.reddit.com/api/comment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditAutomationApp/1.0'
        },
        body: new URLSearchParams({
          thing_id: post.name,
          text: comment
        })
      })

      return {
        success: response.ok,
        status: response.status,
        action: 'comment',
        response: response.ok ? await response.json() : await response.text()
      }
    } else if (action === 'vote') {
      const response = await fetch('https://oauth.reddit.com/api/vote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditAutomationApp/1.0'
        },
        body: new URLSearchParams({
          id: post.name,
          dir: '1' // upvote
        })
      })

      return {
        success: response.ok,
        status: response.status,
        action: 'vote',
        response: response.ok ? 'Vote successful' : await response.text()
      }
    }

    return { success: false, error: 'Invalid action' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function calculateCost(model: string, usage: any): number {
  if (!usage) return 0

  // Simplified cost calculation - you'd want to implement actual pricing
  const costPer1kTokens = 0.001 // $0.001 per 1k tokens as example
  return (usage.total_tokens / 1000) * costPer1kTokens
}