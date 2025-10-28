import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  // Always return 200 status, put errors in the response body
  const returnResponse = (data: any) => {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 REDDIT REPLY & VOTE HANDLER START');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📥 Request:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return returnResponse({
        success: false,
        error: 'Invalid JSON in request body',
        step: 'json_parse'
      });
    }

    const { action, user_id, post_id, reply_text, vote_direction } = requestBody;

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

    if (action === 'post_reply') {
      console.log('💬 POST REPLY ACTION');
      
      // Validate inputs
      if (!post_id || typeof post_id !== 'string') {
        return returnResponse({
          success: false,
          error: 'Valid post ID is required',
          step: 'post_id_validation'
        });
      }

      if (!reply_text || typeof reply_text !== 'string' || reply_text.trim().length === 0) {
        return returnResponse({
          success: false,
          error: 'Reply text is required',
          step: 'reply_text_validation'
        });
      }

      if (reply_text.trim().length > 10000) {
        return returnResponse({
          success: false,
          error: 'Reply text is too long (max 10,000 characters)',
          step: 'reply_text_length'
        });
      }

      console.log('✅ Reply inputs validated');
      console.log('📝 Post ID:', post_id);
      console.log('📝 Reply length:', reply_text.trim().length);

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

      // Step 2: Post reply to Reddit
      console.log('🌐 Step 2: Posting reply to Reddit...');
      try {
        // Reddit API endpoint for posting comments
        const replyUrl = 'https://oauth.reddit.com/api/comment';
        console.log('🔗 Reply URL:', replyUrl);

        // Prepare form data for Reddit API
        const formData = new URLSearchParams();
        formData.append('thing_id', `t3_${post_id}`); // t3_ prefix for posts
        formData.append('text', reply_text.trim());
        formData.append('api_type', 'json');

        console.log('📤 Posting reply...');
        const response = await fetch(replyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        });

        console.log('📊 Reddit reply response status:', response.status);

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Could not read error response';
          }
          
          console.error('❌ Reddit reply error:', response.status, errorText);
          
          let userMessage = `Reddit API error (${response.status})`;
          if (response.status === 429) {
            userMessage = 'Reddit rate limit exceeded. Please wait before trying again.';
          } else if (response.status === 401) {
            userMessage = 'Reddit token expired. Please reconnect your Reddit account.';
          } else if (response.status === 403) {
            userMessage = 'Access forbidden. You might not have permission to reply to this post.';
          } else if (response.status === 404) {
            userMessage = 'Post not found or has been deleted.';
          }
          
          return returnResponse({
            success: false,
            error: userMessage,
            step: 'reddit_reply_error',
            details: {
              status: response.status,
              error_text: errorText
            }
          });
        }

        let replyData;
        try {
          replyData = await response.json();
          console.log('✅ Reddit reply response parsed');
          console.log('📋 Reply data:', JSON.stringify(replyData, null, 2));
        } catch (jsonError) {
          console.error('❌ Reddit reply JSON parse error:', jsonError);
          return returnResponse({
            success: false,
            error: 'Failed to parse Reddit reply response',
            step: 'reddit_reply_json_parse'
          });
        }

        // Check if Reddit returned errors
        if (replyData.json && replyData.json.errors && replyData.json.errors.length > 0) {
          const redditErrors = replyData.json.errors;
          console.error('❌ Reddit API errors:', redditErrors);
          
          let errorMessage = 'Reddit error: ';
          redditErrors.forEach((error: any) => {
            if (Array.isArray(error) && error.length > 1) {
              errorMessage += error[1] + ' ';
            }
          });
          
          return returnResponse({
            success: false,
            error: errorMessage.trim(),
            step: 'reddit_api_errors',
            reddit_errors: redditErrors
          });
        }

        // Extract reply information
        let replyInfo = null;
        if (replyData.json && replyData.json.data && replyData.json.data.things && replyData.json.data.things.length > 0) {
          const replyThing = replyData.json.data.things[0];
          if (replyThing.data) {
            replyInfo = {
              id: replyThing.data.id,
              permalink: replyThing.data.permalink,
              created_utc: replyThing.data.created_utc
            };
            console.log('✅ Reply posted successfully:', replyInfo.id);
          }
        }

        // Success!
        console.log('🎉 REPLY SUCCESS');
        return returnResponse({
          success: true,
          message: 'Reply posted successfully to Reddit!',
          reply_info: replyInfo,
          post_id: post_id,
          reply_text_length: reply_text.trim().length,
          step: 'reply_complete'
        });

      } catch (replyException) {
        console.error('❌ Reply exception:', replyException);
        return returnResponse({
          success: false,
          error: 'Network error posting reply: ' + replyException.message,
          step: 'reply_exception'
        });
      }
    }

    if (action === 'vote') {
      console.log('👍 VOTE ACTION');
      
      // Validate inputs
      if (!post_id || typeof post_id !== 'string') {
        return returnResponse({
          success: false,
          error: 'Valid post ID is required',
          step: 'post_id_validation'
        });
      }

      if (!vote_direction || !['1', '0', '-1'].includes(vote_direction)) {
        return returnResponse({
          success: false,
          error: 'Valid vote direction is required (1=upvote, 0=no vote, -1=downvote)',
          step: 'vote_direction_validation'
        });
      }

      console.log('✅ Vote inputs validated');
      console.log('📝 Post ID:', post_id);
      console.log('📝 Vote direction:', vote_direction);

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

      // Step 2: Submit vote to Reddit
      console.log('🌐 Step 2: Submitting vote to Reddit...');
      try {
        // Reddit API endpoint for voting
        const voteUrl = 'https://oauth.reddit.com/api/vote';
        console.log('🔗 Vote URL:', voteUrl);

        // Prepare form data for Reddit API
        const formData = new URLSearchParams();
        formData.append('id', `t3_${post_id}`); // t3_ prefix for posts
        formData.append('dir', vote_direction); // 1=upvote, 0=no vote, -1=downvote

        console.log('📤 Submitting vote...');
        const response = await fetch(voteUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        });

        console.log('📊 Reddit vote response status:', response.status);

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Could not read error response';
          }
          
          console.error('❌ Reddit vote error:', response.status, errorText);
          
          let userMessage = `Reddit API error (${response.status})`;
          if (response.status === 429) {
            userMessage = 'Reddit rate limit exceeded. Please wait before trying again.';
          } else if (response.status === 401) {
            userMessage = 'Reddit token expired. Please reconnect your Reddit account.';
          } else if (response.status === 403) {
            userMessage = 'Access forbidden. You might not have permission to vote on this post.';
          } else if (response.status === 404) {
            userMessage = 'Post not found or has been deleted.';
          }
          
          return returnResponse({
            success: false,
            error: userMessage,
            step: 'reddit_vote_error',
            details: {
              status: response.status,
              error_text: errorText
            }
          });
        }

        // Reddit vote API typically returns empty response on success
        console.log('✅ Vote submitted successfully');

        // Success!
        const voteTypeText = vote_direction === '1' ? 'upvoted' : 
                           vote_direction === '-1' ? 'downvoted' : 
                           'removed vote from';
        
        console.log('🎉 VOTE SUCCESS');
        return returnResponse({
          success: true,
          message: `Successfully ${voteTypeText} the post!`,
          post_id: post_id,
          vote_direction: vote_direction,
          step: 'vote_complete'
        });

      } catch (voteException) {
        console.error('❌ Vote exception:', voteException);
        return returnResponse({
          success: false,
          error: 'Network error submitting vote: ' + voteException.message,
          step: 'vote_exception'
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