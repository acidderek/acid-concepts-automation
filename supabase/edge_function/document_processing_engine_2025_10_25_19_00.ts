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

    const { action, file_path, campaign_id, company_id, document_name, document_type } = await req.json()

    console.log(`Document processing: ${action} for ${document_name}`)

    let result
    switch (action) {
      case 'upload_and_process':
        result = await uploadAndProcessDocument(supabaseClient, {
          file_path,
          campaign_id,
          company_id,
          document_name,
          document_type
        })
        break
      case 'extract_text':
        result = await extractTextFromDocument(file_path, document_type)
        break
      case 'generate_summary':
        result = await generateDocumentSummary(await req.json())
        break
      case 'extract_keywords':
        result = await extractKeywords(await req.json())
        break
      case 'create_embeddings':
        result = await createEmbeddings(await req.json())
        break
      case 'search_context':
        result = await searchRelevantContext(supabaseClient, await req.json())
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
    console.error('Document processing error:', error)
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

async function uploadAndProcessDocument(supabaseClient, { file_path, campaign_id, company_id, document_name, document_type }) {
  try {
    // Create knowledge base entry
    const { data: knowledgeEntry, error: insertError } = await supabaseClient
      .from('campaign_knowledge_base_2025_10_25_19_00')
      .insert({
        campaign_id,
        company_id,
        document_name,
        document_type,
        file_path,
        storage_bucket: 'campaign-intelligence-docs',
        processing_status: 'processing'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Extract text from document
    const extractedText = await extractTextFromDocument(file_path, document_type)
    
    // Generate summary
    const summary = await generateDocumentSummary({ text: extractedText, document_name })
    
    // Extract keywords
    const keywords = await extractKeywords({ text: extractedText })
    
    // Create embeddings for semantic search
    const embeddings = await createEmbeddings({ text: extractedText })

    // Update knowledge base entry with processed data
    const { error: updateError } = await supabaseClient
      .from('campaign_knowledge_base_2025_10_25_19_00')
      .update({
        extracted_text: extractedText,
        document_summary: summary,
        keywords: keywords,
        embedding_data: embeddings,
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', knowledgeEntry.id)

    if (updateError) throw updateError

    return {
      knowledge_base_id: knowledgeEntry.id,
      extracted_text_length: extractedText.length,
      summary_length: summary.length,
      keywords_count: keywords.length,
      processing_status: 'completed'
    }

  } catch (error) {
    console.error('Document upload and processing error:', error)
    
    // Update status to failed if we have an entry
    try {
      await supabaseClient
        .from('campaign_knowledge_base_2025_10_25_19_00')
        .update({
          processing_status: 'failed',
          processing_error: error.message
        })
        .eq('file_path', file_path)
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }
    
    throw error
  }
}

async function extractTextFromDocument(filePath, documentType) {
  try {
    // For demo purposes, we'll simulate text extraction
    // In production, you'd use libraries like pdf-parse, mammoth, etc.
    
    console.log(`Extracting text from ${documentType} file: ${filePath}`)
    
    // Simulate different document types
    switch (documentType.toLowerCase()) {
      case 'pdf':
        return await extractPDFText(filePath)
      case 'docx':
        return await extractDocxText(filePath)
      case 'txt':
      case 'md':
        return await extractPlainText(filePath)
      default:
        throw new Error(`Unsupported document type: ${documentType}`)
    }
  } catch (error) {
    console.error('Text extraction error:', error)
    throw new Error(`Failed to extract text: ${error.message}`)
  }
}

async function extractPDFText(filePath) {
  // In production, you would use a PDF parsing library
  // For demo, return sample extracted text
  return `
    EXTRACTED PDF CONTENT:
    
    Business Automation Strategy Document
    
    Executive Summary:
    This document outlines our comprehensive approach to business process automation, focusing on workflow optimization, customer engagement, and operational efficiency.
    
    Key Objectives:
    1. Reduce manual processing time by 60%
    2. Improve customer response times to under 2 hours
    3. Implement AI-driven decision making for routine tasks
    4. Establish automated reporting and analytics
    
    Implementation Strategy:
    Phase 1: Assessment and Planning (Weeks 1-4)
    - Conduct comprehensive workflow analysis
    - Identify automation opportunities
    - Define success metrics and KPIs
    
    Phase 2: Core System Implementation (Weeks 5-12)
    - Deploy automation platform
    - Configure workflow rules and triggers
    - Integrate with existing systems
    
    Phase 3: Advanced Features (Weeks 13-16)
    - Implement AI-powered features
    - Set up advanced analytics
    - Configure monitoring and alerting
    
    Expected Outcomes:
    - 50% reduction in processing time
    - 90% improvement in accuracy
    - $200K annual cost savings
    - Enhanced customer satisfaction scores
    
    Risk Mitigation:
    - Comprehensive testing protocols
    - Phased rollout approach
    - Staff training and change management
    - Continuous monitoring and optimization
  `
}

async function extractDocxText(filePath) {
  // In production, you would use mammoth.js or similar
  return `
    EXTRACTED DOCX CONTENT:
    
    Company Product Specifications
    
    Product Overview:
    Our flagship automation platform provides end-to-end business process management with AI-powered intelligence and real-time analytics.
    
    Core Features:
    • Workflow Designer: Drag-and-drop interface for creating complex automation workflows
    • AI Assistant: Natural language processing for intelligent task routing
    • Analytics Dashboard: Real-time performance metrics and insights
    • Integration Hub: Pre-built connectors for 200+ business applications
    
    Technical Specifications:
    - Cloud-native architecture with 99.9% uptime SLA
    - Enterprise-grade security with SOC 2 compliance
    - Scalable infrastructure supporting 10,000+ concurrent users
    - API-first design with comprehensive REST and GraphQL endpoints
    
    Pricing Tiers:
    Starter: $99/month - Up to 5 users, basic workflows
    Professional: $299/month - Up to 25 users, advanced features
    Enterprise: Custom pricing - Unlimited users, premium support
    
    Implementation Timeline:
    Week 1-2: Initial setup and configuration
    Week 3-4: Data migration and integration
    Week 5-6: User training and testing
    Week 7-8: Go-live and optimization
  `
}

async function extractPlainText(filePath) {
  // For plain text files, you would read the file directly
  return `
    EXTRACTED TEXT CONTENT:
    
    Customer Success Case Study
    
    Client: TechCorp Solutions
    Industry: Software Development
    Challenge: Manual deployment processes causing delays
    
    Solution Implemented:
    - Automated CI/CD pipeline
    - Intelligent testing protocols
    - Real-time monitoring and alerting
    - Automated rollback capabilities
    
    Results Achieved:
    - 80% reduction in deployment time
    - 95% decrease in deployment errors
    - 40% improvement in developer productivity
    - $150K annual savings in operational costs
    
    Client Testimonial:
    "The automation platform transformed our development workflow. We went from weekly deployments to multiple daily releases with zero downtime."
    - John Smith, CTO, TechCorp Solutions
    
    Key Success Factors:
    1. Comprehensive planning and stakeholder buy-in
    2. Phased implementation approach
    3. Extensive testing and validation
    4. Ongoing training and support
    
    Lessons Learned:
    - Change management is crucial for adoption
    - Regular monitoring prevents issues
    - Continuous optimization drives value
  `
}

async function generateDocumentSummary({ text, document_name }) {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      // Fallback to simple summary generation
      return generateSimpleSummary(text)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating concise, informative summaries of business documents. Focus on key points, objectives, and actionable insights.'
          },
          {
            role: 'user',
            content: `Please create a comprehensive summary of this document titled "${document_name}":\n\n${text.substring(0, 3000)}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || generateSimpleSummary(text)

  } catch (error) {
    console.error('AI summary generation error:', error)
    return generateSimpleSummary(text)
  }
}

function generateSimpleSummary(text) {
  // Simple extractive summary - take first few sentences and key points
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const summary = sentences.slice(0, 3).join('. ') + '.'
  
  // Extract bullet points or numbered items
  const bulletPoints = text.match(/[•\-\*]\s+.+/g) || []
  const numberedPoints = text.match(/\d+\.\s+.+/g) || []
  
  let keyPoints = ''
  if (bulletPoints.length > 0) {
    keyPoints = '\n\nKey Points:\n' + bulletPoints.slice(0, 5).join('\n')
  } else if (numberedPoints.length > 0) {
    keyPoints = '\n\nKey Points:\n' + numberedPoints.slice(0, 5).join('\n')
  }
  
  return summary + keyPoints
}

async function extractKeywords(data) {
  const { text } = data
  
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      return extractSimpleKeywords(text)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract the most important keywords and phrases from the given text. Return only a comma-separated list of keywords, no explanations.'
          },
          {
            role: 'user',
            content: `Extract keywords from this text:\n\n${text.substring(0, 2000)}`
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const keywordsText = data.choices[0]?.message?.content || ''
    return keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0)

  } catch (error) {
    console.error('AI keyword extraction error:', error)
    return extractSimpleKeywords(text)
  }
}

function extractSimpleKeywords(text) {
  // Simple keyword extraction using frequency analysis
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  // Common stop words to exclude
  const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other'])
  
  // Count word frequency
  const wordCount = {}
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1
    }
  })
  
  // Return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word)
}

async function createEmbeddings({ text }) {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      // Return simple hash-based embedding for demo
      return { embedding: generateSimpleEmbedding(text), model: 'simple-hash' }
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input size
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI Embeddings API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      embedding: data.data[0].embedding,
      model: 'text-embedding-ada-002',
      tokens_used: data.usage.total_tokens
    }

  } catch (error) {
    console.error('Embedding creation error:', error)
    return { embedding: generateSimpleEmbedding(text), model: 'simple-hash' }
  }
}

function generateSimpleEmbedding(text) {
  // Simple hash-based embedding for demo purposes
  const words = text.toLowerCase().split(/\s+/).slice(0, 100)
  const embedding = new Array(384).fill(0)
  
  words.forEach((word, index) => {
    const hash = simpleHash(word)
    embedding[hash % 384] += 1
  })
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0)
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

async function searchRelevantContext(supabaseClient, { campaign_id, query, max_results = 5 }) {
  try {
    // Get business context
    const { data: businessContext } = await supabaseClient
      .from('business_context_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(max_results)

    // Get knowledge base documents
    const { data: knowledgeBase } = await supabaseClient
      .from('campaign_knowledge_base_2025_10_25_19_00')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('processing_status', 'completed')
      .order('access_count', { ascending: false })
      .limit(max_results)

    // Simple relevance scoring based on keyword matching
    const queryWords = query.toLowerCase().split(/\s+/)
    
    const scoredContext = [
      ...(businessContext || []).map(ctx => ({
        ...ctx,
        source_type: 'business_context',
        relevance_score: calculateRelevanceScore(ctx.content + ' ' + ctx.title, queryWords)
      })),
      ...(knowledgeBase || []).map(doc => ({
        ...doc,
        source_type: 'knowledge_base',
        relevance_score: calculateRelevanceScore(doc.extracted_text + ' ' + doc.document_summary, queryWords)
      }))
    ]

    // Sort by relevance and return top results
    return scoredContext
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, max_results)

  } catch (error) {
    console.error('Context search error:', error)
    return []
  }
}

function calculateRelevanceScore(text, queryWords) {
  const textWords = text.toLowerCase().split(/\s+/)
  let score = 0
  
  queryWords.forEach(queryWord => {
    const matches = textWords.filter(word => word.includes(queryWord)).length
    score += matches
  })
  
  return score / Math.max(textWords.length, 1) // Normalize by text length
}