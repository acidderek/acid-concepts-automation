import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

// Add delay between API calls to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Enhanced Context Fetcher - Request:', JSON.stringify(requestBody, null, 2));

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
        console.log('Starting ENHANCED fetch_comments with error handling');
        
        // Get user's Reddit token
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('reddit_tokens')
          .select('access_token')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokenError || !tokenData?.access_token) {
          throw new Error('No valid Reddit token found. Please reconnect your Reddit account.');
        }

        if (!subreddit) {
          throw new Error('Subreddit is required');
        }

        console.log('Fetching comments from subreddit with enhanced error handling');

        // Get comments from subreddit
        const redditUrl = `https://oauth.reddit.com/r/${subreddit}/comments.json?limit=${limit}`;
        console.log('Making Reddit API call to:', redditUrl);

        const response = await fetch(redditUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'RedditAutomation/1.0'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Reddit API error:', response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('Reddit API rate limit exceeded. Please wait a few minutes before trying again.');
          }
          if (response.status === 401) {
            throw new Error('Reddit token expired. Please reconnect your Reddit account.');
          }
          if (response.status === 403) {
            throw new Error('Access forbidden. Check if the subreddit exists and is accessible.');
          }
          
          throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
        }

        const redditData = await response.json();
        const comments = redditData.data?.children || [];
        console.log('Found', comments.length, 'comments to process with enhanced context');

        const processedComments = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < comments.length; i++) {
          const commentItem = comments[i];
          
          if (commentItem.kind === 't1' && commentItem.data) {
            const comment = commentItem.data;
            
            if (comment.body === '[deleted]' || comment.body === '[removed]') {
              console.log(`Skipping deleted/removed comment ${comment.id}`);
              continue;
            }

            console.log(`Processing comment ${i + 1}/${comments.length}: ${comment.id}`);

            try {
              // Add delay between requests to avoid rate limiting
              if (i > 0) {
                console.log('Adding delay to avoid rate limiting...');
                await delay(1000); // 1 second delay between requests
              }

              // Get the full post context by fetching the specific post
              const postId = comment.link_id.replace('t3_', '');
              const postUrl = `https://oauth.reddit.com/comments/${postId}.json`;
              
              console.log(`Fetching post context from: ${postUrl}`);
              
              const postResponse = await fetch(postUrl, {
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'User-Agent': 'RedditAutomation/1.0'
                }
              });

              if (!postResponse.ok) {
                console.error(`Failed to fetch post context for ${postId}: ${postResponse.status}`);
                
                // Create basic comment without context if post fetch fails
                const basicComment = {
                  reddit_comment_id: comment.id,
                  subreddit: comment.subreddit,
                  comment_body: comment.body,
                  comment_author: comment.author,
                  comment_score: comment.score || 0,
                  permalink: `https://reddit.com${comment.permalink}`,
                  comment_created_utc: new Date(comment.created_utc * 1000).toISOString(),
                  
                  // Basic fields without context
                  original_post_id: postId,
                  original_post_title: 'Context unavailable',
                  original_post_content: '',
                  original_post_author: 'unknown',
                  original_post_score: 0,
                  original_post_url: `https://reddit.com/comments/${postId}`,
                  
                  parent_comment_id: null,
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

                processedComments.push(basicComment);
                errorCount++;
                continue;
              }

              const postData = await postResponse.json();
              
              // Extract original post data
              const originalPost = postData[0]?.data?.children?.[0]?.data;
              if (!originalPost) {
                console.error(`No post data found for ${postId}`);
                errorCount++;
                continue;
              }

              // Extract all comments from the post (siblings)
              const allPostComments = postData[1]?.data?.children || [];
              
              // Find parent comment if this is a reply
              let parentComment = null;
              if (comment.parent_id !== comment.link_id) {
                const parentId = comment.parent_id.replace('t1_', '');
                parentComment = findCommentById(allPostComments, parentId);
              }

              // Find sibling comments (limit to prevent memory issues)
              const siblingComments = [];
              const maxSiblings = 10; // Limit siblings to prevent memory issues
              
              if (comment.parent_id === comment.link_id) {
                // Top-level comment - siblings are other top-level comments
                let siblingCount = 0;
                for (const sibling of allPostComments) {
                  if (siblingCount >= maxSiblings) break;
                  
                  if (sibling.kind === 't1' && 
                      sibling.data && 
                      sibling.data.id !== comment.id &&
                      sibling.data.parent_id === sibling.data.link_id) {
                    siblingComments.push({
                      id: sibling.data.id,
                      author: sibling.data.author,
                      body: sibling.data.body?.substring(0, 200) || '', // Limit body length
                      score: sibling.data.score || 0,
                      created_utc: sibling.data.created_utc
                    });
                    siblingCount++;
                  }
                }
              } else {
                // Reply comment - siblings are other replies to the same parent
                let siblingCount = 0;
                for (const sibling of allPostComments) {
                  if (siblingCount >= maxSiblings) break;
                  
                  if (sibling.kind === 't1' && 
                      sibling.data && 
                      sibling.data.id !== comment.id &&
                      sibling.data.parent_id === comment.parent_id) {
                    siblingComments.push({
                      id: sibling.data.id,
                      author: sibling.data.author,
                      body: sibling.data.body?.substring(0, 200) || '', // Limit body length
                      score: sibling.data.score || 0,
                      created_utc: sibling.data.created_utc
                    });
                    siblingCount++;
                  }
                }
              }

              // Calculate enhanced priority score
              let priorityScore = 0;
              priorityScore += Math.min(comment.score || 0, 50);
              priorityScore += Math.min((originalPost.score || 0) / 10, 20);
              if (comment.parent_id === comment.link_id) {
                priorityScore += 10; // Top-level bonus
              }
              if (comment.body && comment.body.length > 200) {
                priorityScore += 15; // Length bonus
              }
              if (siblingComments.length > 5) {
                priorityScore += 10; // Active thread bonus
              }
              priorityScore = Math.min(Math.max(priorityScore, 0), 100);

              // Create enhanced comment object with full context
              const enhancedComment = {
                reddit_comment_id: comment.id,
                subreddit: comment.subreddit,
                comment_body: comment.body,
                comment_author: comment.author,
                comment_score: comment.score || 0,
                permalink: `https://reddit.com${comment.permalink}`,
                comment_created_utc: new Date(comment.created_utc * 1000).toISOString(),
                
                // Original post context
                original_post_id: originalPost.id,
                original_post_title: originalPost.title,
                original_post_content: originalPost.selftext?.substring(0, 500) || '', // Limit content length
                original_post_author: originalPost.author,
                original_post_score: originalPost.score || 0,
                original_post_url: `https://reddit.com${originalPost.permalink}`,
                
                // Parent comment context (if reply)
                parent_comment_id: parentComment?.id || null,
                parent_comment_content: parentComment?.body?.substring(0, 300) || null, // Limit content length
                parent_comment_author: parentComment?.author || null,
                parent_comment_score: parentComment?.score || null,
                
                // Sibling comments context
                sibling_comments: JSON.stringify(siblingComments),
                sibling_count: siblingComments.length,
                
                // Thread metadata
                comment_depth: calculateDepth(comment, allPostComments),
                is_top_level_comment: comment.parent_id === comment.link_id,
                thread_context: JSON.stringify({
                  total_comments: allPostComments.length,
                  post_age_hours: Math.floor((Date.now() - (originalPost.created_utc * 1000)) / (1000 * 60 * 60)),
                  thread_activity: siblingComments.length
                }),
                
                review_status: 'pending',
                priority_score: priorityScore
              };

              processedComments.push(enhancedComment);
              successCount++;
              console.log(`✅ Enhanced comment ${comment.id} with ${siblingComments.length} siblings`);

            } catch (contextError) {
              console.error(`❌ Error processing comment ${comment.id}:`, contextError);
              errorCount++;
              
              // Continue with next comment instead of failing completely
              continue;
            }
          }
        }

        console.log(`Processing complete: ${successCount} success, ${errorCount} errors`);

        // Store enhanced comments in database
        if (processedComments.length > 0) {
          console.log('Inserting', processedComments.length, 'enhanced comments into database');
          
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
              throw new Error(`Failed to save comments: ${insertError.message}`);
            }
          } catch (dbError) {
            console.error('Database error:', dbError);
            throw new Error(`Database error: ${dbError.message}`);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          comments: processedComments,
          count: processedComments.length,
          message: `Enhanced comments fetched successfully (${successCount} success, ${errorCount} errors)`,
          stats: {
            success_count: successCount,
            error_count: errorCount,
            total_processed: successCount + errorCount
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_comments': {
        console.log('Getting enhanced comments with context');
        
        const { data: comments, error } = await supabaseClient
          .from('reddit_comments')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        // Map to frontend format with enhanced context
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
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Enhanced Context Fetcher Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to find a comment by ID in the comment tree
function findCommentById(comments: any[], targetId: string): any {
  for (const item of comments) {
    if (item.kind === 't1' && item.data && item.data.id === targetId) {
      return {
        id: item.data.id,
        author: item.data.author,
        body: item.data.body,
        score: item.data.score || 0,
        created_utc: item.data.created_utc
      };
    }
    // Check nested replies (limit depth to prevent infinite loops)
    if (item.data && item.data.replies && item.data.replies.data && item.data.replies.data.children) {
      const found = findCommentById(item.data.replies.data.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to calculate comment depth (with safety limit)
function calculateDepth(comment: any, allComments: any[]): number {
  let depth = 0;
  let currentParentId = comment.parent_id;
  
  while (currentParentId && currentParentId !== comment.link_id && depth < 10) {
    const parentId = currentParentId.replace('t1_', '');
    const parent = findCommentById(allComments, parentId);
    if (parent) {
      depth++;
      currentParentId = parent.parent_id;
    } else {
      break;
    }
  }
  
  return depth;
}