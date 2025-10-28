import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Fixed API Key Manager - Request:', JSON.stringify(requestBody, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, platform, key_type, key_name, key_value, account_alias, account_description, tags } = requestBody;

    if (!user_id) {
      throw new Error('User ID is required');
    }

    switch (action) {
      case 'get_keys': {
        console.log('Getting API keys for user:', user_id);
        
        const { data: keys, error } = await supabaseClient
          .from('api_keys')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to get API keys: ${error.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          result: {
            keys: keys || []
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'save_key': {
        console.log('Saving API key for user:', user_id);
        
        if (!key_name || !key_value) {
          throw new Error('Key name and value are required');
        }

        // Handle both old and new API formats
        const keyData = {
          user_id,
          platform: platform || 'reddit',
          key_type: key_type || key_name,
          key_name: key_name,
          key_value: key_value,
          account_alias: account_alias || null,
          account_description: account_description || null,
          tags: tags || null,
          is_valid: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
          .from('api_keys')
          .upsert(keyData, {
            onConflict: 'user_id,platform,key_type,account_alias'
          });

        if (error) {
          throw new Error(`Failed to save API key: ${error.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'API key saved successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'delete_key': {
        console.log('Deleting API key for user:', user_id);
        
        if (!key_name && !account_alias) {
          throw new Error('Key name or account alias is required');
        }

        let query = supabaseClient
          .from('api_keys')
          .delete()
          .eq('user_id', user_id);

        if (platform) {
          query = query.eq('platform', platform);
        }

        if (key_name) {
          query = query.eq('key_name', key_name);
        }

        if (account_alias) {
          if (account_alias === 'unknown') {
            query = query.is('account_alias', null);
          } else {
            query = query.eq('account_alias', account_alias);
          }
        }

        const { error } = await query;

        if (error) {
          throw new Error(`Failed to delete API key: ${error.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'API key deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Fixed API Key Manager Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});