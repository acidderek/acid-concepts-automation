import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('Test function called')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // Parse request data
    let requestData = {}
    const body = await req.text()
    console.log('Raw request body:', body)
    
    if (body && body.trim()) {
      try {
        requestData = JSON.parse(body)
        console.log('Parsed request data:', requestData)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          received_body: body
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { user_id, test_message } = requestData

    console.log('User ID received:', user_id)
    console.log('Test message:', test_message)

    return new Response(JSON.stringify({
      success: true,
      message: 'Test function working!',
      received_user_id: user_id,
      received_message: test_message,
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url: Deno.env.get('SUPABASE_URL') ? 'Present' : 'Missing',
        service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present' : 'Missing'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Test function error:', error)
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