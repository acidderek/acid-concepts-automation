import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const requestData = await req.json()
    console.log('API Key Manager request:', requestData)

    const { action, platform, key_type, key_value, key_name, user_id } = requestData

    if (!user_id) {
      throw new Error('User ID is required')
    }

    if (action === 'store_key') {
      console.log(`Storing ${platform} ${key_type} for user ${user_id}`)

      // Store the API key
      const { data, error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .upsert({
          user_id,
          platform,
          key_type,
          key_name,
          key_value,
          is_valid: true,
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
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown action'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

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