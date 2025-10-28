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
    console.log('=== ROBUST CONTEXT FETCHER START ===');
    
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, subreddit, limit = 1 } = requestBody;

    if (!user_id) {
      console.error('Missing user_id');
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Action:', action, 'User ID:', user_id);

    if (action === 'fetch_comments') {
      console.log('=== FETCH COMMENTS ACTION ===');
      
      try {
        // Step 1: Get Reddit token
        console.log('Step 1: Getting Reddit token...');
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('reddit_tokens')
          .select('access_token')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokenError) {
          console.error('Token error:', tokenError);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to get Reddit token: ' + tokenError.message
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!tokenData?.access_token) {
          console.error('No access token found');
          return new Response(JSON.stringify({
            success: false,
            error: 'No Reddit token found. Please reconnect your Reddit account.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('✅ Token found');

        // Step 2: Validate subreddit
        if (!subreddit || typeof subreddit !== 'string') {
          console.error('Invalid subreddit:', subreddit);
          return new Response(JSON.stringify({
            success: false,
            error: 'Valid subreddit name is required'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('Step 2: Subreddit validated:', subreddit);

        // Step 3: Fetch comments from Reddit
        console.log('Step 3: Fetching comments from Reddit...');
        const redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments.json?limit=${limit}`;
        console.log('Reddit URL:', redditUrl);

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
          
          let errorMessage = `Reddit API error: ${response.status}`;
          if (response.status === 429) {
            errorMessage = 'Reddit rate limit exceeded. Please wait before trying again.';
          } else if (response.status === 401) {
            errorMessage = 'Reddit token expired. Please reconnect your account.';
          } else if (response.status === 403) {
            errorMessage = 'Access forbidden. Check if subreddit exists.';
          } else if (response.status === 404) {
            errorMessage = `Subreddit r/${subreddit} not found.`;
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: errorMessage
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const redditData = await response.json();
        console.log('Reddit data received, parsing...');

        const comments = redditData.data?.children || [];
        console.log('Found', comments.length, 'raw comments');

        // Step 4: Process comments with basic context (simplified)
        console.log('Step 4: Processing comments...');
        const processedComments = [];

        for (let i = 0; i < comments.length; i++) {
          const commentItem = comments[i];
          
          if (commentItem.kind !== 't1' || !commentItem.data) {
            console.log(`Skipping non-comment item ${i}`);
            continue;
          }

          const comment = commentItem.data;
          
          if (comment.body === '[deleted]' || comment.body === '[removed]') {
            console.log(`Skipping deleted comment ${comment.id}`);
            continue;
          }

          console.log(`Processing comment ${i + 1}: ${comment.id}`);

          try {
            // Create basic enhanced comment (no additional API calls for now)
            const basicEnhancedComment = {
              reddit_comment_id: comment.id,
              subreddit: comment.subreddit,
              comment_body: comment.body || '',
              comment_author: comment.author || 'unknown',
              comment_score: comment.score || 0,
              permalink: comment.permalink ? `https://reddit.com${comment.permalink}` : '',
              comment_created_utc: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : new Date().toISOString(),
              
              // Basic context without additional API calls
              original_post_id: comment.link_id ? comment.link_id.replace('t3_', '') : '',
              original_post_title: 'Context loading...',
              original_post_content: '',
              original_post_author: 'unknown',
              original_post_score: 0,
              original_post_url: comment.link_id ? `https://reddit.com/comments/${comment.link_id.replace('t3_', '')}` : '',
              
              parent_comment_id: comment.parent_id !== comment.link_id ? comment.parent_id.replace('t1_', '') : null,
              parent_comment_content: null,
              parent_comment_author: null,
              parent_comment_score: null,
              
              sibling_comments: JSON.stringify([]),
              sibling_count: 0,
              
              comment_depth: 0,
              is_top_level_comment: comment.parent_id === comment.link_id,
              thread_context: JSON.stringify({
                total_comments: 0,
                post_age_hours: 0,
                thread_activity: 0
              }),
              
              review_status: 'pending',
              priority_score: Math.min(Math.max(comment.score || 0, 0), 100)
            };

            processedComments.push(basicEnhancedComment);
            console.log(`✅ Processed comment ${comment.id}`);

          } catch (commentError) {
            console.error(`Error processing comment ${comment.id}:`, commentError);
            // Continue with next comment
          }
        }

        console.log('Step 5: Saving to database...');
        console.log('Processed', processedComments.length, 'comments');

        // Step 5: Save to database
        if (processedComments.length > 0) {
          try {
            const { error: insertError } = await supabaseClient
              .from('reddit_comments')
              .insert(processedComments.map(comment => ({
                ...comment,
                user_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })));

            if (insertError) {
              console.error('Database insert error:', insertError);
              return new Response(JSON.stringify({
                success: false,
                error: 'Failed to save comments: ' + insertError.message
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            console.log('✅ Comments saved to database');

          } catch (dbError) {
            console.error('Database error:', dbError);
            return new Response(JSON.stringify({
              success: false,
              error: 'Database error: ' + dbError.message
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        console.log('=== SUCCESS ===');
        return new Response(JSON.stringify({
          success: true,
          comments: processedComments,
          count: processedComments.length,
          message: `Successfully fetched ${processedComments.length} comments from r/${subreddit}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (fetchError) {
        console.error('Fetch comments error:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Fetch error: ' + fetchError.message,
          stack: fetchError.stack
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'get_comments') {
      console.log('=== GET COMMENTS ACTION ===');
      
      try {
        const { data: comments, error } = await supabaseClient
          .from('reddit_comments')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Get comments error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to get comments: ' + error.message
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('Retrieved', comments?.length || 0, 'comments from database');

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
          
          // Enhanced context fields
          original_post_id: comment.original_post_id,
          original_post_title: comment.original_post_title,
          original_post_content: comment.original_post_content,
          original_post_author: comment.original_post_author,
          original_post_score: comment.original_post_score,
          original_post_url: comment.original_post_url,
          
          parent_comment_id: comment.parent_comment_id,
          parent_comment_content: comment.parent_comment_content,
          parent_comment_author: comment.parent_comment_author,
          parent_comment_score: comment.parent_comment_score,
          
          sibling_comments: comment.sibling_comments ? JSON.parse(comment.sibling_comments) : [],
          sibling_count: comment.sibling_count || 0,
          
          comment_depth: comment.comment_depth || 0,
          is_top_level_comment: comment.is_top_level_comment !== false,
          thread_context: comment.thread_context ? JSON.parse(comment.thread_context) : {},
          
          review_status: comment.review_status || 'pending',
          priority_score: comment.priority_score || 0,
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

      } catch (getError) {
        console.error('Get comments error:', getError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Get error: ' + getError.message
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Unknown action
    console.error('Unknown action:', action);
    return new Response(JSON.stringify({
      success: false,
      error: `Unknown action: ${action}`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('=== GENERAL ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Server error: ' + error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});