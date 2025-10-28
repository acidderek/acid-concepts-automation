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
    console.log('🚀 THREAD FETCHER START - Getting original posts');
    
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

    const { action, user_id, subreddit, limit = 1, sort = 'hot' } = requestBody;

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
      console.log('🔍 FETCH THREADS ACTION - Getting original posts');
      
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

      // Step 3: Make Reddit API call for POSTS (not comments)
      console.log('🌐 Step 3: Calling Reddit API for posts...');
      let redditData;
      try {
        // Get posts from subreddit (hot, new, top, etc.)
        const redditUrl = `https://oauth.reddit.com/r/${cleanSubreddit}/${sort}.json?limit=${limit}`;
        console.log('🔗 Reddit URL (posts):', redditUrl);

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

      // Step 4: Process posts (threads)
      console.log('⚙️ Step 4: Processing posts/threads...');
      let processedComments = [];
      try {
        const posts = redditData.data?.children || [];
        console.log('📝 Found', posts.length, 'posts/threads');

        for (let i = 0; i < posts.length; i++) {
          const postItem = posts[i];
          
          if (postItem.kind !== 't3' || !postItem.data) {
            console.log(`⏭️ Skipping non-post item ${i}`);
            continue;
          }

          const post = postItem.data;
          
          if (!post.title || post.title === '[deleted]' || post.title === '[removed]') {
            console.log(`⏭️ Skipping deleted post ${post.id}`);
            continue;
          }

          console.log(`✏️ Processing post ${i + 1}: ${post.id} - "${post.title}"`);

          // Now get the top comments from this post
          console.log(`🔍 Getting comments for post ${post.id}...`);
          let postComments = [];
          
          try {
            // Fetch comments for this specific post
            const commentsUrl = `https://oauth.reddit.com/r/${cleanSubreddit}/comments/${post.id}.json?limit=5`;
            console.log('🔗 Comments URL:', commentsUrl);
            
            const commentsResponse = await fetch(commentsUrl, {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'User-Agent': 'RedditAutomation/1.0'
              }
            });

            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              const comments = commentsData[1]?.data?.children || [];
              
              // Get top 3 comments
              for (let j = 0; j < Math.min(comments.length, 3); j++) {
                const commentItem = comments[j];
                if (commentItem.kind === 't1' && commentItem.data && 
                    commentItem.data.body && 
                    commentItem.data.body !== '[deleted]' && 
                    commentItem.data.body !== '[removed]') {
                  postComments.push({
                    id: commentItem.data.id,
                    author: commentItem.data.author,
                    body: commentItem.data.body.substring(0, 200),
                    score: commentItem.data.score || 0,
                    created_utc: commentItem.data.created_utc
                  });
                }
              }
              console.log(`✅ Found ${postComments.length} comments for post ${post.id}`);
            } else {
              console.log(`⚠️ Could not fetch comments for post ${post.id}`);
            }
          } catch (commentError) {
            console.log(`⚠️ Error fetching comments for post ${post.id}:`, commentError);
          }

          // Create enhanced post object (treating post as the main "comment")
          const enhancedPost = {
            reddit_comment_id: post.id || 'unknown',
            subreddit: post.subreddit || cleanSubreddit,
            comment_body: post.selftext || post.title || '', // Use post content or title as "comment"
            comment_author: post.author || 'unknown',
            comment_score: post.score || 0,
            permalink: post.permalink ? `https://reddit.com${post.permalink}` : '',
            comment_created_utc: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
            
            // Original post context (this IS the original post)
            original_post_id: post.id,
            original_post_title: post.title || 'No title',
            original_post_content: post.selftext || '',
            original_post_author: post.author || 'unknown',
            original_post_score: post.score || 0,
            original_post_url: post.permalink ? `https://reddit.com${post.permalink}` : '',
            
            // No parent comment (this is the top-level post)
            parent_comment_id: null,
            parent_comment_content: null,
            parent_comment_author: null,
            parent_comment_score: null,
            
            // Top comments as "siblings"
            sibling_comments: JSON.stringify(postComments),
            sibling_count: postComments.length,
            
            // Thread metadata
            comment_depth: 0, // Top-level post
            is_top_level_comment: true, // This is the original post
            thread_context: JSON.stringify({
              total_comments: post.num_comments || 0,
              post_age_hours: Math.floor((Date.now() - (post.created_utc * 1000)) / (1000 * 60 * 60)),
              thread_activity: postComments.length,
              post_type: post.is_self ? 'text' : 'link',
              post_url: post.url || '',
              post_domain: post.domain || ''
            }),
            
            review_status: 'pending',
            priority_score: Math.min(Math.max((post.score || 0) + (post.num_comments || 0), 0), 100)
          };

          processedComments.push(enhancedPost);
          console.log(`✅ Processed post ${post.id} with ${postComments.length} top comments`);
        }

        console.log('✅ Processed', processedComments.length, 'posts total');

      } catch (processException) {
        console.error('❌ Post processing exception:', processException);
        return returnResponse({
          success: false,
          error: 'Error processing posts: ' + processException.message,
          step: 'post_processing'
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
              error: 'Failed to save posts to database: ' + insertError.message,
              step: 'database_insert'
            });
          }

          console.log('✅ Posts saved to database');

        } catch (dbException) {
          console.error('❌ Database exception:', dbException);
          return returnResponse({
            success: false,
            error: 'Database exception: ' + dbException.message,
            step: 'database_exception'
          });
        }
      } else {
        console.log('⚠️ No posts to save');
      }

      // Success!
      console.log('🎉 SUCCESS - Returning response');
      return returnResponse({
        success: true,
        comments: processedComments,
        count: processedComments.length,
        message: `Successfully fetched ${processedComments.length} posts/threads from r/${cleanSubreddit}`,
        step: 'complete'
      });
    }

    if (action === 'get_comments') {
      console.log('📋 GET POSTS ACTION');
      
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
            error: 'Failed to get posts from database: ' + error.message,
            step: 'get_comments_query'
          });
        }

        console.log('✅ Retrieved', comments?.length || 0, 'posts from database');

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
        console.error('❌ Get posts exception:', getException);
        return returnResponse({
          success: false,
          error: 'Exception getting posts: ' + getException.message,
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