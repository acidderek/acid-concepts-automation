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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    const { action, user_id, subreddit, post_url, limit = 10, comment_id, status, ai_response, filter_type = 'all' } = requestBody;

    console.log('Reddit comment fetcher action:', action, 'User ID:', user_id);

    switch (action) {
      case 'fetch_comments': {
        if (!user_id) {
          throw new Error('User ID is required');
        }

        // Get user's Reddit token
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('reddit_tokens_2025_10_26_16_00')
          .select('access_token')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokenError || !tokenData) {
          console.error('Token error:', tokenError);
          throw new Error('No valid Reddit token found. Please reconnect your Reddit account.');
        }

        console.log('Found Reddit token for user');

        let redditUrl;
        let isPostUrl = false;

        if (post_url) {
          // Extract post ID from URL
          const postMatch = post_url.match(/\/comments\/([a-zA-Z0-9]+)/);
          if (postMatch) {
            redditUrl = `https://oauth.reddit.com/comments/${postMatch[1]}.json?limit=${limit}`;
            isPostUrl = true;
          } else {
            throw new Error('Invalid Reddit post URL format');
          }
        } else if (subreddit) {
          // Fetch from subreddit
          redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments.json?limit=${limit}`;
        } else {
          throw new Error('Either subreddit or post_url must be provided');
        }

        console.log('Fetching from Reddit URL:', redditUrl);

        const response = await fetch(redditUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Reddit API error:', response.status, errorText);
          throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
        }

        const redditData = await response.json();
        console.log('Reddit API response received, processing comments...');

        // Get existing comment IDs to prevent duplicates
        const { data: existingComments, error: existingError } = await supabaseClient
          .from('reddit_comments_2025_10_26_18_00')
          .select('reddit_comment_id')
          .eq('user_id', user_id);

        if (existingError) {
          console.error('Error fetching existing comments:', existingError);
        }

        const existingIds = new Set((existingComments || []).map(c => c.reddit_comment_id));
        console.log('Found', existingIds.size, 'existing comments to avoid duplicates');

        const processedComments = [];

        if (isPostUrl) {
          // Processing specific post comments
          const postData = redditData[0]?.data?.children?.[0]?.data;
          const commentsData = redditData[1]?.data?.children || [];

          if (!postData) {
            throw new Error('Post data not found');
          }

          console.log('Processing', commentsData.length, 'comments from post');

          // Process each comment with full context
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

              const processedComment = processCommentWithContext(
                comment, 
                postData, 
                commentsData
              );
              
              if (processedComment) {
                processedComments.push(processedComment);
              }
            }
          }
        } else {
          // Processing subreddit comments - need to fetch individual post contexts
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
                // Fetch the original post for context
                const postResponse = await fetch(`https://oauth.reddit.com/comments/${comment.link_id.replace('t3_', '')}.json`, {
                  headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'RedditAutomation/1.0'
                  }
                });

                if (postResponse.ok) {
                  const postData = await postResponse.json();
                  const originalPost = postData[0]?.data?.children?.[0]?.data;
                  const allComments = postData[1]?.data?.children || [];

                  if (originalPost) {
                    const processedComment = processCommentWithContext(
                      comment, 
                      originalPost, 
                      allComments
                    );
                    
                    if (processedComment) {
                      processedComments.push(processedComment);
                    }
                  }
                }
              } catch (postError) {
                console.error('Error fetching post context for comment:', comment.id, postError);
                // Continue with next comment instead of failing entirely
              }
            }
          }
        }

        console.log('Processed', processedComments.length, 'new comments');

        // Store comments in database with correct field names
        if (processedComments.length > 0) {
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
        if (!user_id) {
          throw new Error('User ID is required');
        }

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
        if (!user_id || !comment_id) {
          throw new Error('User ID and Comment ID are required');
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
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function processCommentWithContext(comment, originalPost, allComments) {
  try {
    // Find parent comment if this is a reply
    let parentComment = null;
    let commentDepth = 0;
    let isTopLevel = true;

    if (comment.parent_id && comment.parent_id !== comment.link_id) {
      // This is a reply to another comment
      isTopLevel = false;
      const parentId = comment.parent_id.replace('t1_', '');
      
      // Find parent in the comments array
      parentComment = findCommentById(allComments, parentId);
      
      if (parentComment) {
        commentDepth = (parentComment.depth || 0) + 1;
      }
    }

    // Build thread context
    const threadContext = {
      original_post: {
        id: originalPost.id,
        title: originalPost.title,
        content: originalPost.selftext || '',
        author: originalPost.author,
        score: originalPost.score,
        url: `https://reddit.com${originalPost.permalink}`,
        created_utc: originalPost.created_utc
      },
      parent_comment: parentComment ? {
        id: parentComment.id,
        content: parentComment.body,
        author: parentComment.author,
        score: parentComment.score,
        created_utc: parentComment.created_utc
      } : null,
      comment_chain: buildCommentChain(comment, allComments)
    };

    return {
      reddit_comment_id: comment.id,
      subreddit: comment.subreddit,
      comment_body: comment.body,
      comment_author: comment.author,
      comment_score: comment.score || 0,
      permalink: `https://reddit.com${comment.permalink}`,
      comment_created_utc: new Date(comment.created_utc * 1000).toISOString(),
      
      // Original post context - using the field names that exist in DB
      post_title: originalPost.title,
      post_content: originalPost.selftext || '',
      post_author: originalPost.author,
      post_score: originalPost.score || 0,
      post_url: `https://reddit.com${originalPost.permalink}`,
      
      // Parent comment context (if reply)
      parent_comment_id: parentComment?.id || null,
      parent_comment_content: parentComment?.body || null,
      parent_comment_author: parentComment?.author || null,
      parent_comment_score: parentComment?.score || 0,
      
      // Thread metadata
      comment_depth: commentDepth,
      is_top_level_comment: isTopLevel,
      thread_context: threadContext,
      
      // Default values
      review_status: 'pending',
      ai_response: null,
      priority_score: calculatePriorityScore(comment, originalPost, parentComment)
    };

  } catch (error) {
    console.error('Error processing comment:', error);
    return null;
  }
}

function findCommentById(comments, commentId) {
  for (const item of comments) {
    if (item.kind === 't1' && item.data && item.data.id === commentId) {
      return item.data;
    }
    // Recursively search in replies
    if (item.data && item.data.replies && item.data.replies.data && item.data.replies.data.children) {
      const found = findCommentById(item.data.replies.data.children, commentId);
      if (found) return found;
    }
  }
  return null;
}

function buildCommentChain(comment, allComments) {
  const chain = [];
  let currentComment = comment;
  
  // Build chain from current comment up to the root
  while (currentComment && currentComment.parent_id !== currentComment.link_id) {
    chain.unshift({
      id: currentComment.id,
      author: currentComment.author,
      content: currentComment.body,
      score: currentComment.score,
      created_utc: currentComment.created_utc
    });
    
    // Find parent
    const parentId = currentComment.parent_id.replace('t1_', '');
    currentComment = findCommentById(allComments, parentId);
  }
  
  return chain;
}

function calculatePriorityScore(comment, originalPost, parentComment) {
  let score = 0;
  
  // Score based on comment score
  score += Math.min(comment.score || 0, 50);
  
  // Score based on original post popularity
  score += Math.min((originalPost.score || 0) / 10, 20);
  
  // Bonus for top-level comments
  if (!parentComment) {
    score += 10;
  }
  
  // Bonus for longer, more detailed comments
  if (comment.body && comment.body.length > 200) {
    score += 15;
  }
  
  return Math.min(Math.max(score, 0), 100);
}