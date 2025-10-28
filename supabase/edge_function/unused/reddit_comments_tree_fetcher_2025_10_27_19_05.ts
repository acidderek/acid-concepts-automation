import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
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
    console.log('🚀 REDDIT COMMENTS FETCHER START');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📥 Campaign Request:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return returnResponse({
        success: false,
        error: 'Invalid JSON in request body',
        step: 'json_parse'
      });
    }

    const { 
      user_id, 
      campaign_id,
      subreddits = [], 
      keywords = [], 
      comment_limit = 20
    } = requestBody;

    if (!user_id || !campaign_id) {
      return returnResponse({
        success: false,
        error: 'User ID and Campaign ID are required',
        step: 'validation'
      });
    }

    if (!subreddits || subreddits.length === 0) {
      return returnResponse({
        success: false,
        error: 'At least one subreddit is required',
        step: 'validation'
      });
    }

    console.log('✅ Campaign parameters validated');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify campaign exists and belongs to user
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns_2025_10_27_01_40')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .single();

    if (campaignError || !campaign) {
      return returnResponse({
        success: false,
        error: 'Campaign not found or access denied',
        step: 'campaign_verification'
      });
    }

    // Get existing reddit_comment_ids to avoid duplicates
    const { data: existingComments, error: existingError } = await supabaseClient
      .from('campaign_comments_2025_10_27_01_40')
      .select('reddit_comment_id')
      .eq('campaign_id', campaign_id);

    const existingIds = new Set(existingComments?.map(c => c.reddit_comment_id) || []);
    console.log(`📊 Found ${existingIds.size} existing comments to avoid`);

    // Get Reddit token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('reddit_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return returnResponse({
        success: false,
        error: 'No Reddit token found. Please connect your Reddit account.',
        step: 'token_validation'
      });
    }

    console.log('✅ Reddit token found');

    const allResults = [];
    const perSubredditLimit = Math.ceil(comment_limit / subreddits.length);

    // Process each subreddit
    for (const subreddit of subreddits) {
      console.log(`🔍 Processing subreddit: r/${subreddit}`);
      
      try {
        let subredditResults = [];

        if (keywords.length > 0) {
          // Search with keywords and get comments
          for (const keyword of keywords) {
            console.log(`🔎 Searching for keyword: "${keyword}" in r/${subreddit}`);
            
            const searchResults = await searchAndGetComments(
              tokenData.access_token,
              subreddit,
              keyword,
              Math.ceil(perSubredditLimit / keywords.length),
              existingIds
            );
            
            subredditResults.push(...searchResults);
          }
        } else {
          // Get hot posts and their comments
          console.log(`📈 Getting hot posts and comments from r/${subreddit}`);
          
          const hotResults = await getHotPostsAndComments(
            tokenData.access_token,
            subreddit,
            perSubredditLimit,
            existingIds
          );
          
          subredditResults.push(...hotResults);
        }

        allResults.push(...subredditResults);
        console.log(`✅ Found ${subredditResults.length} NEW comments from r/${subreddit}`);

      } catch (subredditError) {
        console.error(`❌ Error processing r/${subreddit}:`, subredditError);
      }
    }

    // Sort by score and limit total results
    allResults.sort((a, b) => (b.comment_score || 0) - (a.comment_score || 0));
    const finalResults = allResults.slice(0, comment_limit);

    console.log(`💾 Saving ${finalResults.length} NEW comments to database...`);

    if (finalResults.length === 0) {
      return returnResponse({
        success: true,
        message: `No new comments found. All matching comments have already been pulled.`,
        campaign_id: campaign_id,
        comments_found: 0,
        comments_saved: 0,
        subreddits_processed: subreddits,
        keywords_used: keywords,
        step: 'no_new_content'
      });
    }

    // Save results to campaign_comments table
    const commentsToInsert = finalResults.map(result => ({
      campaign_id: campaign_id,
      reddit_comment_id: result.reddit_comment_id,
      comment_content: result.comment_content,
      comment_author: result.comment_author,
      comment_score: result.comment_score,
      comment_created_at: result.comment_created_at,
      comment_url: result.comment_url,
      subreddit: result.subreddit,
      post_type: result.post_type,
      keyword_matched: result.keyword_matched,
      upvote_ratio: result.upvote_ratio,
      num_comments: result.num_comments,
      original_post_url: result.original_post_url,
      status: 'new'
    }));

    // Insert comments
    const { data: insertedComments, error: insertError } = await supabaseClient
      .from('campaign_comments_2025_10_27_01_40')
      .insert(commentsToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting comments:', insertError);
      return returnResponse({
        success: false,
        error: 'Failed to save comments to database: ' + insertError.message,
        step: 'database_insert'
      });
    }

    // Update campaign stats
    const { error: updateError } = await supabaseClient
      .from('campaigns_2025_10_27_01_40')
      .update({
        last_executed_at: new Date().toISOString(),
        total_comments_pulled: campaign.total_comments_pulled + (insertedComments?.length || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    console.log(`🎉 Campaign execution complete! Saved ${insertedComments?.length || 0} new comments`);

    return returnResponse({
      success: true,
      message: `Successfully pulled ${finalResults.length} NEW comments for campaign "${campaign.name}"`,
      campaign_id: campaign_id,
      comments_found: finalResults.length,
      comments_saved: insertedComments?.length || 0,
      subreddits_processed: subreddits,
      keywords_used: keywords,
      step: 'campaign_complete'
    });

  } catch (generalError) {
    console.error('❌ GENERAL EXCEPTION:', generalError);
    return returnResponse({
      success: false,
      error: 'Server exception: ' + generalError.message,
      step: 'general_exception'
    });
  }
});

