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

    const url = new URL(req.url)
    const reportType = url.searchParams.get('type') || 'overview'
    const campaignId = url.searchParams.get('campaign_id')
    const companyId = url.searchParams.get('company_id')
    const dateRange = url.searchParams.get('date_range') || '7d'
    const platform = url.searchParams.get('platform')

    console.log(`Analytics request: ${reportType}, campaign: ${campaignId}, company: ${companyId}`)

    let analyticsData
    switch (reportType) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(supabaseClient, { campaignId, companyId, dateRange, platform })
        break
      case 'performance':
        analyticsData = await getPerformanceAnalytics(supabaseClient, { campaignId, companyId, dateRange, platform })
        break
      case 'roi':
        analyticsData = await getROIAnalytics(supabaseClient, { campaignId, companyId, dateRange })
        break
      case 'sentiment':
        analyticsData = await getSentimentAnalytics(supabaseClient, { campaignId, companyId, dateRange, platform })
        break
      case 'competitors':
        analyticsData = await getCompetitorAnalytics(supabaseClient, { companyId, dateRange, platform })
        break
      case 'engagement':
        analyticsData = await getEngagementAnalytics(supabaseClient, { campaignId, companyId, dateRange, platform })
        break
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_type: reportType,
        date_range: dateRange,
        generated_at: new Date().toISOString(),
        data: analyticsData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Analytics error:', error)
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

async function getOverviewAnalytics(supabaseClient, filters) {
  const dateFilter = getDateFilter(filters.dateRange)
  
  // Get campaign summary
  const { data: campaignSummary } = await supabaseClient
    .from('campaign_analytics_2025_10_25_19_00')
    .select(`
      posts_discovered,
      responses_generated,
      responses_approved,
      responses_posted,
      total_upvotes,
      total_replies,
      avg_engagement_score,
      avg_sentiment_score,
      platform
    `)
    .gte('date_recorded', dateFilter)
    .eq(filters.campaignId ? 'campaign_id' : 'company_id', filters.campaignId || filters.companyId)

  // Aggregate the data
  const summary = campaignSummary?.reduce((acc, row) => ({
    posts_discovered: acc.posts_discovered + row.posts_discovered,
    responses_generated: acc.responses_generated + row.responses_generated,
    responses_approved: acc.responses_approved + row.responses_approved,
    responses_posted: acc.responses_posted + row.responses_posted,
    total_upvotes: acc.total_upvotes + row.total_upvotes,
    total_replies: acc.total_replies + row.total_replies,
    avg_engagement_score: (acc.avg_engagement_score + row.avg_engagement_score) / 2,
    avg_sentiment_score: (acc.avg_sentiment_score + row.avg_sentiment_score) / 2,
    platforms: [...new Set([...acc.platforms, row.platform])]
  }), {
    posts_discovered: 0,
    responses_generated: 0,
    responses_approved: 0,
    responses_posted: 0,
    total_upvotes: 0,
    total_replies: 0,
    avg_engagement_score: 0,
    avg_sentiment_score: 0,
    platforms: []
  }) || {}

  // Get ROI summary
  const { data: roiSummary } = await supabaseClient
    .from('roi_tracking_2025_10_25_19_00')
    .select(`
      total_costs,
      leads_generated,
      conversions,
      estimated_revenue,
      roi_percentage
    `)
    .gte('date_recorded', dateFilter)
    .eq(filters.campaignId ? 'campaign_id' : 'company_id', filters.campaignId || filters.companyId)

  const roiData = roiSummary?.reduce((acc, row) => ({
    total_costs: acc.total_costs + row.total_costs,
    leads_generated: acc.leads_generated + row.leads_generated,
    conversions: acc.conversions + row.conversions,
    estimated_revenue: acc.estimated_revenue + row.estimated_revenue,
    avg_roi_percentage: (acc.avg_roi_percentage + row.roi_percentage) / 2
  }), {
    total_costs: 0,
    leads_generated: 0,
    conversions: 0,
    estimated_revenue: 0,
    avg_roi_percentage: 0
  }) || {}

  return {
    summary,
    roi: roiData,
    key_metrics: {
      conversion_rate: summary.responses_posted > 0 ? (roiData.conversions / summary.responses_posted * 100).toFixed(2) : 0,
      cost_per_response: summary.responses_posted > 0 ? (roiData.total_costs / summary.responses_posted).toFixed(2) : 0,
      engagement_rate: summary.responses_posted > 0 ? ((summary.total_upvotes + summary.total_replies) / summary.responses_posted).toFixed(2) : 0,
      approval_rate: summary.responses_generated > 0 ? (summary.responses_approved / summary.responses_generated * 100).toFixed(2) : 0
    }
  }
}

