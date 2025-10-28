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

    const { 
      post_id, 
      campaign_id, 
      company_id, 
      post_content, 
      post_title, 
      ai_settings, 
      engagement_rules 
    } = await req.json()

    console.log(`Generating AI response for post ${post_id}`)

    // Get company profile for context
    const { data: company } = await supabaseClient
      .from('companies_2025_10_25_19_00')
      .select('*')
      .eq('id', company_id)
      .single()

    if (!company) {
      throw new Error('Company not found')
    }

    // Get campaign details
    const { data: campaign } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .select('*')
      .eq('id', campaign_id)
      .single()

    // Get relevant business context and documents
    const relevantContext = await getRelevantContext(supabaseClient, campaign_id, post_title + ' ' + post_content)

    // Generate AI response with enhanced context
    const aiResponse = await generateAIResponse({
      post_title,
      post_content,
      company,
      campaign,
      ai_settings,
      engagement_rules,
      context: relevantContext
    })

    // Analyze sentiment and engagement potential
    const sentimentScore = await analyzeSentiment(aiResponse.response)
    const engagementPotential = calculateEngagementPotential(post_content, aiResponse.response)

    // Store the generated response
    const { data: storedResponse, error } = await supabaseClient
      .from('comment_responses_2025_10_25_19_00')
      .insert({
        campaign_id,
        post_id,
        company_id,
        original_post_title: post_title,
        original_post_content: post_content,
        original_post_url: `https://example.com/post/${post_id}`,
        original_author: 'discovered_user',
        platform: campaign?.platform || 'reddit',
        ai_generated_response: aiResponse.response,
        ai_model_used: ai_settings?.model || 'gpt-3.5-turbo',
        ai_confidence_score: aiResponse.confidence,
        status: 'pending',
        priority: determinePriority(engagementPotential, sentimentScore),
        sentiment_score: sentimentScore,
        engagement_potential: engagementPotential,
        tags: extractTags(post_content, aiResponse.response),
        context_used: relevantContext.map(ctx => ctx.id)
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Track context usage
    if (relevantContext.length > 0) {
      await supabaseClient
        .from('ai_context_usage_2025_10_25_19_00')
        .insert({
          response_id: storedResponse.id,
          campaign_id,
          knowledge_base_ids: relevantContext.filter(ctx => ctx.source_type === 'knowledge_base').map(ctx => ctx.id),
          business_context_ids: relevantContext.filter(ctx => ctx.source_type === 'business_context').map(ctx => ctx.id),
          context_relevance_score: relevantContext.reduce((sum, ctx) => sum + ctx.relevance_score, 0) / relevantContext.length,
          context_summary: relevantContext.map(ctx => ctx.title || ctx.document_name).join(', ')
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        response_id: storedResponse.id,
        ai_response: aiResponse.response,
        confidence: aiResponse.confidence,
        sentiment_score: sentimentScore,
        engagement_potential: engagementPotential,
        priority: determinePriority(engagementPotential, sentimentScore),
        reasoning: aiResponse.reasoning
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('AI response generation error:', error)
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

async function getRelevantContext(supabaseClient, campaignId, query) {
  try {
    // Call the document processing engine to search for relevant context
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/document_processing_engine_2025_10_25_19_00`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'search_context',
        campaign_id: campaignId,
        query: query,
        max_results: 5
      })
    })

    if (!response.ok) {
      console.error('Context search failed:', response.status)
      return []
    }

    const result = await response.json()
    return result.result || []
  } catch (error) {
    console.error('Error getting relevant context:', error)
    return []
  }
}

async function generateAIResponse({ post_title, post_content, company, campaign, ai_settings, engagement_rules, context = [] }) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')
  
  if (!openaiApiKey && !claudeApiKey) {
    throw new Error('No AI API keys configured')
  }

  // Build context-aware system prompt with intelligence
  const systemPrompt = buildEnhancedSystemPrompt(company, engagement_rules, context)
  
  // Build user prompt with post context and relevant background
  const userPrompt = buildEnhancedUserPrompt(post_title, post_content, company, campaign, context)

  let aiResponse
  const model = ai_settings?.model || 'gpt-3.5-turbo'

  if (model.startsWith('gpt') && openaiApiKey) {
    aiResponse = await callOpenAI(systemPrompt, userPrompt, ai_settings, openaiApiKey)
  } else if (model.startsWith('claude') && claudeApiKey) {
    aiResponse = await callClaude(systemPrompt, userPrompt, ai_settings, claudeApiKey)
  } else {
    // Fallback to mock response for demo
    aiResponse = generateMockResponse(post_title, post_content, company)
  }

  return aiResponse
}

function buildEnhancedSystemPrompt(company, engagement_rules, context = []) {
  const brandVoice = company.brand_voice || 'professional'
  const responseStyle = engagement_rules?.response_style || 'helpful'
  const personalityTone = engagement_rules?.personality_tone || 'professional'
  
  let prompt = `You are a ${brandVoice} representative of ${company.name}, ${company.tagline}. `
  prompt += `Your company specializes in ${company.industry}. `
  prompt += `Your target audience is: ${company.target_audience}. `
  
  if (company.messaging_guidelines) {
    prompt += `Messaging guidelines: ${company.messaging_guidelines} `
  }
  
  prompt += `Response style should be ${responseStyle} with a ${personalityTone} tone. `
  
  if (company.unique_selling_points) {
    prompt += `Key differentiators: ${company.unique_selling_points.join(', ')}. `
  }
  
  // Add context-specific knowledge
  if (context.length > 0) {
    prompt += `\n\nRELEVANT COMPANY CONTEXT:\n`
    context.forEach((ctx, index) => {
      if (ctx.source_type === 'business_context') {
        prompt += `${index + 1}. ${ctx.title}: ${ctx.content.substring(0, 300)}...\n`
      } else if (ctx.source_type === 'knowledge_base') {
        prompt += `${index + 1}. Document "${ctx.document_name}": ${ctx.document_summary || ctx.extracted_text?.substring(0, 300)}...\n`
      }
    })
    prompt += `Use this context to provide more informed, specific responses that demonstrate deep knowledge of our company and offerings. `
  }
  
  if (company.do_not_mention && company.do_not_mention.length > 0) {
    prompt += `NEVER mention: ${company.do_not_mention.join(', ')}. `
  }
  
  if (!company.competitor_mentions_allowed) {
    prompt += `Do not mention competitors by name. `
  }
  
  prompt += `Keep responses under ${engagement_rules?.max_response_length || 200} characters. `
  
  if (engagement_rules?.include_emojis) {
    prompt += `Include relevant emojis. `
  }
  
  if (engagement_rules?.include_questions) {
    prompt += `End with an engaging question when appropriate. `
  }
  
  if (engagement_rules?.avoid_controversy) {
    prompt += `Avoid controversial topics and maintain a positive, helpful tone. `
  }

  return prompt
}

function buildEnhancedUserPrompt(post_title, post_content, company, campaign, context = []) {
  let prompt = `Please create a helpful, engaging response to this social media post:\n\n`
  prompt += `Title: "${post_title}"\n`
  prompt += `Content: "${post_content}"\n\n`
  
  prompt += `Context: This is for a ${campaign?.platform || 'social media'} campaign. `
  
  // Add specific context insights
  if (context.length > 0) {
    const relevantInsights = context
      .filter(ctx => ctx.relevance_score > 0.5)
      .map(ctx => {
        if (ctx.source_type === 'business_context') {
          return `- ${ctx.title}: ${ctx.summary || ctx.content.substring(0, 150)}`
        } else {
          return `- From ${ctx.document_name}: ${ctx.document_summary?.substring(0, 150)}`
        }
      })
      .join('\n')
    
    if (relevantInsights) {
      prompt += `\n\nRELEVANT INSIGHTS TO REFERENCE:\n${relevantInsights}\n\n`
    }
  }
  
  if (company.response_templates) {
    const templates = typeof company.response_templates === 'string' 
      ? JSON.parse(company.response_templates) 
      : company.response_templates
    
    if (templates.introduction) {
      prompt += `You can reference this introduction: "${templates.introduction}" `
    }
  }
  
  prompt += `The response should provide genuine value while subtly showcasing ${company.name}'s expertise. `
  prompt += `Use the provided context to give specific, knowledgeable answers that demonstrate deep understanding. `
  prompt += `Focus on being helpful first, promotional second.`

  return prompt
}

function buildSystemPrompt(company, engagement_rules) {
  const brandVoice = company.brand_voice || 'professional'
  const responseStyle = engagement_rules?.response_style || 'helpful'
  const personalityTone = engagement_rules?.personality_tone || 'professional'
  
  let prompt = `You are a ${brandVoice} representative of ${company.name}, ${company.tagline}. `
  prompt += `Your company specializes in ${company.industry}. `
  prompt += `Your target audience is: ${company.target_audience}. `
  
  if (company.messaging_guidelines) {
    prompt += `Messaging guidelines: ${company.messaging_guidelines} `
  }
  
  prompt += `Response style should be ${responseStyle} with a ${personalityTone} tone. `
  
  if (company.unique_selling_points) {
    prompt += `Key differentiators: ${company.unique_selling_points.join(', ')}. `
  }
  
  if (company.do_not_mention && company.do_not_mention.length > 0) {
    prompt += `NEVER mention: ${company.do_not_mention.join(', ')}. `
  }
  
  if (!company.competitor_mentions_allowed) {
    prompt += `Do not mention competitors by name. `
  }
  
  prompt += `Keep responses under ${engagement_rules?.max_response_length || 200} characters. `
  
  if (engagement_rules?.include_emojis) {
    prompt += `Include relevant emojis. `
  }
  
  if (engagement_rules?.include_questions) {
    prompt += `End with an engaging question when appropriate. `
  }
  
  if (engagement_rules?.avoid_controversy) {
    prompt += `Avoid controversial topics and maintain a positive, helpful tone. `
  }

  return prompt
}

function buildUserPrompt(post_title, post_content, company, campaign) {
  let prompt = `Please create a helpful, engaging response to this social media post:\n\n`
  prompt += `Title: "${post_title}"\n`
  prompt += `Content: "${post_content}"\n\n`
  
  prompt += `Context: This is for a ${campaign?.platform || 'social media'} campaign. `
  
  if (company.response_templates) {
    const templates = typeof company.response_templates === 'string' 
      ? JSON.parse(company.response_templates) 
      : company.response_templates
    
    if (templates.introduction) {
      prompt += `You can reference this introduction: "${templates.introduction}" `
    }
  }
  
  prompt += `The response should provide genuine value while subtly showcasing ${company.name}'s expertise. `
  prompt += `Focus on being helpful first, promotional second.`

  return prompt
}

async function callOpenAI(systemPrompt, userPrompt, ai_settings, apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ai_settings?.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: ai_settings?.temperature || 0.7,
        max_tokens: ai_settings?.max_tokens || 150,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || ''
    
    return {
      response: aiResponse,
      confidence: 0.85,
      reasoning: 'Generated using OpenAI GPT model with company-specific context'
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

async function callClaude(systemPrompt, userPrompt, ai_settings, apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ai_settings?.model || 'claude-3-sonnet-20240229',
        max_tokens: ai_settings?.max_tokens || 150,
        temperature: ai_settings?.temperature || 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.content[0]?.text || ''
    
    return {
      response: aiResponse,
      confidence: 0.88,
      reasoning: 'Generated using Claude with company-specific context'
    }
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}

function generateMockResponse(post_title, post_content, company) {
  // Fallback mock response for demo purposes
  const responses = [
    `Great question! ${company.name} has helped many businesses tackle similar challenges. Our approach focuses on ${company.industry.toLowerCase()} solutions that deliver real results. What specific aspect would you like to explore further?`,
    `This is exactly the type of problem ${company.name} specializes in solving. We've seen great success with our ${company.industry.toLowerCase()} platform. Happy to share some insights - what's your biggest challenge right now?`,
    `Interesting perspective! At ${company.name}, we've found that ${company.industry.toLowerCase()} can really make a difference here. Our clients typically see significant improvements. Would love to hear about your experience!`
  ]
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)]
  
  return {
    response: randomResponse,
    confidence: 0.75,
    reasoning: 'Generated using fallback template system (demo mode)'
  }
}

async function analyzeSentiment(text) {
  // Simple sentiment analysis - in production, use proper NLP service
  const positiveWords = ['great', 'excellent', 'amazing', 'helpful', 'good', 'best', 'love', 'awesome']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing']
  
  const words = text.toLowerCase().split(/\s+/)
  let score = 0.5 // neutral baseline
  
  for (const word of words) {
    if (positiveWords.includes(word)) score += 0.1
    if (negativeWords.includes(word)) score -= 0.1
  }
  
  return Math.max(0, Math.min(1, score))
}

function calculateEngagementPotential(postContent, response) {
  let score = 5 // baseline
  
  // Longer, detailed posts tend to get more engagement
  if (postContent.length > 200) score += 1
  if (postContent.includes('?')) score += 1 // questions engage more
  
  // Response quality factors
  if (response.includes('?')) score += 1 // engaging questions
  if (response.length > 50 && response.length < 200) score += 1 // optimal length
  if (response.includes('!')) score += 0.5 // enthusiasm
  
  return Math.max(1, Math.min(10, score))
}

function determinePriority(engagementPotential, sentimentScore) {
  if (engagementPotential >= 8 && sentimentScore >= 0.7) return 3 // high
  if (engagementPotential >= 6 && sentimentScore >= 0.5) return 2 // medium
  return 1 // low
}

function extractTags(postContent, response) {
  const commonTags = ['business', 'automation', 'AI', 'technology', 'startup', 'marketing', 'growth']
  const tags = []
  
  const combinedText = (postContent + ' ' + response).toLowerCase()
  
  for (const tag of commonTags) {
    if (combinedText.includes(tag.toLowerCase())) {
      tags.push(tag)
    }
  }
  
  return tags.slice(0, 5) // limit to 5 tags
}