// Search for posts and get their comments
async function searchAndGetComments(
  accessToken: string,
  subreddit: string,
  keyword: string,
  limit: number,
  existingIds: Set<string>
) {
  const results = [];
  
  try {
    // First, search for posts
    const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?` +
      `q=${encodeURIComponent(keyword)}&` +
      `restrict_sr=1&` +
      `sort=relevance&` +
      `t=week&` +
      `limit=10&` +
      `type=link`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditCampaignTool/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.data && data.data.children) {
        // For each post, get its comments
        for (const child of data.data.children) {
          const post = child.data;
          
          console.log(`📄 Getting comments for post: ${post.title.substring(0, 50)}...`);
          
          const comments = await getPostComments(
            accessToken,
            post.subreddit,
            post.id,
            post,
            keyword,
            existingIds
          );
          
          results.push(...comments);
          
          if (results.length >= limit) break;
        }
      }
    }

  } catch (searchError) {
    console.error('❌ Search error:', searchError);
  }

  return results.slice(0, limit);
}

// Get hot posts and their comments
async function getHotPostsAndComments(
  accessToken: string,
  subreddit: string,
  limit: number,
  existingIds: Set<string>
) {
  const results = [];
  
  try {
    const hotUrl = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=10`;

    const response = await fetch(hotUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditCampaignTool/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.data && data.data.children) {
        // For each hot post, get its comments
        for (const child of data.data.children) {
          const post = child.data;
          
          console.log(`🔥 Getting comments for hot post: ${post.title.substring(0, 50)}...`);
          
          const comments = await getPostComments(
            accessToken,
            post.subreddit,
            post.id,
            post,
            null,
            existingIds
          );
          
          results.push(...comments);
          
          if (results.length >= limit) break;
        }
      }
    }

  } catch (hotError) {
    console.error('❌ Hot posts error:', hotError);
  }

  return results.slice(0, limit);
}

// Get comments for a specific post
async function getPostComments(
  accessToken: string,
  subreddit: string,
  postId: string,
  postData: any,
  keyword: string | null,
  existingIds: Set<string>
) {
  const results = [];
  
  try {
    const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}.json?limit=50&sort=top`;

    const response = await fetch(commentsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditCampaignTool/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data && data.length >= 2 && data[1].data && data[1].data.children) {
        const comments = data[1].data.children;
        
        // Process comments and build tree structure
        for (const commentChild of comments) {
          if (commentChild.kind === 't1') { // t1 = comment
            const comment = commentChild.data;
            
            // Skip if already exists
            if (existingIds.has(comment.id)) {
              continue;
            }
            
            // Build comment tree text
            const commentTree = buildCommentTree(comment, 0);
            
            results.push({
              reddit_comment_id: comment.id,
              comment_content: `ORIGINAL POST: ${postData.title}\n\n${postData.selftext || ''}\n\n--- COMMENTS ---\n\n${commentTree}`,
              comment_author: comment.author,
              comment_score: comment.score,
              comment_created_at: new Date(comment.created_utc * 1000).toISOString(),
              comment_url: `https://reddit.com${postData.permalink}${comment.id}/`,
              subreddit: subreddit,
              post_type: 'comment_thread',
              keyword_matched: keyword,
              upvote_ratio: postData.upvote_ratio,
              num_comments: postData.num_comments,
              original_post_url: `https://reddit.com${postData.permalink}`
            });
          }
        }
      }
    }

  } catch (commentsError) {
    console.error('❌ Comments error:', commentsError);
  }

  return results;
}

// Build comment tree in plain text format
function buildCommentTree(comment: any, depth: number): string {
  const indent = '  '.repeat(depth);
  let result = '';
  
  if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
    result += `${indent}u/${comment.author} (${comment.score} points):\n`;
    result += `${indent}${comment.body}\n\n`;
    
    // Process replies
    if (comment.replies && comment.replies.data && comment.replies.data.children) {
      for (const reply of comment.replies.data.children) {
        if (reply.kind === 't1') {
          result += buildCommentTree(reply.data, depth + 1);
        }
      }
    }
  }
  
  return result;
}