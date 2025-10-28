import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let requestData = {}
    
    // Parse request data safely
    try {
      const body = await req.text()
      console.log('Raw request body:', body)
      
      if (body && body.trim()) {
        requestData = JSON.parse(body)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Parsed request data:', requestData)

    const { action, platform, key_type, key_value, key_name, user_id } = requestData

    if (!action) {
      throw new Error('Action is required')
    }

    if (!user_id) {
      throw new Error('User ID is required')
    }

    if (action === 'store_key') {
      if (!platform || !key_type || !key_value || !key_name) {
        throw new Error('Platform, key_type, key_value, and key_name are required for storing keys')
      }

      console.log(`Storing ${platform} ${key_type} for user ${user_id}`)

      // Validate API key based on platform and type
      let isValid = false
      let validationMessage = 'Key stored without validation'

      try {
        if (platform === 'reddit' && key_type === 'client_id') {
          isValid = key_value.length > 10 && !key_value.includes(' ')
          validationMessage = isValid ? 'Valid Reddit Client ID format' : 'Invalid Reddit Client ID format'
        } else if (platform === 'reddit' && key_type === 'client_secret') {
          isValid = key_value.length > 20 && !key_value.includes(' ')
          validationMessage = isValid ? 'Valid Reddit Client Secret format' : 'Invalid Reddit Client Secret format'
        } else if (platform === 'openai') {
          isValid = key_value.startsWith('sk-') && key_value.length > 40
          validationMessage = isValid ? 'Valid OpenAI API key format' : 'Invalid OpenAI API key format'
        } else if (platform === 'openrouter') {
          isValid = key_value.startsWith('sk-or-') && key_value.length > 40
          validationMessage = isValid ? 'Valid OpenRouter API key format' : 'Invalid OpenRouter API key format'
        } else if (platform === 'stripe') {
          isValid = (key_value.startsWith('sk_') || key_value.startsWith('pk_')) && key_value.length > 30
          validationMessage = isValid ? 'Valid Stripe API key format' : 'Invalid Stripe API key format'
        } else if (platform === 'resend') {
          isValid = key_value.startsWith('re_') && key_value.length > 30
          validationMessage = isValid ? 'Valid Resend API key format' : 'Invalid Resend API key format'
        } else {
          isValid = key_value.length > 5
          validationMessage = 'Basic validation passed'
        }
      } catch (validationError) {
        console.error('Validation error:', validationError)
        isValid = false
        validationMessage = 'Validation failed'
      }

      // Store the API key
      const { data, error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .upsert({
          user_id,
          platform,
          key_type,
          key_name,
          key_value,
          is_valid: isValid,
          last_validated: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform,key_type'
        })

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to store API key: ${error.message}`)
      }

      console.log('API key stored successfully')

      return new Response(JSON.stringify({
        success: true,
        result: {
          is_valid: isValid,
          validation_message: validationMessage,
          platform,
          key_type
        },
        message: `${platform} ${key_type} stored successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'get_keys') {
      const { data, error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('platform, key_type, key_name, is_valid, last_validated')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to retrieve API keys: ${error.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        result: {
          keys: data || []
        },
        message: 'API keys retrieved successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'delete_key') {
      if (!platform || !key_type) {
        throw new Error('Platform and key_type are required for deleting keys')
      }

      const { error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .delete()
        .eq('user_id', user_id)
        .eq('platform', platform)
        .eq('key_type', key_type)

      if (error) {
        throw new Error(`Failed to delete API key: ${error.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${platform} ${key_type} deleted successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'validate_key') {
      if (!platform || !key_type) {
        throw new Error('Platform and key_type are required for validation')
      }

      // Get the key from database
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('key_value')
        .eq('user_id', user_id)
        .eq('platform', platform)
        .eq('key_type', key_type)
        .single()

      if (keyError || !keyData) {
        throw new Error('API key not found')
      }

      // Perform validation based on platform
      let isValid = false
      let validationMessage = 'Validation not implemented for this platform'

      try {
        if (platform === 'openai') {
          // Test OpenAI API key
          const testResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${keyData.key_value}`,
              'Content-Type': 'application/json'
            }
          })
          isValid = testResponse.ok
          validationMessage = isValid ? 'OpenAI API key is valid' : 'OpenAI API key is invalid'
        } else if (platform === 'stripe') {
          // Test Stripe API key
          const testResponse = await fetch('https://api.stripe.com/v1/account', {
            headers: {
              'Authorization': `Bearer ${keyData.key_value}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
          isValid = testResponse.ok
          validationMessage = isValid ? 'Stripe API key is valid' : 'Stripe API key is invalid'
        } else {
          // Basic format validation
          isValid = keyData.key_value.length > 5
          validationMessage = isValid ? 'Basic validation passed' : 'Key appears to be too short'
        }
      } catch (validationError) {
        console.error('API validation error:', validationError)
        isValid = false
        validationMessage = 'Validation failed due to network error'
      }

      // Update validation status
      await supabase
        .from('api_keys_2025_10_25_19_00')
        .update({
          is_valid: isValid,
          last_validated: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('platform', platform)
        .eq('key_type', key_type)

      return new Response(JSON.stringify({
        success: true,
        result: {
          is_valid: isValid,
          validation_message: validationMessage
        },
        message: 'API key validation completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('API Key Manager Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})