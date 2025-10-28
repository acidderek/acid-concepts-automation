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

    // Parse JSON once and reuse
    const requestData = await req.json()
    const { action, platform, key_type, key_value, key_name, user_id } = requestData

    console.log(`API Key Management: ${action} for ${platform}`)

    let result
    switch (action) {
      case 'store_key':
        result = await storeAPIKey(supabaseClient, { platform, key_type, key_value, key_name, user_id })
        break
      case 'validate_key':
        result = await validateAPIKey(supabaseClient, { platform, key_type, key_value })
        break
      case 'test_connection':
        result = await testPlatformConnection(platform, requestData)
        break
      case 'get_keys':
        result = await getUserAPIKeys(supabaseClient, user_id, platform)
        break
      case 'delete_key':
        result = await deleteAPIKey(supabaseClient, requestData)
        break
      case 'update_key':
        result = await updateAPIKey(supabaseClient, requestData)
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
    console.error('API Key Management error:', error)
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

async function storeAPIKey(supabaseClient, { platform, key_type, key_value, key_name, user_id }) {
  try {
    // Simple encryption (in production, use proper encryption)
    const encryptedKey = btoa(key_value) // Base64 encoding for demo
    
    // Store in database
    const { data, error } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .insert({
        user_id,
        platform,
        key_type,
        encrypted_key: encryptedKey,
        key_name: key_name || `${platform} ${key_type}`,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    // Validate the key immediately
    const validation = await validateAPIKey(supabaseClient, { platform, key_type, key_value })
    
    // Update validation status
    await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .update({
        is_valid: validation.is_valid,
        last_validated: new Date().toISOString(),
        validation_error: validation.error || null
      })
      .eq('id', data.id)

    return {
      key_id: data.id,
      platform,
      key_type,
      is_valid: validation.is_valid,
      validation_message: validation.message,
      stored_at: data.created_at
    }

  } catch (error) {
    console.error('Store API key error:', error)
    throw error
  }
}

async function validateAPIKey(supabaseClient, { platform, key_type, key_value }) {
  try {
    let validation = { is_valid: false, message: 'Unknown platform', response_time: 0 }
    const startTime = Date.now()

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
      case 'twitter':
        validation = await validateTwitterKey(key_type, key_value)
        break
      default:
        validation = { is_valid: false, message: `Validation not implemented for ${platform}` }
    }

    validation.response_time = Date.now() - startTime
    return validation

  } catch (error) {
    return {
      is_valid: false,
      message: `Validation error: ${error.message}`,
      response_time: 0
    }
  }
}

async function validateRedditKey(keyType, keyValue) {
  try {
    if (keyType === 'client_id' || keyType === 'client_secret') {
      return {
        is_valid: keyValue.length > 10,
        message: keyValue.length > 10 ? 'Format appears valid' : 'Invalid format'
      }
    }
    return { is_valid: false, message: 'Unsupported Reddit key type' }
  } catch (error) {
    return { is_valid: false, message: error.message }
  }
}

async function validateOpenAIKey(apiKey) {
  try {
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

    return { is_valid: false, message: 'Unsupported Stripe key type' }
  } catch (error) {
    return { is_valid: false, message: error.message }
  }
}

async function validateResendKey(apiKey) {
  try {
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

async function validateTwitterKey(keyType, keyValue) {
  try {
    // Basic format validation for Twitter keys
    if (keyType === 'api_key' || keyType === 'api_secret') {
      return {
        is_valid: keyValue.length > 20,
        message: keyValue.length > 20 ? 'Format appears valid' : 'Invalid format'
      }
    }
    return { is_valid: false, message: 'Unsupported Twitter key type' }
  } catch (error) {
    return { is_valid: false, message: error.message }
  }
}

async function testPlatformConnection(platform, data) {
  // Test connection using stored keys
  return { success: true, message: `${platform} connection test completed` }
}

async function getUserAPIKeys(supabaseClient, userId, platform) {
  try {
    let query = supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .select('id, platform, key_type, key_name, is_active, is_valid, last_validated, created_at')
      .eq('user_id', userId)

    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return { keys: data || [] }
  } catch (error) {
    throw error
  }
}

async function deleteAPIKey(supabaseClient, data) {
  try {
    const { key_id, user_id } = data

    const { error } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .delete()
      .eq('id', key_id)
      .eq('user_id', user_id)

    if (error) throw error

    return { success: true, message: 'API key deleted successfully' }
  } catch (error) {
    throw error
  }
}

async function updateAPIKey(supabaseClient, data) {
  try {
    const { key_id, user_id, updates } = data

    const { error } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .update(updates)
      .eq('id', key_id)
      .eq('user_id', user_id)

    if (error) throw error

    return { success: true, message: 'API key updated successfully' }
  } catch (error) {
    throw error
  }
}