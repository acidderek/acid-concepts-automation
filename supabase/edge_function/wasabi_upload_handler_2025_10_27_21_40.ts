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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { filePath, fileName, fileType, fileSize } = await req.json()

    // Get user's Wasabi credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .in('service', ['wasabi_access', 'wasabi_secret', 'wasabi_bucket', 'wasabi_endpoint', 'wasabi_region'])
      .eq('status', 'active')

    if (credError || !credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Wasabi credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse credentials
    const creds: any = {}
    credentials.forEach(item => {
      creds[item.service] = item.key_value
    })

    if (!creds.wasabi_access || !creds.wasabi_secret || !creds.wasabi_bucket || !creds.wasabi_endpoint) {
      return new Response(
        JSON.stringify({ error: 'Incomplete Wasabi configuration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate presigned URL for upload
    const region = creds.wasabi_region?.replace(/^.*\s+/, '') || 'us-east-1' // Extract just the region code
    const bucket = creds.wasabi_bucket
    const endpoint = creds.wasabi_endpoint
    const accessKey = creds.wasabi_access
    const secretKey = creds.wasabi_secret

    // Create AWS signature v4
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'
    
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
    const algorithm = 'AWS4-HMAC-SHA256'
    
    // Create policy
    const expiration = new Date(now.getTime() + 3600000).toISOString() // 1 hour
    const policy = {
      expiration,
      conditions: [
        { bucket },
        { key: filePath },
        { 'Content-Type': fileType },
        ['content-length-range', 0, 52428800], // 50MB max
        { 'x-amz-algorithm': algorithm },
        { 'x-amz-credential': `${accessKey}/${credentialScope}` },
        { 'x-amz-date': timeStamp }
      ]
    }

    const policyBase64 = btoa(JSON.stringify(policy))

    // Create signature
    const encoder = new TextEncoder()
    
    // Helper function to create HMAC
    const hmac = async (key: Uint8Array, data: string) => {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
      return new Uint8Array(signature)
    }

    // Create signing key
    let key = encoder.encode(`AWS4${secretKey}`)
    key = await hmac(key, dateStamp)
    key = await hmac(key, region)
    key = await hmac(key, 's3')
    key = await hmac(key, 'aws4_request')

    // Sign the policy
    const signature = await hmac(key, policyBase64)
    const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')

    // Return presigned POST data
    const uploadUrl = `https://${bucket}.${endpoint}`
    const formData = {
      key: filePath,
      'Content-Type': fileType,
      'x-amz-algorithm': algorithm,
      'x-amz-credential': `${accessKey}/${credentialScope}`,
      'x-amz-date': timeStamp,
      policy: policyBase64,
      'x-amz-signature': signatureHex
    }

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        formData,
        filePath
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Wasabi upload preparation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to prepare upload', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})