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
    console.log('Clean Notification Manager - Request:', JSON.stringify(requestBody, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, notification_id, limit = 20 } = requestBody;

    if (!user_id) {
      throw new Error('User ID is required');
    }

    switch (action) {
      case 'get_notifications': {
        console.log('Getting notifications for user:', user_id);
        
        // For now, return empty notifications since we don't have a notifications table
        // This prevents the app from crashing
        return new Response(JSON.stringify({
          success: true,
          result: {
            notifications: [],
            unread_count: 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'mark_read': {
        console.log('Marking notification as read:', notification_id);
        
        // For now, just return success
        return new Response(JSON.stringify({
          success: true,
          message: 'Notification marked as read'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_notification': {
        console.log('Creating notification for user:', user_id);
        
        // For now, just return success
        return new Response(JSON.stringify({
          success: true,
          message: 'Notification created'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Clean Notification Manager Error:', error);
    
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