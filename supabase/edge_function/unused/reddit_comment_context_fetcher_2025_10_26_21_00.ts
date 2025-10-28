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

    const { action, user_id, subreddit, post_url, limit = 10, comment_id, status, ai_response } = await req.json();

    console.log('Reddit comment fetcher action:', action);

    switch (action) {
      case 'fetch_comments': {
        // Get user's Reddit token
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('reddit_tokens_2025_10_26_16_00')
          .select('access_token')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokenError || !tokenData) {
          throw new Error('No valid Reddit token found');
        }

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
          throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
        }

        const redditData = await response.json();
        console.log('Reddit API response structure:', JSON.stringify(redditData, null, 2).substring(0, 500));

        const processedComments = [];

        if (isPostUrl) {
          // Processing specific post comments
          const postData = redditData[0]?.data?.children?.[0]?.data;
          const commentsData = redditData[1]?.data?.children || [];

          if (!postData) {
            throw new Error('Post data not found');
          }

          // Process each comment with full context
          for (const commentItem of commentsData) {
            if (commentItem.kind === 't1' && commentItem.data) {
              const comment = commentItem.data;
              
              // Skip deleted/removed comments
              if (comment.body === '[deleted]' || comment.body === '[removed]') {
                continue;
              }

              const processedComment = await processCommentWithContext(
                comment, 
                postData, 
                commentsData, 
                tokenData.access_token
              );
              
              if (processedComment) {
                processedComments.push(processedComment);
              }
            }
          }
        } else {
          // Processing subreddit comments - need to fetch individual post contexts
          const comments = redditData.data?.children || [];
          
          for (const commentItem of comments) {
            if (commentItem.kind === 't1' && commentItem.data) {
              const comment = commentItem.data;
              
              if (comment.body === '[deleted]' || comment.body === '[removed]') {
                continue;
              }

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
                  const processedComment = await processCommentWithContext(
                    comment, 
                    originalPost, 
                    allComments, 
                    tokenData.access_token
                  );
                  
                  if (processedComment) {
                    processedComments.push(processedComment);
                  }
                }
              }
            }
          }
        }

        // Store comments in database
        if (processedComments.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('reddit_comments_2025_10_26_18_00')
            .upsert(processedComments.map(comment => ({
              ...comment,
              user_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })), {
              onConflict: 'reddit_comment_id'
            });

          if (insertError) {
            console.error('Error inserting comments:', insertError);
            throw insertError;
          }
        }

        return new Response(JSON.stringify({
          success: true,
          comments: processedComments,
          count: processedComments.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_comments': {
        const { data: comments, error } = await supabaseClient
          .from('reddit_comments_2025_10_26_18_00')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          comments: comments || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_comment': {
        const { error } = await supabaseClient
          .from('reddit_comments_2025_10_26_18_00')
          .update({
            review_status: status,
            ai_response: ai_response,
            updated_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .eq('user_id', user_id);

        if (error) throw error;

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
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processCommentWithContext(comment, originalPost, allComments, accessToken) {
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
      comment_content: comment.body,
      comment_author: comment.author,
      comment_score: comment.score || 0,
      comment_url: `https://reddit.com${comment.permalink}`,
      comment_created_at: new Date(comment.created_utc * 1000).toISOString(),
      
      // Original post context
      original_post_id: originalPost.id,
      original_post_title: originalPost.title,
      original_post_content: originalPost.selftext || '',
      original_post_author: originalPost.author,
      original_post_score: originalPost.score || 0,
      original_post_url: `https://reddit.com${originalPost.permalink}`,
      
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