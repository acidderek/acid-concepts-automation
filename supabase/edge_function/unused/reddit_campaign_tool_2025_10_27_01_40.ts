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
    console.log('🚀 REDDIT CAMPAIGN TOOL START');
    
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
      subreddits = [], 
      keywords = [], 
      total_limit = 10,
      search_type = 'posts', // 'posts', 'comments', 'both'
      time_filter = 'week' // 'hour', 'day', 'week', 'month', 'year', 'all'
    } = requestBody;

    if (!user_id) {
      return returnResponse({
        success: false,
        error: 'User ID is required',
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
    console.log('🎯 Subreddits:', subreddits);
    console.log('🔍 Keywords:', keywords);
    console.log('📊 Total limit:', total_limit);
    console.log('🔎 Search type:', search_type);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
        error: 'No Reddit token found. Please connect your Reddit account.',
        step: 'token_validation'
      });
    }

    console.log('✅ Reddit token found');

    const allResults = [];
    const perSubredditLimit = Math.ceil(total_limit / subreddits.length);

    // Process each subreddit
    for (const subreddit of subreddits) {
      console.log(`🔍 Processing subreddit: r/${subreddit}`);
      
      try {
        let subredditResults = [];

        if (keywords.length > 0) {
          // Search with keywords
          for (const keyword of keywords) {
            console.log(`🔎 Searching for keyword: "${keyword}" in r/${subreddit}`);
            
            const searchResults = await searchRedditWithKeyword(
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
          // Get hot posts without keyword search
          console.log(`📈 Getting hot posts from r/${subreddit}`);
          
          const hotPosts = await getHotPosts(
            tokenData.access_token,
            subreddit,
            perSubredditLimit
          );
          
          subredditResults.push(...hotPosts);
        }

        // Add subreddit info to results
        subredditResults.forEach(result => {
          result.source_subreddit = subreddit;
          result.campaign_keywords = keywords;
        });

        allResults.push(...subredditResults);
        console.log(`✅ Found ${subredditResults.length} results from r/${subreddit}`);

      } catch (subredditError) {
        console.error(`❌ Error processing r/${subreddit}:`, subredditError);
        // Continue with other subreddits
      }
    }

    // Sort by score and limit total results
    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    const finalResults = allResults.slice(0, total_limit);

    console.log(`🎉 Campaign complete! Found ${finalResults.length} total results`);

    return returnResponse({
      success: true,
      message: `Found ${finalResults.length} results across ${subreddits.length} subreddits`,
      results: finalResults,
      campaign_summary: {
        subreddits_searched: subreddits,
        keywords_used: keywords,
        total_results: finalResults.length,
        search_type: search_type,
        time_filter: time_filter
      },
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

// Search Reddit with keywords
async function searchRedditWithKeyword(
  accessToken: string,
  subreddit: string,
  keyword: string,
  searchType: string,
  timeFilter: string,
  limit: number
) {
  const results = [];
  
  try {
    // Search posts
    if (searchType === 'posts' || searchType === 'both') {
      const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?` +
        `q=${encodeURIComponent(keyword)}&` +
        `restrict_sr=1&` +
        `sort=relevance&` +
        `t=${timeFilter}&` +
        `limit=${limit}&` +
        `type=link`;

      console.log('🔗 Search URL:', searchUrl);

      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'RedditCampaignTool/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.data && data.data.children) {
          for (const child of data.data.children) {
            const post = child.data;
            
            results.push({
              reddit_comment_id: post.id,
              comment_content: post.title + '\n\n' + (post.selftext || ''),
              comment_author: post.author,
              comment_score: post.score,
              comment_created_at: new Date(post.created_utc * 1000).toISOString(),
              comment_url: `https://reddit.com${post.permalink}`,
              subreddit: post.subreddit,
              post_type: 'search_result',
              keyword_matched: keyword,
              search_relevance: 'high',
              upvote_ratio: post.upvote_ratio,
              num_comments: post.num_comments,
              original_post_url: `https://reddit.com${post.permalink}`
            });
          }
        }
      }
    }

    // Search comments (if supported)
    if (searchType === 'comments' || searchType === 'both') {
      // Reddit's search API is limited for comments, but we can search post titles
      // and then get comments from those posts
      console.log('💬 Comment search not fully supported by Reddit API, using post search instead');
    }

  } catch (searchError) {
    console.error('❌ Search error:', searchError);
  }

  return results;
}

// Get hot posts from subreddit
async function getHotPosts(accessToken: string, subreddit: string, limit: number) {
  const results = [];
  
  try {
    const hotUrl = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    
    const response = await fetch(hotUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RedditCampaignTool/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.data && data.data.children) {
        for (const child of data.data.children) {
          const post = child.data;
          
          results.push({
            reddit_comment_id: post.id,
            comment_content: post.title + '\n\n' + (post.selftext || ''),
            comment_author: post.author,
            comment_score: post.score,
            comment_created_at: new Date(post.created_utc * 1000).toISOString(),
            comment_url: `https://reddit.com${post.permalink}`,
            subreddit: post.subreddit,
            post_type: 'hot_post',
            upvote_ratio: post.upvote_ratio,
            num_comments: post.num_comments,
            original_post_url: `https://reddit.com${post.permalink}`
          });
        }
      }
    }

  } catch (hotError) {
    console.error('❌ Hot posts error:', hotError);
  }

  return results;
}