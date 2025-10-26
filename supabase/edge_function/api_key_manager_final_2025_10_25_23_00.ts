import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    console.log('=== API Key Manager Final ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request data with better error handling
    let requestData
    let rawBody = ''
    
    try {
      rawBody = await req.text()
      console.log('Raw request body:', rawBody)
      
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Empty request body')
      }
      
      requestData = JSON.parse(rawBody)
      console.log('Parsed request data:', requestData)
    } catch (parseError) {
      console.error('Parse error:', parseError)
      console.error('Raw body was:', rawBody)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Request parsing failed: ${parseError.message}`,
          details: `Raw body: "${rawBody}"`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { action, platform, key_type, key_value, key_name, user_id } = requestData

    // Validate required fields
    if (!action) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing action parameter',
          received: requestData
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing user_id parameter',
          received: requestData
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing action:', action, 'for platform:', platform)

    switch (action) {
      case 'store_key': {
        if (!platform || !key_type || !key_value) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Missing required fields for store_key',
              required: ['platform', 'key_type', 'key_value'],
              received: { platform, key_type, key_value: key_value ? '[HIDDEN]' : undefined }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Store the API key
        const { data: insertData, error: insertError } = await supabaseClient
          .from('api_keys_2025_10_25_19_00')
          .upsert({
            user_id,
            platform,
            key_type,
            key_value,
            key_name: key_name || `${platform} ${key_type}`,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform,key_type'
          })

        if (insertError) {
          console.error('Database insert error:', insertError)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to store API key',
              details: insertError.message
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Test the API key based on platform
        let validationResult = { valid: true, message: 'Key stored successfully' }
        
        try {
          switch (platform.toLowerCase()) {
            case 'reddit':
              if (key_type === 'client_id' && key_value.length < 10) {
                validationResult = { valid: false, message: 'Reddit Client ID seems too short' }
              } else if (key_type === 'client_secret' && key_value.length < 20) {
                validationResult = { valid: false, message: 'Reddit Client Secret seems too short' }
              }
              break
              
            case 'openai':
              if (!key_value.startsWith('sk-')) {
                validationResult = { valid: false, message: 'OpenAI API key should start with sk-' }
              }
              break
              
            case 'openrouter':
              if (!key_value.startsWith('sk-or-v1-')) {
                validationResult = { valid: false, message: 'OpenRouter API key should start with sk-or-v1-' }
              }
              break
              
            case 'stripe':
              if (key_type === 'publishable_key' && !key_value.startsWith('pk_')) {
                validationResult = { valid: false, message: 'Stripe publishable key should start with pk_' }
              } else if (key_type === 'secret_key' && !key_value.startsWith('sk_')) {
                validationResult = { valid: false, message: 'Stripe secret key should start with sk_' }
              }
              break
              
            case 'resend':
              if (!key_value.startsWith('re_')) {
                validationResult = { valid: false, message: 'Resend API key should start with re_' }
              }
              break
          }
        } catch (validationError) {
          console.error('Validation error:', validationError)
          validationResult = { valid: false, message: 'Validation failed: ' + validationError.message }
        }

        // Log validation result
        const { error: logError } = await supabaseClient
          .from('api_key_validation_log_2025_10_25_19_00')
          .insert({
            user_id,
            platform,
            key_type,
            validation_result: validationResult.valid,
            validation_message: validationResult.message,
            validated_at: new Date().toISOString()
          })

        if (logError) {
          console.error('Validation log error:', logError)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'API key stored successfully',
            validation: validationResult,
            platform,
            key_type
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'get_keys': {
        const { data: keys, error: fetchError } = await supabaseClient
          .from('api_keys_2025_10_25_19_00')
          .select('platform, key_type, key_name, is_active, created_at')
          .eq('user_id', user_id)
          .eq('is_active', true)

        if (fetchError) {
          console.error('Database fetch error:', fetchError)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to fetch API keys',
              details: fetchError.message
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            keys: keys || []
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'delete_key': {
        if (!platform || !key_type) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Missing platform or key_type for delete_key'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { error: deleteError } = await supabaseClient
          .from('api_keys_2025_10_25_19_00')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('platform', platform)
          .eq('key_type', key_type)

        if (deleteError) {
          console.error('Database delete error:', deleteError)
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to delete API key',
              details: deleteError.message
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'API key deleted successfully'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
        )
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`,
            available_actions: ['store_key', 'get_keys', 'delete_key']
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})