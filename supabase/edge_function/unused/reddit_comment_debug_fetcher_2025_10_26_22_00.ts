import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody;
  try {
    requestBody = await req.json();
    console.log('Request received:', JSON.stringify(requestBody, null, 2));
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid JSON in request body'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, subreddit, post_url, limit = 10, comment_id, status, ai_response, filter_type = 'all' } = requestBody;

    console.log('Processing action:', action, 'for user:', user_id);

    // Validate required parameters
    if (!user_id) {
      throw new Error('User ID is required');
    }

    switch (action) {
      case 'fetch_comments': {
        console.log('Starting fetch_comments action');
        
        // Get user's Reddit token
        console.log('Fetching Reddit token for user:', user_id);
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('reddit_tokens_2025_10_26_16_00')
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

        console.log('Reddit token found, preparing API call');

        // Validate input parameters
        if (!subreddit && !post_url) {
          throw new Error('Either subreddit or post_url must be provided');
        }

        let redditUrl;
        let isPostUrl = false;

        if (post_url) {
          const postMatch = post_url.match(/\/comments\/([a-zA-Z0-9]+)/);
          if (postMatch) {
            redditUrl = `https://oauth.reddit.com/comments/${postMatch[1]}.json?limit=${limit}`;
            isPostUrl = true;
          } else {
            throw new Error('Invalid Reddit post URL format');
          }
        } else if (subreddit) {
          redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments.json?limit=${limit}`;
        }

        console.log('Making Reddit API call to:', redditUrl);

        // Make Reddit API call
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
        console.log('Reddit API response received, data structure:', Object.keys(redditData));

        // Get existing comment IDs to prevent duplicates
        console.log('Checking for existing comments to prevent duplicates');
        const { data: existingComments, error: existingError } = await supabaseClient
          .from('reddit_comments_2025_10_26_18_00')
          .select('reddit_comment_id')
          .eq('user_id', user_id);

        if (existingError) {
          console.error('Error fetching existing comments:', existingError);
        }

        const existingIds = new Set((existingComments || []).map(c => c.reddit_comment_id));
        console.log('Found', existingIds.size, 'existing comments');

        const processedComments = [];

        if (isPostUrl) {
          // Processing specific post comments
          const postData = redditData[0]?.data?.children?.[0]?.data;
          const commentsData = redditData[1]?.data?.children || [];

          if (!postData) {
            throw new Error('Post data not found in Reddit response');
          }

          console.log('Processing', commentsData.length, 'comments from specific post');

          for (const commentItem of commentsData) {
            if (commentItem.kind === 't1' && commentItem.data) {
              const comment = commentItem.data;
              
              // Skip deleted/removed comments
              if (comment.body === '[deleted]' || comment.body === '[removed]') {
                continue;
              }

              // Skip duplicates
              if (existingIds.has(comment.id)) {
                console.log('Skipping duplicate comment:', comment.id);
                continue;
              }

              try {
                const processedComment = processCommentSimple(comment, postData);
                if (processedComment) {
                  processedComments.push(processedComment);
                }
              } catch (commentError) {
                console.error('Error processing comment:', comment.id, commentError);
                // Continue with next comment
              }
            }
          }
        } else {
          // Processing subreddit comments
          const comments = redditData.data?.children || [];
          console.log('Processing', comments.length, 'comments from subreddit');
          
          for (const commentItem of comments) {
            if (commentItem.kind === 't1' && commentItem.data) {
              const comment = commentItem.data;
              
              if (comment.body === '[deleted]' || comment.body === '[removed]') {
                continue;
              }

              // Skip duplicates
              if (existingIds.has(comment.id)) {
                console.log('Skipping duplicate comment:', comment.id);
                continue;
              }

              try {
                // For subreddit comments, we need to fetch the post context
                const postResponse = await fetch(`https://oauth.reddit.com/comments/${comment.link_id.replace('t3_', '')}.json`, {
                  headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'RedditAutomation/1.0'
                  }
                });

                if (postResponse.ok) {
                  const postData = await postResponse.json();
                  const originalPost = postData[0]?.data?.children?.[0]?.data;

                  if (originalPost) {
                    const processedComment = processCommentSimple(comment, originalPost);
                    if (processedComment) {
                      processedComments.push(processedComment);
                    }
                  }
                }
              } catch (postError) {
                console.error('Error fetching post context for comment:', comment.id, postError);
                // Continue with next comment
              }
            }
          }
        }

        console.log('Processed', processedComments.length, 'new comments');

        // Store comments in database
        if (processedComments.length > 0) {
          console.log('Inserting comments into database');
          const { error: insertError } = await supabaseClient
            .from('reddit_comments_2025_10_26_18_00')
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

        console.log('Fetch comments completed successfully');
        return new Response(JSON.stringify({
          success: true,
          comments: processedComments,
          count: processedComments.length,
          duplicates_skipped: existingIds.size
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_comments': {
        console.log('Starting get_comments action with filter:', filter_type);
        
        let query = supabaseClient
          .from('reddit_comments_2025_10_26_18_00')
          .select('*')
          .eq('user_id', user_id);

        // Apply filters based on filter_type
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (filter_type) {
          case 'recent':
            query = query.gte('created_at', oneDayAgo.toISOString());
            break;
          case 'new':
            query = query.gte('created_at', oneWeekAgo.toISOString());
            break;
          case 'pending':
            query = query.eq('review_status', 'pending');
            break;
          case 'approved':
            query = query.eq('review_status', 'approved');
            break;
          case 'rejected':
            query = query.eq('review_status', 'rejected');
            break;
          // 'all' - no additional filter
        }

        const { data: comments, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching comments:', error);
          throw error;
        }

        console.log('Fetched', (comments || []).length, 'comments with filter:', filter_type);

        // Map database fields to expected frontend fields
        const mappedComments = (comments || []).map(comment => ({
          id: comment.id,
          reddit_comment_id: comment.reddit_comment_id,
          subreddit: comment.subreddit,
          comment_content: comment.comment_body || comment.comment_content || '',
          comment_author: comment.comment_author || 'Unknown',
          comment_score: comment.comment_score || 0,
          comment_url: comment.permalink || comment.comment_url || '',
          comment_created_at: comment.comment_created_utc || comment.comment_created_at || comment.created_at,
          
          // Original post context
          original_post_id: comment.original_post_id,
          original_post_title: comment.post_title || comment.original_post_title || 'Post title unavailable',
          original_post_content: comment.post_content || comment.original_post_content || '',
          original_post_author: comment.post_author || comment.original_post_author || 'Unknown',
          original_post_score: comment.post_score || comment.original_post_score || 0,
          original_post_url: comment.post_url || comment.original_post_url || '',
          
          // Parent comment context
          parent_comment_id: comment.parent_comment_id,
          parent_comment_content: comment.parent_comment_content,
          parent_comment_author: comment.parent_comment_author,
          parent_comment_score: comment.parent_comment_score || 0,
          
          // Thread metadata
          comment_depth: comment.comment_depth || 0,
          is_top_level_comment: comment.is_top_level_comment !== false,
          thread_context: comment.thread_context,
          
          review_status: comment.review_status || 'pending',
          ai_response: comment.ai_response,
          priority_score: comment.priority_score || 0,
          created_at: comment.created_at,
          updated_at: comment.updated_at
        }));

        return new Response(JSON.stringify({
          success: true,
          comments: mappedComments,
          count: mappedComments.length,
          filter_applied: filter_type
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_comment': {
        console.log('Starting update_comment action for comment:', comment_id);
        
        if (!comment_id) {
          throw new Error('Comment ID is required');
        }

        const { error } = await supabaseClient
          .from('reddit_comments_2025_10_26_18_00')
          .update({
            review_status: status,
            ai_response: ai_response,
            updated_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .eq('user_id', user_id);

        if (error) {
          console.error('Error updating comment:', error);
          throw error;
        }

        console.log('Comment updated successfully');
        return new Response(JSON.stringify({
          success: true,
          message: 'Comment updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Edge Function Error:', error);
    console.error('Error stack:', error.stack);
    
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

// Simplified comment processing function
function processCommentSimple(comment, originalPost) {
  try {
    // Calculate priority score
    let priorityScore = 0;
    priorityScore += Math.min(comment.score || 0, 50);
    priorityScore += Math.min((originalPost.score || 0) / 10, 20);
    if (comment.parent_id === comment.link_id) {
      priorityScore += 10; // Bonus for top-level comments
    }
    if (comment.body && comment.body.length > 200) {
      priorityScore += 15; // Bonus for longer comments
    }
    priorityScore = Math.min(Math.max(priorityScore, 0), 100);

    return {
      reddit_comment_id: comment.id,
      subreddit: comment.subreddit,
      comment_body: comment.body,
      comment_author: comment.author,
      comment_score: comment.score || 0,
      permalink: `https://reddit.com${comment.permalink}`,
      comment_created_utc: new Date(comment.created_utc * 1000).toISOString(),
      
      // Original post context
      post_title: originalPost.title,
      post_content: originalPost.selftext || '',
      post_author: originalPost.author,
      post_score: originalPost.score || 0,
      post_url: `https://reddit.com${originalPost.permalink}`,
      
      // Thread metadata
      comment_depth: 0, // Simplified for now
      is_top_level_comment: comment.parent_id === comment.link_id,
      
      // Default values
      review_status: 'pending',
      ai_response: null,
      priority_score: priorityScore
    };

  } catch (error) {
    console.error('Error in processCommentSimple:', error);
    return null;
  }
}