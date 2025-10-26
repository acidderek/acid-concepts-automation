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
      console.log('Notification Manager - Raw body:', body)
      
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

    console.log('Notification Manager - Parsed data:', requestData)

    const { action, user_id } = requestData

    if (!action) {
      throw new Error('Action is required')
    }

    if (!user_id) {
      throw new Error('User ID is required')
    }

    if (action === 'create_notification') {
      const { 
        type, 
        title, 
        message, 
        priority = 'medium', 
        category = 'general',
        campaign_id,
        send_email = false,
        action_url 
      } = requestData

      if (!type || !title || !message) {
        throw new Error('Type, title, and message are required for creating notifications')
      }

      console.log(`Creating notification for user ${user_id}: ${title}`)

      // Create notification
      const { data, error } = await supabase
        .from('notifications_2025_10_25_19_00')
        .insert({
          user_id,
          type,
          title,
          message,
          priority,
          category,
          campaign_id,
          action_url,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Database error creating notification:', error)
        throw new Error(`Failed to create notification: ${error.message}`)
      }

      // Send email if requested (simplified for now)
      if (send_email) {
        console.log('Email notification requested but not implemented yet')
      }

      return new Response(JSON.stringify({
        success: true,
        result: {
          notification_id: data.id,
          created_at: data.created_at
        },
        message: 'Notification created successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'get_notifications') {
      const { limit = 20, offset = 0, unread_only = false } = requestData

      let query = supabase
        .from('notifications_2025_10_25_19_00')
        .select(`
          *,
          campaigns_2025_10_25_19_00(name)
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (unread_only) {
        query = query.eq('is_read', false)
      }

      const { data: notifications, error } = await query

      if (error) {
        console.error('Database error getting notifications:', error)
        throw new Error(`Failed to get notifications: ${error.message}`)
      }

      // Get unread count
      const { count: unreadCount, error: countError } = await supabase
        .from('notifications_2025_10_25_19_00')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('is_read', false)

      if (countError) {
        console.error('Error getting unread count:', countError)
      }

      return new Response(JSON.stringify({
        success: true,
        result: {
          notifications: notifications || [],
          unread_count: unreadCount || 0,
          total_count: notifications?.length || 0
        },
        message: 'Notifications retrieved successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'mark_read') {
      const { notification_id } = requestData

      if (!notification_id) {
        throw new Error('Notification ID is required')
      }

      const { error } = await supabase
        .from('notifications_2025_10_25_19_00')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notification_id)
        .eq('user_id', user_id)

      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Notification marked as read'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'mark_all_read') {
      const { error } = await supabase
        .from('notifications_2025_10_25_19_00')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('is_read', false)

      if (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'All notifications marked as read'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'delete_notification') {
      const { notification_id } = requestData

      if (!notification_id) {
        throw new Error('Notification ID is required')
      }

      const { error } = await supabase
        .from('notifications_2025_10_25_19_00')
        .delete()
        .eq('id', notification_id)
        .eq('user_id', user_id)

      if (error) {
        throw new Error(`Failed to delete notification: ${error.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Notification deleted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'get_preferences') {
      const { data, error } = await supabase
        .from('notification_preferences_2025_10_25_19_00')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error is OK
        throw new Error(`Failed to get notification preferences: ${error.message}`)
      }

      // Return default preferences if none found
      const preferences = data || {
        email_notifications: true,
        push_notifications: true,
        campaign_updates: true,
        approval_requests: true,
        error_alerts: true,
        marketing_emails: false
      }

      return new Response(JSON.stringify({
        success: true,
        result: {
          preferences
        },
        message: 'Notification preferences retrieved successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'update_preferences') {
      const { preferences } = requestData

      if (!preferences) {
        throw new Error('Preferences object is required')
      }

      const { error } = await supabase
        .from('notification_preferences_2025_10_25_19_00')
        .upsert({
          user_id,
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to update notification preferences: ${error.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Notification preferences updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Notification Manager Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})