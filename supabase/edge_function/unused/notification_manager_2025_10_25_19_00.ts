import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, user_id } = await req.json()

    console.log(`Notification Management: ${action} for user ${user_id}`)

    let result
    switch (action) {
      case 'create_notification':
        result = await createNotification(supabaseClient, await req.json())
        break
      case 'get_notifications':
        result = await getUserNotifications(supabaseClient, user_id, await req.json())
        break
      case 'mark_read':
        result = await markNotificationRead(supabaseClient, await req.json())
        break
      case 'mark_all_read':
        result = await markAllNotificationsRead(supabaseClient, user_id)
        break
      case 'delete_notification':
        result = await deleteNotification(supabaseClient, await req.json())
        break
      case 'send_email_notification':
        result = await sendEmailNotification(await req.json())
        break
      case 'get_preferences':
        result = await getNotificationPreferences(supabaseClient, user_id)
        break
      case 'update_preferences':
        result = await updateNotificationPreferences(supabaseClient, await req.json())
        break
      case 'send_campaign_notification':
        result = await sendCampaignNotification(supabaseClient, await req.json())
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Notification Management error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function createNotification(supabaseClient, notificationData) {
  try {
    const {
      user_id,
      type,
      title,
      message,
      campaign_id = null,
      company_id = null,
      response_id = null,
      priority = 'medium',
      category = 'system',
      send_email = false,
      action_url = null,
      action_data = null
    } = notificationData

    // Check user notification preferences
    const { data: preferences } = await supabaseClient
      .from('notification_preferences_2025_10_25_19_00')
      .select('*')
      .eq('user_id', user_id)
      .single()

    // Apply preference filters
    if (preferences) {
      if (!preferences.campaign_notifications && category === 'campaign') return { skipped: true, reason: 'Campaign notifications disabled' }
      if (!preferences.approval_notifications && category === 'approval') return { skipped: true, reason: 'Approval notifications disabled' }
      if (!preferences.error_notifications && category === 'error') return { skipped: true, reason: 'Error notifications disabled' }
      if (!preferences.success_notifications && category === 'success') return { skipped: true, reason: 'Success notifications disabled' }
      if (!preferences.system_notifications && category === 'system') return { skipped: true, reason: 'System notifications disabled' }

      // Check priority preferences
      if (priority === 'low' && !preferences.notify_low_priority) return { skipped: true, reason: 'Low priority notifications disabled' }
      if (priority === 'medium' && !preferences.notify_medium_priority) return { skipped: true, reason: 'Medium priority notifications disabled' }
      if (priority === 'high' && !preferences.notify_high_priority) return { skipped: true, reason: 'High priority notifications disabled' }
      if (priority === 'urgent' && !preferences.notify_urgent_priority) return { skipped: true, reason: 'Urgent priority notifications disabled' }

      // Check quiet hours
      if (preferences.quiet_hours_enabled && isInQuietHours(preferences)) {
        if (priority !== 'urgent') {
          return { skipped: true, reason: 'Quiet hours active' }
        }
      }

      // Override email setting based on preferences
      if (send_email && !preferences.email_enabled) {
        send_email = false
      }
    }

    // Create notification
    const { data: notification, error } = await supabaseClient
      .from('notifications_2025_10_25_19_00')
      .insert({
        user_id,
        type,
        title,
        message,
        campaign_id,
        company_id,
        response_id,
        priority,
        category,
        send_email,
        action_url,
        action_data
      })
      .select()
      .single()

    if (error) throw error

    // Send email if requested and enabled
    if (send_email && preferences?.email_enabled) {
      try {
        const emailResult = await sendEmailNotification({
          user_id,
          notification_id: notification.id,
          title,
          message,
          action_url,
          priority
        })

        // Update notification with email status
        await supabaseClient
          .from('notifications_2025_10_25_19_00')
          .update({
            email_sent: emailResult.success,
            email_sent_at: emailResult.success ? new Date().toISOString() : null,
            email_error: emailResult.success ? null : emailResult.error
          })
          .eq('id', notification.id)

      } catch (emailError) {
        console.error('Email notification failed:', emailError)
      }
    }

    return {
      notification_id: notification.id,
      created_at: notification.created_at,
      email_sent: send_email && preferences?.email_enabled,
      skipped: false
    }

  } catch (error) {
    console.error('Create notification error:', error)
    throw error
  }
}

async function getUserNotifications(supabaseClient, userId, options = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      unread_only = false,
      category = null,
      priority = null
    } = options

    let query = supabaseClient
      .from('notifications_2025_10_25_19_00')
      .select(`
        *,
        campaigns_2025_10_25_19_00(name),
        companies_2025_10_25_19_00(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unread_only) {
      query = query.eq('is_read', false)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: notifications, error } = await query

    if (error) throw error

    // Get unread count
    const { count: unreadCount } = await supabaseClient
      .from('notifications_2025_10_25_19_00')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    return {
      notifications: notifications || [],
      unread_count: unreadCount || 0,
      total_fetched: notifications?.length || 0
    }

  } catch (error) {
    throw error
  }
}

async function markNotificationRead(supabaseClient, { notification_id, user_id }) {
  try {
    const { error } = await supabaseClient
      .from('notifications_2025_10_25_19_00')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notification_id)
      .eq('user_id', user_id)

    if (error) throw error

    return { marked_read: true, notification_id }

  } catch (error) {
    throw error
  }
}

async function markAllNotificationsRead(supabaseClient, userId) {
  try {
    const { error } = await supabaseClient
      .from('notifications_2025_10_25_19_00')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error

    return { marked_all_read: true, user_id: userId }

  } catch (error) {
    throw error
  }
}

async function deleteNotification(supabaseClient, { notification_id, user_id }) {
  try {
    const { error } = await supabaseClient
      .from('notifications_2025_10_25_19_00')
      .delete()
      .eq('id', notification_id)
      .eq('user_id', user_id)

    if (error) throw error

    return { deleted: true, notification_id }

  } catch (error) {
    throw error
  }
}

async function sendEmailNotification(emailData) {
  try {
    const { user_id, notification_id, title, message, action_url, priority } = emailData

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }

    // Get user email from Supabase auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(user_id)
    if (userError || !user?.email) {
      return { success: false, error: 'User email not found' }
    }

    // Helper function to determine from email
    function getFromEmail() {
      const domain = Deno.env.get('RESEND_DOMAIN')
      if (domain) {
        return `send@${domain}`
      }
      return 'onboarding@resend.dev' // Default fallback
    }

    // Create email content
    const priorityEmoji = {
      'low': '🔵',
      'medium': '🟡',
      'high': '🟠',
      'urgent': '🔴'
    }

    const emailSubject = `${priorityEmoji[priority] || '🔔'} ${title}`
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Campaign Intelligence</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <span style="font-size: 24px; margin-right: 10px;">${priorityEmoji[priority] || '🔔'}</span>
              <h2 style="margin: 0; color: #333;">${title}</h2>
            </div>
            
            <div style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            ${action_url ? `
              <div style="text-align: center; margin: 25px 0;">
                <a href="${action_url}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Details
                </a>
              </div>
            ` : ''}
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px; color: #999; font-size: 12px;">
              <p>This notification was sent from your Campaign Intelligence dashboard.</p>
              <p>Priority: ${priority.toUpperCase()} | Time: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2024 Campaign Intelligence. All rights reserved.</p>
        </div>
      </div>
    `

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromEmail(),
        to: [user.email],
        subject: emailSubject,
        html: emailBody,
        text: message // Plain text fallback
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Resend API error: ${response.status} ${errorData}`)
    }

    const result = await response.json()

    // Log delivery attempt
    if (notification_id) {
      await supabaseClient
        .from('notification_delivery_log_2025_10_25_19_00')
        .insert({
          notification_id,
          delivery_channel: 'email',
          delivery_status: 'sent',
          delivery_provider: 'resend',
          provider_message_id: result.id,
          provider_response: result
        })
    }

    return { 
      success: true, 
      message_id: result.id,
      email: user.email
    }

  } catch (error) {
    console.error('Email notification error:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

async function getNotificationPreferences(supabaseClient, userId) {
  try {
    const { data: preferences, error } = await supabaseClient
      .from('notification_preferences_2025_10_25_19_00')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error
    }

    // Create default preferences if none exist
    if (!preferences) {
      const { data: newPreferences, error: insertError } = await supabaseClient
        .from('notification_preferences_2025_10_25_19_00')
        .insert({
          user_id: userId,
          email_enabled: true,
          email_frequency: 'immediate',
          campaign_notifications: true,
          approval_notifications: true,
          error_notifications: true,
          success_notifications: true,
          system_notifications: true,
          notify_low_priority: false,
          notify_medium_priority: true,
          notify_high_priority: true,
          notify_urgent_priority: true
        })
        .select()
        .single()

      if (insertError) throw insertError
      return newPreferences
    }

    return preferences

  } catch (error) {
    throw error
  }
}

async function updateNotificationPreferences(supabaseClient, preferencesData) {
  try {
    const { user_id, ...updateData } = preferencesData

    const { data, error } = await supabaseClient
      .from('notification_preferences_2025_10_25_19_00')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error

    return data

  } catch (error) {
    throw error
  }
}

async function sendCampaignNotification(supabaseClient, campaignData) {
  try {
    const { user_id, campaign_id, type, title, message, priority = 'medium' } = campaignData

    // Get campaign details for context
    const { data: campaign } = await supabaseClient
      .from('campaigns_2025_10_25_19_00')
      .select('name, platform')
      .eq('id', campaign_id)
      .single()

    const enhancedTitle = campaign ? `${title} - ${campaign.name}` : title
    const enhancedMessage = campaign ? 
      `${message}\n\nCampaign: ${campaign.name}\nPlatform: ${campaign.platform}` : 
      message

    return await createNotification(supabaseClient, {
      user_id,
      type,
      title: enhancedTitle,
      message: enhancedMessage,
      campaign_id,
      priority,
      category: 'campaign',
      send_email: priority === 'high' || priority === 'urgent',
      action_url: `/campaigns/${campaign_id}`
    })

  } catch (error) {
    throw error
  }
}

function isInQuietHours(preferences) {
  if (!preferences.quiet_hours_enabled) return false

  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
  
  const startTime = preferences.quiet_hours_start
  const endTime = preferences.quiet_hours_end

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime
  } else {
    return currentTime >= startTime && currentTime <= endTime
  }
}