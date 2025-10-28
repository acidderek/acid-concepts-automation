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

    const { campaign_id, action } = await req.json()

    console.log(`Campaign scheduler: ${action} for campaign ${campaign_id}`)

    let result
    switch (action) {
      case 'start':
        result = await startCampaign(supabaseClient, campaign_id)
        break
      case 'stop':
        result = await stopCampaign(supabaseClient, campaign_id)
        break
      case 'execute_cycle':
        result = await executeCampaignCycle(supabaseClient, campaign_id)
        break
      case 'get_schedule':
        result = await getCampaignSchedule(supabaseClient, campaign_id)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        campaign_id,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Campaign scheduler error:', error)
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

async function startCampaign(supabaseClient, campaignId) {
  // Get campaign details
  const { data: campaign, error } = await supabaseClient
    .from('campaigns_2025_10_25_19_00')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) {
    throw new Error('Campaign not found')
  }

  // Update campaign status to active
  await supabaseClient
    .from('campaigns_2025_10_25_19_00')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)

  // Calculate next execution time based on schedule
  const scheduleSettings = campaign.schedule_settings || {}
  const nextExecution = calculateNextExecution(scheduleSettings)

  console.log(`Campaign ${campaignId} started. Next execution: ${nextExecution}`)

  return {
    status: 'started',
    next_execution: nextExecution,
    message: 'Campaign activated and scheduled for execution'
  }
}

async function stopCampaign(supabaseClient, campaignId) {
  await supabaseClient
    .from('campaigns_2025_10_25_19_00')
    .update({ 
      status: 'paused',
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)

  return {
    status: 'stopped',
    message: 'Campaign paused and removed from scheduler'
  }
}

async function executeCampaignCycle(supabaseClient, campaignId) {
  console.log(`Executing campaign cycle for ${campaignId}`)

  // Get campaign details
  const { data: campaign } = await supabaseClient
    .from('campaigns_2025_10_25_19_00')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign || campaign.status !== 'active') {
    return { message: 'Campaign not active', executed: false }
  }

  const scheduleSettings = campaign.schedule_settings || {}
  const monitoringRules = campaign.monitoring_rules || {}
  const aiSettings = campaign.ai_settings || {}
  const engagementRules = campaign.engagement_rules || {}

  // Check if we're within active hours
  if (!isWithinActiveHours(scheduleSettings)) {
    return { 
      message: 'Outside active hours', 
      executed: false,
      next_check: calculateNextActiveTime(scheduleSettings)
    }
  }

  const executionResults = {
    posts_discovered: 0,
    responses_generated: 0,
    responses_posted: 0,
    errors: []
  }

  try {
    // Step 1: Discover new posts
    const discoveryResult = await discoverPosts(supabaseClient, campaign, monitoringRules)
    executionResults.posts_discovered = discoveryResult.discovered_count

    // Step 2: Generate AI responses for discovered posts
    const responseResults = await generateResponses(
      supabaseClient, 
      campaign, 
      discoveryResult.posts,
      aiSettings,
      engagementRules
    )
    executionResults.responses_generated = responseResults.generated_count

    // Step 3: Auto-post approved responses (if enabled)
    if (scheduleSettings.auto_post_approved) {
      const postingResults = await postApprovedResponses(supabaseClient, campaignId)
      executionResults.responses_posted = postingResults.posted_count
    }

    // Step 4: Calculate next execution with randomization
    const nextExecution = calculateNextExecutionWithRandomization(scheduleSettings)

    return {
      executed: true,
      execution_time: new Date().toISOString(),
      next_execution: nextExecution,
      results: executionResults,
      message: `Campaign cycle completed successfully`
    }

  } catch (error) {
    executionResults.errors.push(error.message)
    console.error(`Campaign execution error:`, error)
    
    return {
      executed: false,
      error: error.message,
      results: executionResults,
      message: 'Campaign cycle failed'
    }
  }
}

