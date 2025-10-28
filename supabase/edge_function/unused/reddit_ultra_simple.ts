import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  // Always return 200 status, put errors in the response body
  const returnResponse = (data: any, isError = false) => {
    return new Response(JSON.stringify(data), {
      status: 200, // ALWAYS 200 to prevent "non-2xx" errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 ULTRA SIMPLE FETCHER START');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📥 Request received:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return returnResponse({
        success: false,
        error: 'Invalid JSON in request body',
        step: 'json_parse'
      });
    }

    const { action, user_id, subreddit, limit = 1 } = requestBody;

    if (!user_id) {
      console.error('❌ Missing user_id');
      return returnResponse({
        success: false,
        error: 'User ID is required',
        step: 'validation'
      });
    }

    console.log('✅ User ID validated:', user_id);
    console.log('🎯 Action:', action);

    // Initialize Supabase client
    let supabaseClient;
    try {
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      console.log('✅ Supabase client initialized');
    } catch (supabaseError) {
      console.error('❌ Supabase client error:', supabaseError);
      return returnResponse({
        success: false,
        error: 'Failed to initialize database connection',
        step: 'supabase_init'
      });
    }

    if (action === 'fetch_comments') {
      console.log('🔍 FETCH COMMENTS ACTION');
      
      // Step 1: Get Reddit token
      console.log('📡 Step 1: Getting Reddit token...');
      let tokenData;
      try {
        const { data, error: tokenError } = await supabaseClient
          .from('reddit_tokens')
          .select('access_token')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokenError) {
          console.error('❌ Token query error:', tokenError);
          return returnResponse({
            success: false,
            error: 'Database error getting Reddit token: ' + tokenError.message,
            step: 'token_query'
          });
        }

        if (!data?.access_token) {
          console.error('❌ No access token found');
          return returnResponse({
            success: false,
            error: 'No Reddit token found. Please reconnect your Reddit account.',
            step: 'no_token'
          });
        }

        tokenData = data;
        console.log('✅ Reddit token found');
      } catch (tokenException) {
        console.error('❌ Token exception:', tokenException);
        return returnResponse({
          success: false,
          error: 'Exception getting Reddit token: ' + tokenException.message,
          step: 'token_exception'
        });
      }

      // Step 2: Validate subreddit
      if (!subreddit || typeof subreddit !== 'string' || subreddit.trim() === '') {
        console.error('❌ Invalid subreddit:', subreddit);
        return returnResponse({
          success: false,
          error: 'Valid subreddit name is required',
          step: 'subreddit_validation'
        });
      }

      const cleanSubreddit = subreddit.trim().replace(/^r\//, '');
      console.log('✅ Subreddit validated:', cleanSubreddit);

      // Step 3: Make Reddit API call
      console.log('🌐 Step 3: Calling Reddit API...');
      let redditData;
      try {
        const redditUrl = `https://oauth.reddit.com/r/${cleanSubreddit}/comments.json?limit=${limit}`;
        console.log('🔗 Reddit URL:', redditUrl);

        const response = await fetch(redditUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0'
          }
        });

        console.log('📊 Reddit API response status:', response.status);

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Could not read error response';
          }
          
          console.error('❌ Reddit API error:', response.status, errorText);
          
          let userMessage = `Reddit API error (${response.status})`;
          if (response.status === 429) {
            userMessage = 'Reddit rate limit exceeded. Please wait 1-2 minutes before trying again.';
          } else if (response.status === 401) {
            userMessage = 'Reddit token expired. Please reconnect your Reddit account.';
          } else if (response.status === 403) {
            userMessage = 'Access forbidden. The subreddit might be private or banned.';
          } else if (response.status === 404) {
            userMessage = `Subreddit r/${cleanSubreddit} not found.`;
          }
          
          return returnResponse({
            success: false,
            error: userMessage,
            step: 'reddit_api_error',
            details: {
              status: response.status,
              error_text: errorText
            }
          });
        }

        try {
          redditData = await response.json();
          console.log('✅ Reddit data parsed successfully');
        } catch (jsonError) {
          console.error('❌ Reddit JSON parse error:', jsonError);
          return returnResponse({
            success: false,
            error: 'Failed to parse Reddit API response',
            step: 'reddit_json_parse'
          });
        }

      } catch (fetchException) {
        console.error('❌ Reddit fetch exception:', fetchException);
        return returnResponse({
          success: false,
          error: 'Network error calling Reddit API: ' + fetchException.message,
          step: 'reddit_fetch_exception'
        });
      }

      // Step 4: Process comments
      console.log('⚙️ Step 4: Processing comments...');
      let processedComments = [];
      try {
        const comments = redditData.data?.children || [];
        console.log('📝 Found', comments.length, 'raw comments');

        for (let i = 0; i < comments.length; i++) {
          const commentItem = comments[i];
          
          if (commentItem.kind !== 't1' || !commentItem.data) {
            console.log(`⏭️ Skipping non-comment item ${i}`);
            continue;
          }

          const comment = commentItem.data;
          
          if (!comment.body || comment.body === '[deleted]' || comment.body === '[removed]') {
            console.log(`⏭️ Skipping deleted comment ${comment.id}`);
            continue;
          }

          console.log(`✏️ Processing comment ${i + 1}: ${comment.id}`);

          // Create simple comment object
          const simpleComment = {
            reddit_comment_id: comment.id || 'unknown',
            subreddit: comment.subreddit || cleanSubreddit,
            comment_body: comment.body || '',
            comment_author: comment.author || 'unknown',
            comment_score: comment.score || 0,
            permalink: comment.permalink ? `https://reddit.com${comment.permalink}` : '',
            comment_created_utc: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : new Date().toISOString(),
            
            // Basic context (no additional API calls)
            original_post_id: comment.link_id ? comment.link_id.replace('t3_', '') : '',
            original_post_title: 'Basic fetch - no context loaded',
            original_post_content: '',
            original_post_author: 'unknown',
            original_post_score: 0,
            original_post_url: comment.link_id ? `https://reddit.com/comments/${comment.link_id.replace('t3_', '')}` : '',
            
            parent_comment_id: (comment.parent_id && comment.parent_id !== comment.link_id) ? comment.parent_id.replace('t1_', '') : null,
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

          processedComments.push(simpleComment);
          console.log(`✅ Processed comment ${comment.id}`);
        }

        console.log('✅ Processed', processedComments.length, 'comments total');

      } catch (processException) {
        console.error('❌ Comment processing exception:', processException);
        return returnResponse({
          success: false,
          error: 'Error processing comments: ' + processException.message,
          step: 'comment_processing'
        });
      }

      // Step 5: Save to database
      if (processedComments.length > 0) {
        console.log('💾 Step 5: Saving to database...');
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
            console.error('❌ Database insert error:', insertError);
            return returnResponse({
              success: false,
              error: 'Failed to save comments to database: ' + insertError.message,
              step: 'database_insert'
            });
          }

          console.log('✅ Comments saved to database');

        } catch (dbException) {
          console.error('❌ Database exception:', dbException);
          return returnResponse({
            success: false,
            error: 'Database exception: ' + dbException.message,
            step: 'database_exception'
          });
        }
      } else {
        console.log('⚠️ No comments to save');
      }

      // Success!
      console.log('🎉 SUCCESS - Returning response');
      return returnResponse({
        success: true,
        comments: processedComments,
        count: processedComments.length,
        message: `Successfully fetched ${processedComments.length} comments from r/${cleanSubreddit}`,
        step: 'complete'
      });
    }

    if (action === 'get_comments') {
      console.log('📋 GET COMMENTS ACTION');
      
      try {
        const { data: comments, error } = await supabaseClient
          .from('reddit_comments')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('❌ Get comments error:', error);
          return returnResponse({
            success: false,
            error: 'Failed to get comments from database: ' + error.message,
            step: 'get_comments_query'
          });
        }

        console.log('✅ Retrieved', comments?.length || 0, 'comments from database');

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

        return returnResponse({
          success: true,
          comments: mappedComments,
          count: mappedComments.length,
          step: 'get_complete'
        });

      } catch (getException) {
        console.error('❌ Get comments exception:', getException);
        return returnResponse({
          success: false,
          error: 'Exception getting comments: ' + getException.message,
          step: 'get_comments_exception'
        });
      }
    }

    // Unknown action
    console.error('❌ Unknown action:', action);
    return returnResponse({
      success: false,
      error: `Unknown action: ${action}`,
      step: 'unknown_action'
    });

  } catch (generalError) {
    console.error('❌ GENERAL EXCEPTION:', generalError);
    console.error('Stack:', generalError.stack);
    
    return returnResponse({
      success: false,
      error: 'Server exception: ' + generalError.message,
      step: 'general_exception',
      stack: generalError.stack
    });
  }
});