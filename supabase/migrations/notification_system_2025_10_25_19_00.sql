-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification details
    type VARCHAR(50) NOT NULL, -- campaign_started, campaign_stopped, approval_needed, post_discovered, response_generated, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    campaign_id UUID REFERENCES public.campaigns_2025_10_25_19_00(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies_2025_10_25_19_00(id) ON DELETE CASCADE,
    response_id UUID REFERENCES public.comment_responses_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Notification metadata
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    category VARCHAR(50) NOT NULL, -- system, campaign, approval, error, success
    
    -- Delivery channels
    show_in_app BOOLEAN DEFAULT TRUE,
    send_email BOOLEAN DEFAULT FALSE,
    send_sms BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Email delivery
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_error TEXT,
    
    -- Action data
    action_url TEXT, -- URL to navigate to when clicked
    action_data JSONB, -- Additional data for the action
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    email_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, hourly, daily, weekly
    
    -- Notification type preferences
    campaign_notifications BOOLEAN DEFAULT TRUE,
    approval_notifications BOOLEAN DEFAULT TRUE,
    error_notifications BOOLEAN DEFAULT TRUE,
    success_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    
    -- Priority preferences
    notify_low_priority BOOLEAN DEFAULT FALSE,
    notify_medium_priority BOOLEAN DEFAULT TRUE,
    notify_high_priority BOOLEAN DEFAULT TRUE,
    notify_urgent_priority BOOLEAN DEFAULT TRUE,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create notification delivery log
CREATE TABLE IF NOT EXISTS public.notification_delivery_log_2025_10_25_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES public.notifications_2025_10_25_19_00(id) ON DELETE CASCADE,
    
    -- Delivery details
    delivery_channel VARCHAR(20) NOT NULL, -- email, sms, push, in_app
    delivery_status VARCHAR(20) NOT NULL, -- sent, delivered, failed, bounced
    delivery_provider VARCHAR(50), -- resend, twilio, etc.
    
    -- Response details
    provider_message_id TEXT,
    provider_response JSONB,
    error_message TEXT,
    
    -- Timing
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications_2025_10_25_19_00(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications_2025_10_25_19_00(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications_2025_10_25_19_00(type);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign ON public.notifications_2025_10_25_19_00(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences_2025_10_25_19_00(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON public.notification_delivery_log_2025_10_25_19_00(notification_id);

-- Enable Row Level Security
ALTER TABLE public.notifications_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log_2025_10_25_19_00 ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own notifications" ON public.notifications_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences_2025_10_25_19_00
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own delivery logs" ON public.notification_delivery_log_2025_10_25_19_00
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notifications_2025_10_25_19_00 
            WHERE id = notification_id AND user_id = auth.uid()
        )
    );

-- Insert default notification preferences for existing users
INSERT INTO public.notification_preferences_2025_10_25_19_00 (
    user_id, email_enabled, email_frequency, campaign_notifications, 
    approval_notifications, error_notifications, success_notifications, system_notifications
) VALUES (
    auth.uid(), TRUE, 'immediate', TRUE, TRUE, TRUE, TRUE, TRUE
) ON CONFLICT (user_id) DO NOTHING;

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_campaign_id UUID DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_response_id UUID DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'medium',
    p_category VARCHAR(50) DEFAULT 'system',
    p_send_email BOOLEAN DEFAULT FALSE,
    p_action_url TEXT DEFAULT NULL,
    p_action_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification
    INSERT INTO public.notifications_2025_10_25_19_00 (
        user_id, type, title, message, campaign_id, company_id, response_id,
        priority, category, send_email, action_url, action_data
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_campaign_id, p_company_id, p_response_id,
        p_priority, p_category, p_send_email, p_action_url, p_action_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications_2025_10_25_19_00 
    SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sample notifications
INSERT INTO public.notifications_2025_10_25_19_00 (
    user_id, type, title, message, priority, category, send_email, action_url
) VALUES
(
    auth.uid(),
    'welcome',
    'Welcome to Campaign Intelligence!',
    'Your account has been set up successfully. Start by creating your first campaign and uploading business documents for intelligent AI responses.',
    'medium',
    'system',
    FALSE,
    '/campaigns'
),
(
    auth.uid(),
    'setup_required',
    'Complete Your Setup',
    'Add your API keys for Reddit, OpenAI, and other platforms to start automating your social media engagement.',
    'high',
    'system',
    TRUE,
    '/settings'
);