async function discoverPosts(supabaseClient, campaign, monitoringRules) {
  try {
    // Call the post discovery engine
    const discoveryResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/post_discovery_engine_2025_10_25_19_00`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaign_id: campaign.id,
        platform: campaign.platform,
        monitoring_rules: {
          target_location: campaign.target_location,
          include_keywords: campaign.keywords,
          ...monitoringRules
        }
      })
    })

    if (!discoveryResponse.ok) {
      throw new Error(`Discovery failed: ${discoveryResponse.status}`)
    }

    const result = await discoveryResponse.json()
    return {
      discovered_count: result.discovered_count || 0,
      posts: result.posts || []
    }
  } catch (error) {
    console.error('Post discovery error:', error)
    return { discovered_count: 0, posts: [] }
  }
}

async function generateResponses(supabaseClient, campaign, posts, aiSettings, engagementRules) {
  let generatedCount = 0
  const batchSize = aiSettings.batch_size || 5

  // Process posts in batches to avoid overwhelming the AI API
  for (let i = 0; i < posts.length && i < batchSize; i++) {
    const post = posts[i]
    
    try {
      // Call the AI response generator
      const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_response_generator_2025_10_25_19_00`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: post.id,
          campaign_id: campaign.id,
          company_id: campaign.company_id,
          post_content: post.post_content,
          post_title: post.post_title,
          ai_settings: aiSettings,
          engagement_rules: engagementRules
        })
      })

      if (aiResponse.ok) {
        generatedCount++
      }
    } catch (error) {
      console.error(`Failed to generate response for post ${post.id}:`, error)
    }
  }

  return { generated_count: generatedCount }
}

async function postApprovedResponses(supabaseClient, campaignId) {
  // Get approved responses ready for posting
  const { data: approvedResponses } = await supabaseClient
    .from('comment_responses_2025_10_25_19_00')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'approved')
    .limit(5) // Limit to prevent spam

  let postedCount = 0

  for (const response of approvedResponses || []) {
    try {
      // Call the auto-posting system
      const postingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto_posting_system_2025_10_25_19_00`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response_id: response.id,
          platform: response.platform,
          post_url: response.original_post_url,
          response_text: response.edited_response || response.ai_generated_response
        })
      })

      if (postingResponse.ok) {
        postedCount++
      }
    } catch (error) {
      console.error(`Failed to post response ${response.id}:`, error)
    }
  }

  return { posted_count: postedCount }
}

function isWithinActiveHours(scheduleSettings) {
  if (!scheduleSettings.active_hours) return true

  const now = new Date()
  const currentHour = now.getHours()
  const startHour = scheduleSettings.active_hours.start || 0
  const endHour = scheduleSettings.active_hours.end || 23

  // Handle overnight schedules (e.g., 22:00 to 06:00)
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour <= endHour
  }

  return currentHour >= startHour && currentHour <= endHour
}

function calculateNextActiveTime(scheduleSettings) {
  if (!scheduleSettings.active_hours) {
    return new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  }

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(scheduleSettings.active_hours.start || 0, 0, 0, 0)

  return tomorrow.toISOString()
}

function calculateNextExecution(scheduleSettings) {
  const now = new Date()
  const postsPerHour = scheduleSettings.posts_per_hour || 2
  const intervalMinutes = 60 / postsPerHour

  const nextExecution = new Date(now.getTime() + intervalMinutes * 60 * 1000)
  return nextExecution.toISOString()
}

function calculateNextExecutionWithRandomization(scheduleSettings) {
  const now = new Date()
  const postsPerHour = scheduleSettings.posts_per_hour || 2
  const baseIntervalMinutes = 60 / postsPerHour

  let nextIntervalMinutes = baseIntervalMinutes

  // Apply randomization if enabled
  if (scheduleSettings.randomize_delay) {
    const minDelay = scheduleSettings.min_delay || 15
    const maxDelay = scheduleSettings.max_delay || 45
    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay
    nextIntervalMinutes = randomDelay
  }

  const nextExecution = new Date(now.getTime() + nextIntervalMinutes * 60 * 1000)
  return nextExecution.toISOString()
}

async function getCampaignSchedule(supabaseClient, campaignId) {
  const { data: campaign } = await supabaseClient
    .from('campaigns_2025_10_25_19_00')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  const scheduleSettings = campaign.schedule_settings || {}
  const now = new Date()

  return {
    campaign_id: campaignId,
    status: campaign.status,
    schedule_settings: scheduleSettings,
    current_time: now.toISOString(),
    is_active_hours: isWithinActiveHours(scheduleSettings),
    next_execution: calculateNextExecution(scheduleSettings),
    timezone: scheduleSettings.timezone || 'UTC'
  }
}