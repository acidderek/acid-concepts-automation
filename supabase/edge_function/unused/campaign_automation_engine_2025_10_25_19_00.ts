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

    const { action, campaign_id, user_id } = await req.json()

    console.log(`Campaign Automation: ${action} for campaign ${campaign_id}`)

    let result
    switch (action) {
      case 'create_campaign':
        result = await createRealCampaign(supabaseClient, await req.json())
        break
      case 'start_campaign':
        result = await startCampaign(supabaseClient, campaign_id, user_id)
        break
      case 'stop_campaign':
        result = await stopCampaign(supabaseClient, campaign_id, user_id)
        break
      case 'get_campaign_status':
        result = await getCampaignStatus(supabaseClient, campaign_id, user_id)
        break
      case 'execute_campaign_cycle':
        result = await executeCampaignCycle(supabaseClient, campaign_id)
        break
      case 'get_campaign_results':
        result = await getCampaignResults(supabaseClient, campaign_id, user_id)
        break
      case 'update_campaign':
        result = await updateCampaign(supabaseClient, await req.json())
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Campaign Automation error:', error)
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

async function createRealCampaign(supabaseClient, campaignData) {
  try {
    const {
      user_id,
      company_id,
      name,
      platform,
      target_location,
      keywords,
      monitoring_rules,
      engagement_rules,
      schedule_settings,
      ai_settings
    } = campaignData

    // Create campaign in database
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .insert({
        user_id,
        company_id,
        name,
        platform,
        target_location,
        keywords: keywords.split(',').map(k => k.trim()),
        status: 'draft',
        monitoring_rules,
        engagement_rules,
        schedule_settings,
        ai_settings,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // Create campaign intelligence settings
    const { error: intelligenceError } = await supabaseClient
      .from('campaign_intelligence_settings_2025_10_25_19_00')
      .insert({
        campaign_id: campaign.id,
        storage_bucket_name: 'campaign-intelligence-docs',
        max_file_size_mb: 25,
        allowed_file_types: ['pdf', 'docx', 'txt', 'md', 'csv', 'pptx'],
        use_document_context: true,
        use_business_context: true,
        context_relevance_threshold: 0.7,
        max_context_length: 2000,
        auto_extract_text: true,
        auto_generate_summaries: true,
        auto_extract_keywords: true,
        enable_semantic_search: true,
        learn_from_performance: true,
        update_context_effectiveness: true,
        user_id
      })

    if (intelligenceError) {
      console.error('Failed to create intelligence settings:', intelligenceError)
    }

    // Initialize campaign analytics
    const { error: analyticsError } = await supabaseClient
      .from('campaign_analytics_2025_10_25_19_00')
      .insert({
        campaign_id: campaign.id,
        date_hour: new Date().toISOString().slice(0, 13) + ':00:00Z',
        posts_discovered: 0,
        posts_filtered: 0,
        responses_generated: 0,
        responses_approved: 0,
        responses_posted: 0,
        total_upvotes: 0,
        total_downvotes: 0,
        total_replies: 0,
        total_shares: 0,
        avg_sentiment_score: 0,
        processing_time_ms: 0
      })

    if (analyticsError) {
      console.error('Failed to initialize analytics:', analyticsError)
    }

    return {
      campaign_id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      created_at: campaign.created_at,
      intelligence_configured: !intelligenceError,
      analytics_initialized: !analyticsError
    }

  } catch (error) {
    console.error('Create campaign error:', error)
    throw error
  }
}

async function startCampaign(supabaseClient, campaignId, userId) {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError) throw campaignError
    if (!campaign) throw new Error('Campaign not found')

    // Validate campaign has required settings
    const validation = await validateCampaignSettings(supabaseClient, campaignId, userId)
    if (!validation.is_valid) {
      throw new Error(`Campaign validation failed: ${validation.errors.join(', ')}`)
    }

    // Update campaign status to active
    const { error: updateError } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Start the campaign scheduler
    const schedulerResult = await supabaseClient.functions.invoke('campaign_scheduler_2025_10_25_19_00', {
      body: {
        campaign_id: campaignId,
        action: 'start'
      }
    })

    if (schedulerResult.error) {
      console.error('Scheduler start error:', schedulerResult.error)
    }

    // Execute first cycle immediately
    const firstCycle = await executeCampaignCycle(supabaseClient, campaignId)

    return {
      campaign_id: campaignId,
      status: 'active',
      started_at: new Date().toISOString(),
      scheduler_started: !schedulerResult.error,
      first_cycle_executed: firstCycle.success,
      validation: validation,
      next_execution: calculateNextExecution(campaign.schedule_settings)
    }

  } catch (error) {
    // Revert campaign status if start failed
    await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .update({ status: 'error', error_message: error.message })
      .eq('id', campaignId)
      .eq('user_id', userId)

    throw error
  }
}

async function stopCampaign(supabaseClient, campaignId, userId) {
  try {
    // Update campaign status
    const { error: updateError } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .update({
        status: 'stopped',
        stopped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Stop the scheduler
    const schedulerResult = await supabaseClient.functions.invoke('campaign_scheduler_2025_10_25_19_00', {
      body: {
        campaign_id: campaignId,
        action: 'stop'
      }
    })

    return {
      campaign_id: campaignId,
      status: 'stopped',
      stopped_at: new Date().toISOString(),
      scheduler_stopped: !schedulerResult.error
    }

  } catch (error) {
    throw error
  }
}

async function getCampaignStatus(supabaseClient, campaignId, userId) {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .select(`
        *,
        companies_2025_10_25_19_00(name, industry)
      `)
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError) throw campaignError

    // Get latest analytics
    const { data: analytics } = await supabaseClient
      .from('campaign_analytics_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date_hour', { ascending: false })
      .limit(24) // Last 24 hours

    // Get recent comments/responses
    const { data: recentResponses } = await supabaseClient
      .from('comment_responses_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate status metrics
    const totalAnalytics = analytics?.reduce((acc, curr) => ({
      posts_discovered: acc.posts_discovered + curr.posts_discovered,
      responses_generated: acc.responses_generated + curr.responses_generated,
      responses_posted: acc.responses_posted + curr.responses_posted,
      total_engagement: acc.total_engagement + curr.total_upvotes + curr.total_replies
    }), { posts_discovered: 0, responses_generated: 0, responses_posted: 0, total_engagement: 0 })

    return {
      campaign,
      status: {
        is_active: campaign.status === 'active',
        runtime: campaign.started_at ? Date.now() - new Date(campaign.started_at).getTime() : 0,
        last_execution: campaign.last_execution,
        next_execution: calculateNextExecution(campaign.schedule_settings),
        error_message: campaign.error_message
      },
      metrics: totalAnalytics,
      recent_responses: recentResponses || [],
      analytics_summary: {
        total_hours: analytics?.length || 0,
        avg_posts_per_hour: analytics?.length ? totalAnalytics.posts_discovered / analytics.length : 0,
        success_rate: totalAnalytics.responses_generated > 0 ? 
          (totalAnalytics.responses_posted / totalAnalytics.responses_generated * 100).toFixed(1) : 0
      }
    }

  } catch (error) {
    throw error
  }
}

async function executeCampaignCycle(supabaseClient, campaignId) {
  try {
    console.log(`Executing campaign cycle for ${campaignId}`)

    // Get campaign details
    const { data: campaign } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaign) throw new Error('Campaign not found')

    const results = {
      discovery: null,
      ai_generation: null,
      posting: null,
      errors: []
    }

    // 1. Post Discovery
    try {
      const discoveryResult = await supabaseClient.functions.invoke('post_discovery_engine_2025_10_25_19_00', {
        body: {
          campaign_id: campaignId,
          platform: campaign.platform,
          monitoring_rules: campaign.monitoring_rules
        }
      })

      results.discovery = discoveryResult.data || discoveryResult.error
    } catch (error) {
      results.errors.push(`Discovery failed: ${error.message}`)
    }

    // 2. AI Response Generation (for discovered posts)
    if (results.discovery && !results.discovery.error) {
      try {
        // Get recent discovered posts that need responses
        const { data: posts } = await supabaseClient
          .from('discovered_posts_2025_10_25_19_00')
          .select('*')
          .eq('campaign_id', campaignId)
          .is('response_generated', false)
          .limit(5) // Process 5 posts per cycle

        for (const post of posts || []) {
          try {
            const aiResult = await supabaseClient.functions.invoke('ai_response_generator_2025_10_25_19_00', {
              body: {
                post_id: post.id,
                campaign_id: campaignId,
                company_id: campaign.company_id,
                post_content: post.content,
                post_title: post.title,
                ai_settings: campaign.ai_settings,
                engagement_rules: campaign.engagement_rules
              }
            })

            if (!aiResult.error) {
              results.ai_generation = (results.ai_generation || 0) + 1
            }
          } catch (error) {
            results.errors.push(`AI generation failed for post ${post.id}: ${error.message}`)
          }
        }
      } catch (error) {
        results.errors.push(`AI generation phase failed: ${error.message}`)
      }
    }

    // 3. Auto-posting (for approved responses)
    try {
      // Get approved responses ready for posting
      const { data: approvedResponses } = await supabaseClient
        .from('comment_responses_2025_10_25_19_00')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved')
        .is('posted_at', null)
        .limit(3) // Post 3 responses per cycle

      for (const response of approvedResponses || []) {
        try {
          const postResult = await supabaseClient.functions.invoke('auto_posting_system_2025_10_25_19_00', {
            body: {
              response_id: response.id,
              platform: campaign.platform,
              post_url: response.post_url,
              response_text: response.response_text
            }
          })

          if (!postResult.error) {
            results.posting = (results.posting || 0) + 1
          }
        } catch (error) {
          results.errors.push(`Posting failed for response ${response.id}: ${error.message}`)
        }
      }
    } catch (error) {
      results.errors.push(`Posting phase failed: ${error.message}`)
    }

    // Update campaign last execution
    await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .update({
        last_execution: new Date().toISOString(),
        execution_count: (campaign.execution_count || 0) + 1
      })
      .eq('id', campaignId)

    return {
      success: results.errors.length === 0,
      campaign_id: campaignId,
      executed_at: new Date().toISOString(),
      results,
      next_execution: calculateNextExecution(campaign.schedule_settings)
    }

  } catch (error) {
    console.error('Campaign cycle execution error:', error)
    throw error
  }
}

async function validateCampaignSettings(supabaseClient, campaignId, userId) {
  const errors = []

  try {
    // Check if campaign has required API keys
    const { data: campaign } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .select('platform, company_id')
      .eq('id', campaignId)
      .single()

    // Check platform API keys
    const { data: apiKeys } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .select('platform, key_type, is_valid')
      .eq('user_id', userId)
      .eq('platform', campaign.platform)
      .eq('is_active', true)

    const validKeys = apiKeys?.filter(key => key.is_valid) || []
    
    if (campaign.platform === 'reddit' && validKeys.length < 2) {
      errors.push('Reddit requires client_id and client_secret')
    }

    // Check if company exists
    const { data: company } = await supabaseClient
      .from('companies_2025_10_25_19_00')
      .select('id')
      .eq('id', campaign.company_id)
      .single()

    if (!company) {
      errors.push('Campaign company not found')
    }

    // Check AI API keys
    const { data: aiKeys } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .select('*')
      .eq('user_id', userId)
      .in('platform', ['openai', 'anthropic'])
      .eq('is_valid', true)
      .eq('is_active', true)

    if (!aiKeys || aiKeys.length === 0) {
      errors.push('AI API key required (OpenAI or Anthropic)')
    }

  } catch (error) {
    errors.push(`Validation error: ${error.message}`)
  }

  return {
    is_valid: errors.length === 0,
    errors
  }
}

function calculateNextExecution(scheduleSettings) {
  if (!scheduleSettings || !scheduleSettings.frequency) {
    return null
  }

  const now = new Date()
  const frequency = scheduleSettings.frequency // in minutes
  const randomDelay = scheduleSettings.randomization ? 
    Math.floor(Math.random() * (scheduleSettings.max_delay - scheduleSettings.min_delay)) + scheduleSettings.min_delay : 0

  const nextExecution = new Date(now.getTime() + (frequency + randomDelay) * 60 * 1000)
  return nextExecution.toISOString()
}

async function getCampaignResults(supabaseClient, campaignId, userId) {
  try {
    // Get comprehensive campaign results
    const { data: analytics } = await supabaseClient
      .from('campaign_analytics_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date_hour', { ascending: false })
      .limit(168) // Last week

    const { data: responses } = await supabaseClient
      .from('comment_responses_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    const { data: roi } = await supabaseClient
      .from('roi_tracking_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })
      .limit(30)

    return {
      campaign_id: campaignId,
      analytics: analytics || [],
      responses: responses || [],
      roi_data: roi || [],
      summary: {
        total_posts_discovered: analytics?.reduce((sum, a) => sum + a.posts_discovered, 0) || 0,
        total_responses_generated: analytics?.reduce((sum, a) => sum + a.responses_generated, 0) || 0,
        total_responses_posted: analytics?.reduce((sum, a) => sum + a.responses_posted, 0) || 0,
        total_engagement: analytics?.reduce((sum, a) => sum + a.total_upvotes + a.total_replies, 0) || 0,
        avg_sentiment: analytics?.length ? 
          analytics.reduce((sum, a) => sum + a.avg_sentiment_score, 0) / analytics.length : 0
      }
    }

  } catch (error) {
    throw error
  }
}

async function updateCampaign(supabaseClient, campaignData) {
  try {
    const { campaign_id, user_id, ...updateData } = campaignData

    const { data, error } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error

    return {
      campaign_id,
      updated_at: data.updated_at,
      changes: Object.keys(updateData)
    }

  } catch (error) {
    throw error
  }
}