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
    const { user_id } = requestData

    console.log('Checking database for user:', user_id)

    // Check API keys table
    const { data: apiKeys, error: apiError } = await supabase
      .from('api_keys_2025_10_25_19_00')
      .select('*')
      .eq('platform', 'reddit')
      .eq('user_id', user_id)

    console.log('API Keys found:', apiKeys)
    console.log('API Keys error:', apiError)

    // Check OAuth states table
    const { data: oauthStates, error: oauthError } = await supabase
      .from('oauth_states_2025_10_26_00_00')
      .select('*')
      .eq('platform', 'reddit')
      .eq('user_id', user_id)

    console.log('OAuth states found:', oauthStates)
    console.log('OAuth states error:', oauthError)

    // Check Reddit accounts table
    const { data: redditAccounts, error: redditError } = await supabase
      .from('reddit_accounts_2025_10_26_00_00')
      .select('*')
      .eq('user_id', user_id)

    console.log('Reddit accounts found:', redditAccounts)
    console.log('Reddit accounts error:', redditError)

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%2025_10_%')

    console.log('Available tables:', tables)

    return new Response(JSON.stringify({
      success: true,
      user_id,
      results: {
        api_keys: {
          data: apiKeys || [],
          error: apiError?.message || null,
          count: apiKeys?.length || 0
        },
        oauth_states: {
          data: oauthStates || [],
          error: oauthError?.message || null,
          count: oauthStates?.length || 0
        },
        reddit_accounts: {
          data: redditAccounts || [],
          error: redditError?.message || null,
          count: redditAccounts?.length || 0
        },
        available_tables: tables || []
      },
      message: 'Database check completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Database check error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})