async function getPerformanceAnalytics(supabaseClient, filters) {
  const dateFilter = getDateFilter(filters.dateRange)
  
  // Get daily performance data
  const { data: dailyData } = await supabaseClient
    .from('campaign_analytics_2025_10_25_19_00')
    .select(`
      date_recorded,
      posts_discovered,
      responses_generated,
      responses_approved,
      responses_posted,
      total_upvotes,
      total_replies,
      avg_engagement_score,
      platform
    `)
    .gte('date_recorded', dateFilter)
    .eq(filters.campaignId ? 'campaign_id' : 'company_id', filters.campaignId || filters.companyId)
    .order('date_recorded', { ascending: true })

  // Get hourly performance for today
  const { data: hourlyData } = await supabaseClient
    .from('campaign_analytics_2025_10_25_19_00')
    .select(`
      hour_recorded,
      posts_discovered,
      responses_generated,
      responses_posted,
      avg_engagement_score
    `)
    .eq('date_recorded', new Date().toISOString().split('T')[0])
    .eq(filters.campaignId ? 'campaign_id' : 'company_id', filters.campaignId || filters.companyId)
    .order('hour_recorded', { ascending: true })

  // Platform breakdown
  const platformBreakdown = dailyData?.reduce((acc, row) => {
    if (!acc[row.platform]) {
      acc[row.platform] = {
        posts_discovered: 0,
        responses_generated: 0,
        responses_posted: 0,
        total_engagement: 0
      }
    }
    acc[row.platform].posts_discovered += row.posts_discovered
    acc[row.platform].responses_generated += row.responses_generated
    acc[row.platform].responses_posted += row.responses_posted
    acc[row.platform].total_engagement += row.total_upvotes + row.total_replies
    return acc
  }, {}) || {}

  return {
    daily_performance: dailyData || [],
    hourly_performance: hourlyData || [],
    platform_breakdown: platformBreakdown,
    trends: calculateTrends(dailyData || [])
  }
}

async function getROIAnalytics(supabaseClient, filters) {
  const dateFilter = getDateFilter(filters.dateRange)
  
  const { data: roiData } = await supabaseClient
    .from('roi_tracking_2025_10_25_19_00')
    .select('*')
    .gte('date_recorded', dateFilter)
    .eq(filters.campaignId ? 'campaign_id' : 'company_id', filters.campaignId || filters.companyId)
    .order('date_recorded', { ascending: true })

  const totalROI = roiData?.reduce((acc, row) => ({
    total_costs: acc.total_costs + row.total_costs,
    total_revenue: acc.total_revenue + row.estimated_revenue,
    total_leads: acc.total_leads + row.leads_generated,
    total_conversions: acc.total_conversions + row.conversions
  }), {
    total_costs: 0,
    total_revenue: 0,
    total_leads: 0,
    total_conversions: 0
  }) || {}

  const roiPercentage = totalROI.total_costs > 0 
    ? ((totalROI.total_revenue - totalROI.total_costs) / totalROI.total_costs * 100).toFixed(2)
    : 0

  return {
    daily_roi: roiData || [],
    summary: {
      ...totalROI,
      roi_percentage: roiPercentage,
      cost_per_lead: totalROI.total_leads > 0 ? (totalROI.total_costs / totalROI.total_leads).toFixed(2) : 0,
      cost_per_conversion: totalROI.total_conversions > 0 ? (totalROI.total_costs / totalROI.total_conversions).toFixed(2) : 0,
      conversion_rate: totalROI.total_leads > 0 ? (totalROI.total_conversions / totalROI.total_leads * 100).toFixed(2) : 0
    }
  }
}

async function getSentimentAnalytics(supabaseClient, filters) {
  const dateFilter = getDateFilter(filters.dateRange)
  
  const { data: sentimentData } = await supabaseClient
    .from('campaign_analytics_2025_10_25_19_00')
    .select(`
      date_recorded,
      avg_sentiment_score,
      positive_responses,
      neutral_responses,
      negative_responses,
      platform
    `)
    .gte('date_recorded', dateFilter)
    .eq(filters.campaignId ? 'campaign_id' : 'company_id', filters.campaignId || filters.companyId)
    .order('date_recorded', { ascending: true })

  const sentimentSummary = sentimentData?.reduce((acc, row) => ({
    total_positive: acc.total_positive + row.positive_responses,
    total_neutral: acc.total_neutral + row.neutral_responses,
    total_negative: acc.total_negative + row.negative_responses,
    avg_sentiment: (acc.avg_sentiment + row.avg_sentiment_score) / 2
  }), {
    total_positive: 0,
    total_neutral: 0,
    total_negative: 0,
    avg_sentiment: 0
  }) || {}

  const totalResponses = sentimentSummary.total_positive + sentimentSummary.total_neutral + sentimentSummary.total_negative

  return {
    daily_sentiment: sentimentData || [],
    summary: {
      ...sentimentSummary,
      positive_percentage: totalResponses > 0 ? (sentimentSummary.total_positive / totalResponses * 100).toFixed(2) : 0,
      neutral_percentage: totalResponses > 0 ? (sentimentSummary.total_neutral / totalResponses * 100).toFixed(2) : 0,
      negative_percentage: totalResponses > 0 ? (sentimentSummary.total_negative / totalResponses * 100).toFixed(2) : 0,
      total_responses: totalResponses
    }
  }
}

