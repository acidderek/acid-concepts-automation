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
    console.log('API Key Manager: Starting request processing')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request data
    let requestData
    try {
      requestData = await req.json()
      console.log('Request data received:', { 
        action: requestData.action, 
        platform: requestData.platform,
        hasUserId: !!requestData.user_id 
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error(`Invalid JSON: ${parseError.message}`)
    }

    const { action, platform, key_type, key_value, key_name, user_id } = requestData

    // Validate required fields
    if (!action) {
      throw new Error('Missing required field: action')
    }

    let result

    switch (action) {
      case 'store_key':
        console.log('Processing store_key action')
        if (!platform || !key_value || !user_id) {
          throw new Error('Missing required fields for store_key: platform, key_value, user_id')
        }
        result = await storeAPIKey(supabaseClient, { platform, key_type, key_value, key_name, user_id })
        break

      case 'validate_key':
        console.log('Processing validate_key action')
        if (!platform || !key_value) {
          throw new Error('Missing required fields for validate_key: platform, key_value')
        }
        result = await validateAPIKey({ platform, key_type, key_value })
        break

      case 'get_keys':
        console.log('Processing get_keys action')
        if (!user_id) {
          throw new Error('Missing required field for get_keys: user_id')
        }
        result = await getUserAPIKeys(supabaseClient, user_id, platform)
        break

      default:
        throw new Error(`Unsupported action: ${action}`)
    }

    console.log('Action completed successfully:', action)

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
    console.error('API Key Manager error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function storeAPIKey(supabaseClient, { platform, key_type, key_value, key_name, user_id }) {
  try {
    console.log('Storing API key for platform:', platform)
    
    // Simple encryption (Base64 for demo)
    const encryptedKey = btoa(key_value)
    
    // Validate the key first
    const validation = await validateAPIKey({ platform, key_type, key_value })
    console.log('Key validation result:', validation)
    
    // Try to insert into database
    const insertData = {
      user_id,
      platform,
      key_type: key_type || 'api_key',
      encrypted_key: encryptedKey,
      key_name: key_name || `${platform} API Key`,
      is_active: true,
      is_valid: validation.is_valid,
      last_validated: new Date().toISOString(),
      validation_error: validation.error || null
    }

    console.log('Attempting database insert with data:', {
      ...insertData,
      encrypted_key: '[REDACTED]'
    })

    const { data, error } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('API key stored successfully with ID:', data.id)

    return {
      key_id: data.id,
      platform,
      key_type: key_type || 'api_key',
      is_valid: validation.is_valid,
      validation_message: validation.message,
      stored_at: data.created_at
    }

  } catch (error) {
    console.error('Store API key error:', error)
    throw error
  }
}

async function validateAPIKey({ platform, key_type, key_value }) {
  try {
    console.log(`Validating ${platform} API key`)
    
    const startTime = Date.now()
    let validation = { is_valid: false, message: 'Unknown platform', response_time: 0 }

    switch (platform.toLowerCase()) {
      case 'reddit':
        validation = await validateRedditKey(key_type, key_value)
        break
      case 'openai':
        validation = await validateOpenAIKey(key_value)
        break
      case 'openrouter':
        validation = await validateOpenRouterKey(key_value)
        break
      case 'stripe':
        validation = await validateStripeKey(key_type, key_value)
        break
      case 'resend':
        validation = await validateResendKey(key_value)
        break
      default:
        validation = { is_valid: false, message: `Validation not implemented for ${platform}` }
    }

    validation.response_time = Date.now() - startTime
    console.log(`Validation completed for ${platform}:`, validation)
    
    return validation

  } catch (error) {
    console.error('Validation error:', error)
    return {
      is_valid: false,
      message: `Validation error: ${error.message}`,
      response_time: 0
    }
  }
}

async function validateRedditKey(keyType, keyValue) {
  try {
    if (keyType === 'client_id') {
      return {
        is_valid: keyValue.length >= 14 && keyValue.length <= 30,
        message: keyValue.length >= 14 && keyValue.length <= 30 ? 'Reddit Client ID format is valid' : 'Invalid Reddit Client ID format'
      }
    }
    
    if (keyType === 'client_secret') {
      return {
        is_valid: keyValue.length >= 20,
        message: keyValue.length >= 20 ? 'Reddit Client Secret format is valid' : 'Invalid Reddit Client Secret format'
      }
    }
    
    return { is_valid: false, message: 'Unsupported Reddit key type. Use client_id or client_secret.' }
  } catch (error) {
    return { is_valid: false, message: error.message }
  }
}

async function validateOpenAIKey(apiKey) {
  try {
    if (!apiKey.startsWith('sk-')) {
      return { is_valid: false, message: 'OpenAI API key must start with "sk-"' }
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return { is_valid: true, message: 'OpenAI API key is valid' }
    } else if (response.status === 401) {
      return { is_valid: false, message: 'Invalid OpenAI API key' }
    } else {
      return { is_valid: false, message: `OpenAI API error: ${response.status}` }
    }
  } catch (error) {
    return { is_valid: false, message: `Connection error: ${error.message}` }
  }
}

async function validateOpenRouterKey(apiKey) {
  try {
    if (!apiKey.startsWith('sk-or-')) {
      return { is_valid: false, message: 'OpenRouter API key must start with "sk-or-"' }
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return { is_valid: true, message: 'OpenRouter API key is valid' }
    } else if (response.status === 401) {
      return { is_valid: false, message: 'Invalid OpenRouter API key' }
    } else {
      return { is_valid: false, message: `OpenRouter API error: ${response.status}` }
    }
  } catch (error) {
    return { is_valid: false, message: `Connection error: ${error.message}` }
  }
}

async function validateStripeKey(keyType, keyValue) {
  try {
    if (keyType === 'publishable_key') {
      return {
        is_valid: keyValue.startsWith('pk_'),
        message: keyValue.startsWith('pk_') ? 'Valid Stripe publishable key format' : 'Invalid publishable key format'
      }
    }
    
    if (keyType === 'secret_key') {
      if (!keyValue.startsWith('sk_')) {
        return { is_valid: false, message: 'Stripe secret key must start with "sk_"' }
      }

      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          'Authorization': `Bearer ${keyValue}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      if (response.ok) {
        return { is_valid: true, message: 'Stripe secret key is valid' }
      } else if (response.status === 401) {
        return { is_valid: false, message: 'Invalid Stripe secret key' }
      } else {
        return { is_valid: false, message: `Stripe API error: ${response.status}` }
      }
    }

    return { is_valid: false, message: 'Unsupported Stripe key type. Use publishable_key or secret_key.' }
  } catch (error) {
    return { is_valid: false, message: error.message }
  }
}

async function validateResendKey(apiKey) {
  try {
    if (!apiKey.startsWith('re_')) {
      return { is_valid: false, message: 'Resend API key must start with "re_"' }
    }

    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return { is_valid: true, message: 'Resend API key is valid' }
    } else if (response.status === 401) {
      return { is_valid: false, message: 'Invalid Resend API key' }
    } else {
      return { is_valid: false, message: `Resend API error: ${response.status}` }
    }
  } catch (error) {
    return { is_valid: false, message: `Connection error: ${error.message}` }
  }
}

async function getUserAPIKeys(supabaseClient, userId, platform) {
  try {
    console.log('Getting API keys for user:', userId)
    
    let query = supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .select('id, platform, key_type, key_name, is_active, is_valid, last_validated, created_at')
      .eq('user_id', userId)

    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Get keys database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log(`Found ${data?.length || 0} API keys for user`)

    return { keys: data || [] }
  } catch (error) {
    console.error('Get user API keys error:', error)
    throw error
  }
}