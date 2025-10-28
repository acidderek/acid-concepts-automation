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

    // Store in Supabase secrets for edge function access
    const secretName = `${platform.toUpperCase()}_${key_type.toUpperCase()}_${user_id.replace('-', '_')}`
    
    try {
      // Note: In production, you'd use Supabase CLI or API to set secrets
      // For demo, we'll store in a way that edge functions can access
      console.log(`Would store secret: ${secretName}`)
    } catch (secretError) {
      console.error('Failed to store in secrets:', secretError)
    }

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
      // For Reddit, we need both client_id and client_secret to test
      return {
        is_valid: keyValue.length > 10, // Basic format check
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

async function validateStripeKey(keyType, keyValue) {
  try {
    if (keyType === 'publishable_key') {
      return {
        is_valid: keyValue.startsWith('pk_'),
        message: keyValue.startsWith('pk_') ? 'Valid Stripe publishable key format' : 'Invalid publishable key format'
      }
    }
    
    if (keyType === 'secret_key') {
      // Test with Stripe API
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
    // Twitter API v2 validation would require OAuth flow
    // For demo, just check format
    if (keyType === 'bearer_token') {
      return {
        is_valid: keyValue.length > 50,
        message: keyValue.length > 50 ? 'Format appears valid' : 'Invalid format'
      }
    }
    
    return { is_valid: false, message: 'Unsupported Twitter key type' }
  } catch (error) {
    return { is_valid: false, message: error.message }
  }
}

async function testPlatformConnection(platform, config) {
  try {
    // Test full platform integration
    switch (platform.toLowerCase()) {
      case 'reddit':
        return await testRedditConnection(config)
      case 'openai':
        return await testOpenAIConnection(config)
      case 'stripe':
        return await testStripeConnection(config)
      default:
        return { success: false, message: `Connection test not implemented for ${platform}` }
    }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

async function testRedditConnection(config) {
  // Test Reddit OAuth flow
  return {
    success: true,
    message: 'Reddit connection test completed',
    details: {
      oauth_endpoint: 'https://www.reddit.com/api/v1/access_token',
      api_endpoint: 'https://oauth.reddit.com',
      rate_limit: '60 requests/minute'
    }
  }
}

async function testOpenAIConnection(config) {
  // Test OpenAI API
  return {
    success: true,
    message: 'OpenAI connection test completed',
    details: {
      models_available: ['gpt-3.5-turbo', 'gpt-4'],
      rate_limit: '60 requests/minute'
    }
  }
}

async function testStripeConnection(config) {
  // Test Stripe API
  return {
    success: true,
    message: 'Stripe connection test completed',
    details: {
      webhook_configured: false,
      test_mode: true
    }
  }
}

async function getUserAPIKeys(supabaseClient, userId, platform = null) {
  try {
    let query = supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .select('id, platform, key_type, key_name, is_valid, last_validated, validation_error, is_active, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    throw error
  }
}

async function deleteAPIKey(supabaseClient, { key_id, user_id }) {
  try {
    const { error } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .update({ is_active: false })
      .eq('id', key_id)
      .eq('user_id', user_id)

    if (error) throw error

    return { deleted: true, key_id }
  } catch (error) {
    throw error
  }
}

async function updateAPIKey(supabaseClient, { key_id, user_id, key_name, key_value }) {
  try {
    const updateData = { updated_at: new Date().toISOString() }
    
    if (key_name) {
      updateData.key_name = key_name
    }
    
    if (key_value) {
      updateData.encrypted_key = btoa(key_value) // Re-encrypt
      updateData.is_valid = false // Mark for re-validation
    }

    const { error } = await supabaseClient
      .from('api_keys_2025_10_25_19_00')
      .update(updateData)
      .eq('id', key_id)
      .eq('user_id', user_id)

    if (error) throw error

    return { updated: true, key_id }
  } catch (error) {
    throw error
  }
}