async function getCompetitorAnalytics(supabaseClient, filters) {
  const dateFilter = getDateFilter(filters.dateRange)
  
  const { data: competitorData } = await supabaseClient
    .from('competitor_monitoring_2025_10_25_19_00')
    .select('*')
    .gte('discovered_at', dateFilter)
    .eq('company_id', filters.companyId)
    .order('discovered_at', { ascending: false })

  // Competitor summary
  const competitorSummary = competitorData?.reduce((acc, row) => {
    if (!acc[row.competitor_name]) {
      acc[row.competitor_name] = {
        posts_count: 0,
        total_engagement: 0,
        avg_sentiment: 0,
        response_opportunities: 0,
        mentions_us: 0
      }
    }
    acc[row.competitor_name].posts_count += 1
    acc[row.competitor_name].total_engagement += row.upvotes + row.comments_count + row.shares
    acc[row.competitor_name].avg_sentiment = (acc[row.competitor_name].avg_sentiment + row.sentiment_score) / 2
    if (row.response_opportunity) acc[row.competitor_name].response_opportunities += 1
    if (row.our_company_mentioned) acc[row.competitor_name].mentions_us += 1
    return acc
  }, {}) || {}

  // Topic analysis
  const topicAnalysis = competitorData?.reduce((acc, row) => {
    if (row.topic_category) {
      acc[row.topic_category] = (acc[row.topic_category] || 0) + 1
    }
    return acc
  }, {}) || {}

  return {
    recent_posts: competitorData?.slice(0, 20) || [],
    competitor_summary: competitorSummary,
    topic_analysis: topicAnalysis,
    opportunities: competitorData?.filter(row => row.response_opportunity) || [],
    mentions: competitorData?.filter(row => row.our_company_mentioned) || []
  }
}

async function getEngagementAnalytics(supabaseClient, filters) {
  const dateFilter = getDateFilter(filters.dateRange)
  
  const { data: engagementData } = await supabaseClient
    .from('engagement_tracking_2025_10_25_19_00')
    .select(`
      *,
      comment_responses_2025_10_25_19_00!inner(
        campaign_id,
        company_id,
        platform,
        ai_generated_response,
        posted_at
      )
    `)
    .gte('created_at', dateFilter)

  // Filter by campaign or company
  const filteredData = engagementData?.filter(row => {
    if (filters.campaignId) return row.comment_responses_2025_10_25_19_00.campaign_id === filters.campaignId
    if (filters.companyId) return row.comment_responses_2025_10_25_19_00.company_id === filters.companyId
    return true
  }) || []

  const engagementSummary = filteredData.reduce((acc, row) => ({
    total_upvotes: acc.total_upvotes + row.upvotes,
    total_replies: acc.total_replies + row.replies,
    total_shares: acc.total_shares + row.shares,
    total_clicks: acc.total_clicks + row.clicks,
    total_impressions: acc.total_impressions + row.impressions,
    avg_engagement_rate: (acc.avg_engagement_rate + row.engagement_rate) / 2,
    avg_ctr: (acc.avg_ctr + row.click_through_rate) / 2
  }), {
    total_upvotes: 0,
    total_replies: 0,
    total_shares: 0,
    total_clicks: 0,
    total_impressions: 0,
    avg_engagement_rate: 0,
    avg_ctr: 0
  })

  return {
    engagement_data: filteredData,
    summary: engagementSummary,
    top_performing: filteredData
      .sort((a, b) => b.engagement_rate - a.engagement_rate)
      .slice(0, 10)
  }
}

function getDateFilter(dateRange) {
  const now = new Date()
  let daysBack = 7

  switch (dateRange) {
    case '1d': daysBack = 1; break
    case '7d': daysBack = 7; break
    case '30d': daysBack = 30; break
    case '90d': daysBack = 90; break
    default: daysBack = 7
  }

  const filterDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  return filterDate.toISOString().split('T')[0]
}

function calculateTrends(dailyData) {
  if (dailyData.length < 2) return {}

  const recent = dailyData.slice(-3).reduce((acc, row) => ({
    posts: acc.posts + row.posts_discovered,
    responses: acc.responses + row.responses_generated,
    engagement: acc.engagement + row.avg_engagement_score
  }), { posts: 0, responses: 0, engagement: 0 })

  const previous = dailyData.slice(-6, -3).reduce((acc, row) => ({
    posts: acc.posts + row.posts_discovered,
    responses: acc.responses + row.responses_generated,
    engagement: acc.engagement + row.avg_engagement_score
  }), { posts: 0, responses: 0, engagement: 0 })

  return {
    posts_trend: previous.posts > 0 ? ((recent.posts - previous.posts) / previous.posts * 100).toFixed(2) : 0,
    responses_trend: previous.responses > 0 ? ((recent.responses - previous.responses) / previous.responses * 100).toFixed(2) : 0,
    engagement_trend: previous.engagement > 0 ? ((recent.engagement - previous.engagement) / previous.engagement * 100).toFixed(2) : 0
  }
}