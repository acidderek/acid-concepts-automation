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
    console.log('🚀 ENHANCED REDDIT CONTEXT FETCHER START');
    
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

    const { 
      user_id, 
      subreddits = [], 
      keywords = [], 
      total_limit = 10,
      search_type = 'posts',
      time_filter = 'week'
    } = requestBody;

    if (!user_id) {
      return returnResponse({
        success: false,
        error: 'User ID is required',
        step: 'validation'
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get Reddit token
    console.log('📡 Getting Reddit token...');
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
        error: 'No valid Reddit token found. Please authenticate with Reddit first.',
        step: 'token_check'
      });
    }

    console.log('✅ Reddit token found');

    const allResults = [];
    const perSubredditLimit = Math.ceil(total_limit / subreddits.length);

    // Process each subreddit
    for (const subreddit of subreddits) {
      console.log(`🔍 Processing r/${subreddit} with enhanced context...`);
      
      try {
        let subredditResults = [];

        if (keywords.length > 0) {
          // Search with keywords
          for (const keyword of keywords) {
            const searchResults = await searchRedditWithMaxContext(
              tokenData.access_token,
              subreddit,
              keyword,
              search_type,
              time_filter,
              Math.ceil(perSubredditLimit / keywords.length)
            );
            subredditResults.push(...searchResults);
          }
        } else {
          // Get hot posts
          const hotPosts = await getHotPostsWithMaxContext(
            tokenData.access_token,
            subreddit,
            perSubredditLimit
          );
          subredditResults.push(...hotPosts);
        }

        allResults.push(...subredditResults);
        console.log(`✅ Found ${subredditResults.length} enhanced results from r/${subreddit}`);

      } catch (subredditError) {
        console.error(`❌ Error processing r/${subreddit}:`, subredditError);
      }
    }

    // Sort by score and limit results
    allResults.sort((a, b) => (b.comment_score || 0) - (a.comment_score || 0));
    const finalResults = allResults.slice(0, total_limit);

    console.log(`🎉 Enhanced context fetch complete! Found ${finalResults.length} results with rich context`);

    return returnResponse({
      success: true,
      message: `Found ${finalResults.length} posts with enhanced context (including top comments and metadata)`,
      results: finalResults,
      context_summary: {
        subreddits_searched: subreddits,
        keywords_used: keywords,
        total_results: finalResults.length,
        enhanced_context: true,
        includes_top_comments: true,
        includes_metadata: true
      }
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

// Enhanced function to get post with maximum context
async function getPostWithMaxContext(post: any, accessToken: string, subreddit: string): Promise<any> {
  try {
    console.log(`📖 Getting enhanced context for post: ${post.id}`);
    
    // Get top comments for this post
    const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${post.id}`;
    const commentsResponse = await fetch(commentsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditEnhancedFetcher/1.0'
      }
    });

    let topComments = [];
    let commentContext = '';
    
    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json();
      if (commentsData && commentsData.length > 1 && commentsData[1].data?.children) {
        // Get top 5 comments for maximum context
        topComments = commentsData[1].data.children
          .slice(0, 5)
          .filter(comment => 
            comment.data.body && 
            comment.data.body !== '[deleted]' && 
            comment.data.body !== '[removed]' &&
            comment.data.author !== '[deleted]'
          )
          .map(comment => ({
            author: comment.data.author,
            body: comment.data.body.substring(0, 500), // Increased limit
            score: comment.data.score,
            created: new Date(comment.data.created_utc * 1000).toISOString(),
            replies: comment.data.replies ? 'Has replies' : 'No replies'
          }));
      }
    }

    // Build comprehensive content with MAXIMUM context
    let fullContent = '';
    
    // === POST HEADER ===
    fullContent += `=== REDDIT POST ANALYSIS ===\n\n`;
    
    // Post title (always include)
    fullContent += `📝 TITLE: ${post.title}\n\n`;
    
    // Post content based on type with enhanced formatting
    if (post.selftext && post.selftext.trim()) {
      fullContent += `📄 POST CONTENT:\n${post.selftext}\n\n`;
    } else if (post.url && post.url !== `https://www.reddit.com${post.permalink}`) {
      fullContent += `🔗 LINKED CONTENT: ${post.url}\n`;
      if (post.domain) {
        fullContent += `🌐 DOMAIN: ${post.domain}\n`;
      }
      fullContent += `\n`;
    }
    
    // === COMMUNITY CONTEXT ===
    fullContent += `=== COMMUNITY CONTEXT ===\n`;
    fullContent += `🏠 Subreddit: r/${post.subreddit}\n`;
    fullContent += `👤 Author: u/${post.author}\n`;
    fullContent += `📊 Score: ${post.score} points (${Math.round((post.upvote_ratio || 0) * 100)}% upvoted)\n`;
    fullContent += `💬 Comments: ${post.num_comments} total\n`;
    fullContent += `📅 Posted: ${new Date(post.created_utc * 1000).toLocaleString()}\n`;
    
    if (post.link_flair_text) {
      fullContent += `🏷️ Flair: ${post.link_flair_text}\n`;
    }
    
    if (post.author_flair_text) {
      fullContent += `👥 Author Flair: ${post.author_flair_text}\n`;
    }
    
    fullContent += `📱 Post Type: ${post.is_self ? 'Text Discussion' : 'Link/Media Post'}\n`;
    
    if (post.over_18) {
      fullContent += `🔞 NSFW Content\n`;
    }
    
    if (post.spoiler) {
      fullContent += `⚠️ Spoiler Content\n`;
    }
    
    fullContent += `\n`;
    
    // === TOP COMMENTS FOR CONTEXT ===
    if (topComments.length > 0) {
      fullContent += `=== TOP COMMUNITY RESPONSES ===\n`;
      fullContent += `(These comments provide context about community sentiment and discussion)\n\n`;
      
      topComments.forEach((comment, index) => {
        fullContent += `💬 COMMENT ${index + 1} (${comment.score} points):\n`;
        fullContent += `👤 u/${comment.author}:\n`;
        fullContent += `"${comment.body}"\n`;
        if (comment.replies !== 'No replies') {
          fullContent += `↳ ${comment.replies}\n`;
        }
        fullContent += `\n`;
      });
    } else {
      fullContent += `=== COMMENTS STATUS ===\n`;
      fullContent += `No accessible comments found (may be private, deleted, or loading)\n\n`;
    }
    
    // === ENGAGEMENT ANALYSIS ===
    fullContent += `=== ENGAGEMENT ANALYSIS ===\n`;
    const engagementRatio = post.num_comments > 0 ? (post.score / post.num_comments).toFixed(2) : 'N/A';
    fullContent += `📈 Engagement Ratio: ${engagementRatio} (score/comments)\n`;
    fullContent += `🔥 Community Interest: ${post.score > 100 ? 'High' : post.score > 10 ? 'Medium' : 'Low'}\n`;
    fullContent += `💭 Discussion Level: ${post.num_comments > 50 ? 'Very Active' : post.num_comments > 10 ? 'Active' : 'Limited'}\n`;
    fullContent += `⏰ Post Age: ${Math.round((Date.now() - post.created_utc * 1000) / (1000 * 60 * 60))} hours old\n`;
    fullContent += `\n`;
    
    // === STRATEGIC CONTEXT ===
    fullContent += `=== STRATEGIC CONTEXT FOR RESPONSES ===\n`;
    fullContent += `🎯 Best Response Strategy: ${post.num_comments < 10 ? 'Early engagement opportunity' : 'Join active discussion'}\n`;
    fullContent += `📝 Content Type: ${post.is_self ? 'Discussion-focused' : 'Link/media sharing'}\n`;
    fullContent += `🗣️ Community Tone: ${topComments.length > 0 ? 'Active discussion' : 'Limited engagement'}\n`;
    fullContent += `🔗 Direct Link: https://reddit.com${post.permalink}\n`;

    return {
      reddit_comment_id: post.id,
      comment_content: fullContent,
      comment_author: post.author,
      comment_score: post.score,
      comment_created_at: new Date(post.created_utc * 1000).toISOString(),
      comment_url: `https://reddit.com${post.permalink}`,
      subreddit: post.subreddit,
      post_type: post.is_self ? 'text_post' : 'link_post',
      upvote_ratio: post.upvote_ratio,
      num_comments: post.num_comments,
      original_post_url: `https://reddit.com${post.permalink}`,
      post_flair: post.link_flair_text || null,
      post_domain: post.domain || null,
      linked_url: post.url !== `https://www.reddit.com${post.permalink}` ? post.url : null,
      top_comments_count: topComments.length,
      has_rich_context: true,
      context_quality: 'maximum',
      engagement_ratio: engagementRatio,
      post_age_hours: Math.round((Date.now() - post.created_utc * 1000) / (1000 * 60 * 60))
    };

  } catch (error) {
    console.error('❌ Error getting enhanced context:', error);
    // Fallback to basic post info
    return {
      reddit_comment_id: post.id,
      comment_content: `TITLE: ${post.title}\n\nCONTENT: ${post.selftext || 'No additional content available'}\n\nBASIC INFO: Posted in r/${post.subreddit} by u/${post.author}`,
      comment_author: post.author,
      comment_score: post.score,
      comment_created_at: new Date(post.created_utc * 1000).toISOString(),
      comment_url: `https://reddit.com${post.permalink}`,
      subreddit: post.subreddit,
      post_type: post.is_self ? 'text_post' : 'link_post',
      upvote_ratio: post.upvote_ratio,
      num_comments: post.num_comments,
      original_post_url: `https://reddit.com${post.permalink}`,
      has_rich_context: false,
      context_quality: 'basic'
    };
  }
}

// Enhanced search function with maximum context
async function searchRedditWithMaxContext(
  accessToken: string,
  subreddit: string,
  keyword: string,
  searchType: string,
  timeFilter: string,
  limit: number
): Promise<any[]> {
  const results = [];
  
  try {
    console.log(`🔍 Searching r/${subreddit} for "${keyword}" with max context...`);
    
    const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?` +
      `q=${encodeURIComponent(keyword)}&` +
      `restrict_sr=1&` +
      `sort=relevance&` +
      `t=${timeFilter}&` +
      `limit=${limit}&` +
      `type=link`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditEnhancedFetcher/1.0'
      }
    });

    if (!response.ok) {
      console.error(`❌ Search failed for r/${subreddit}:`, response.status);
      return results;
    }

    const data = await response.json();
    
    if (data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        
        // Get enhanced post with maximum context
        const enhancedPost = await getPostWithMaxContext(post, accessToken, subreddit);
        enhancedPost.keyword_matched = keyword;
        enhancedPost.search_relevance = 'high';
        
        results.push(enhancedPost);
      }
    }
  } catch (searchError) {
    console.error('❌ Enhanced search error:', searchError);
  }

  return results;
}

// Enhanced hot posts function with maximum context
async function getHotPostsWithMaxContext(
  accessToken: string,
  subreddit: string,
  limit: number
): Promise<any[]> {
  const results = [];
  
  try {
    console.log(`🔥 Getting hot posts from r/${subreddit} with max context...`);
    
    const hotUrl = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    
    const response = await fetch(hotUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditEnhancedFetcher/1.0'
      }
    });

    if (!response.ok) {
      console.error(`❌ Hot posts failed for r/${subreddit}:`, response.status);
      return results;
    }

    const data = await response.json();
    
    if (data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        
        // Get enhanced post with maximum context
        const enhancedPost = await getPostWithMaxContext(post, accessToken, subreddit);
        enhancedPost.post_type = 'hot_post';
        
        results.push(enhancedPost);
      }
    }
  } catch (hotError) {
    console.error('❌ Enhanced hot posts error:', hotError);
  }

  return results;
}