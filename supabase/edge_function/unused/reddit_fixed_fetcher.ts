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
    console.log('Fixed fetcher - Request received:', JSON.stringify(requestBody, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, subreddit, limit = 1 } = requestBody;

    if (!user_id) {
      throw new Error('User ID is required');
    }

    switch (action) {
      case 'fetch_comments': {
        console.log('Starting FIXED fetch_comments action');
        
        // Get user's Reddit token
        console.log('Fetching Reddit token for user:', user_id);
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('reddit_tokens')  // CLEAN TABLE NAME
          .select('access_token')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokenError) {
          console.error('Token fetch error:', tokenError);
          throw new Error(`No valid Reddit token found: ${tokenError.message}`);
        }

        if (!tokenData || !tokenData.access_token) {
          throw new Error('No valid Reddit token found. Please reconnect your Reddit account.');
        }

        console.log('Reddit token found, making API call');

        if (!subreddit) {
          throw new Error('Subreddit is required');
        }

        // Reddit API call
        const redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments.json?limit=${limit}`;
        console.log('Making Reddit API call to:', redditUrl);

        const response = await fetch(redditUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0'
          }
        });

        console.log('Reddit API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Reddit API error:', response.status, errorText);
          throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
        }

        const redditData = await response.json();
        console.log('Reddit API response received');

        // Process comments
        const comments = redditData.data?.children || [];
        console.log('Found', comments.length, 'comments');

        const processedComments = [];

        for (const commentItem of comments) {
          if (commentItem.kind === 't1' && commentItem.data) {
            const comment = commentItem.data;
            
            // Skip deleted/removed comments
            if (comment.body === '[deleted]' || comment.body === '[removed]') {
              continue;
            }

            // Create comment object matching the database schema
            const fixedComment = {
              reddit_comment_id: comment.id,
              subreddit: comment.subreddit,
              comment_body: comment.body,
              comment_author: comment.author,
              comment_score: comment.score || 0,
              permalink: `https://reddit.com${comment.permalink}`,
              comment_created_utc: new Date(comment.created_utc * 1000).toISOString(),
              review_status: 'pending',
              priority_score: comment.score || 0
            };

            processedComments.push(fixedComment);
          }
        }

        console.log('Processed', processedComments.length, 'comments');

        // Store comments in database using PROPER table name
        if (processedComments.length > 0) {
          console.log('Inserting comments into reddit_comments table');
          const { error: insertError } = await supabaseClient
            .from('reddit_comments')  // PROPER TABLE NAME - NO TIMESTAMPS!
            .insert(processedComments.map(comment => ({
              ...comment,
              user_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })));

          if (insertError) {
            console.error('Error inserting comments:', insertError);
            throw new Error(`Failed to save comments: ${insertError.message}`);
          }
        }

        console.log('Fetch completed successfully');
        return new Response(JSON.stringify({
          success: true,
          comments: processedComments,
          count: processedComments.length,
          message: 'Comments fetched successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_comments': {
        console.log('Starting get_comments action');
        
        const { data: comments, error } = await supabaseClient
          .from('reddit_comments')  // PROPER TABLE NAME
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching comments:', error);
          throw error;
        }

        console.log('Fetched', (comments || []).length, 'comments');

        // Map to frontend format
        const mappedComments = (comments || []).map(comment => ({
          id: comment.id,
          reddit_comment_id: comment.reddit_comment_id,
          subreddit: comment.subreddit,
          comment_content: comment.comment_body,
          comment_author: comment.comment_author,
          comment_score: comment.comment_score,
          comment_url: comment.permalink,
          comment_created_at: comment.comment_created_utc,
          review_status: comment.review_status,
          priority_score: comment.priority_score,
          created_at: comment.created_at,
          updated_at: comment.updated_at
        }));

        return new Response(JSON.stringify({
          success: true,
          comments: mappedComments,
          count: mappedComments.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Fixed Edge Function Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});