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
    console.log('=== API KEY MANAGER DEBUG START ===')
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Service key exists:', !!supabaseServiceKey)
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('Supabase client created')

    const body = await req.text()
    console.log('Raw request body:', body)
    
    let requestData
    try {
      requestData = JSON.parse(body)
      console.log('Parsed request data:', requestData)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error(`Invalid JSON: ${parseError.message}`)
    }

    const { action, platform, key_type, key_value, key_name, user_id } = requestData

    console.log('Extracted fields:', {
      action,
      platform,
      key_type,
      key_name: key_name ? 'present' : 'missing',
      key_value: key_value ? `${key_value.length} chars` : 'missing',
      user_id
    })

    if (!user_id) {
      console.error('Missing user_id')
      throw new Error('User ID is required')
    }

    if (action === 'store_key') {
      console.log('=== STORING API KEY ===')
      console.log(`Platform: ${platform}`)
      console.log(`Key type: ${key_type}`)
      console.log(`User ID: ${user_id}`)

      if (!platform || !key_type || !key_value || !key_name) {
        const missing = []
        if (!platform) missing.push('platform')
        if (!key_type) missing.push('key_type')
        if (!key_value) missing.push('key_value')
        if (!key_name) missing.push('key_name')
        
        console.error('Missing required fields:', missing)
        throw new Error(`Missing required fields: ${missing.join(', ')}`)
      }

      // Check if table exists
      console.log('Checking if api_keys table exists...')
      const { data: tableCheck, error: tableError } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('count(*)')
        .limit(1)

      console.log('Table check result:', tableCheck)
      console.log('Table check error:', tableError)

      if (tableError) {
        console.error('Table does not exist or is not accessible:', tableError)
        throw new Error(`Database table error: ${tableError.message}`)
      }

      // Try to insert the API key
      console.log('Attempting to insert API key...')
      const insertData = {
        user_id,
        platform,
        key_type,
        key_name,
        key_value,
        is_valid: true,
        last_validated: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      
      console.log('Insert data (without key_value):', {
        ...insertData,
        key_value: `${key_value.length} characters`
      })

      const { data, error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .upsert(insertData, {
          onConflict: 'user_id,platform,key_type'
        })
        .select()

      console.log('Insert result:', data)
      console.log('Insert error:', error)

      if (error) {
        console.error('Database insert failed:', error)
        throw new Error(`Failed to store API key: ${error.message}`)
      }

      console.log('API key stored successfully!')

      return new Response(JSON.stringify({
        success: true,
        message: `${platform} ${key_type} stored successfully`,
        debug: {
          inserted: true,
          user_id,
          platform,
          key_type
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'get_keys') {
      console.log('=== GETTING API KEYS ===')
      console.log(`User ID: ${user_id}`)

      const { data, error } = await supabase
        .from('api_keys_2025_10_25_19_00')
        .select('platform, key_type, key_name, is_valid, last_validated, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      console.log('Get keys result:', data)
      console.log('Get keys error:', error)

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

    console.log('Unknown action:', action)
    return new Response(JSON.stringify({
      success: false,
      error: `Unknown action: ${action}`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('=== API KEY MANAGER ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        error_type: error.constructor.name
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})