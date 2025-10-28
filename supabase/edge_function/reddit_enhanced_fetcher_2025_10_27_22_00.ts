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
    console.log('🚀 ENHANCED REDDIT FETCHER START');
    
    const requestBody = await req.json();
    console.log('📥 Request:', JSON.stringify(requestBody, null, 2));

    const { 
      user_id, 
      campaign_id,
      subreddits = [], 
      keywords = [], 
      comment_limit = 20,
      search_mode = 'new', // 'new', 'hot', 'top', 'all'
      time_filter = 'day', // 'hour', 'day', 'week', 'month', 'year', 'all'
      allow_duplicates = false // Allow re-fetching existing comments
    } = requestBody;

    if (!user_id || !campaign_id) {
      return returnResponse({
        success: false,
        error: 'User ID and Campaign ID are required'
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify campaign exists
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns_2025_10_27_01_40')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .single();

    if (campaignError || !campaign) {
      return returnResponse({
        success: false,
        error: 'Campaign not found or access denied'
      });
    }

    // Get existing comments for deduplication (if not allowing duplicates)
    let existingIds = new Set();
    if (!allow_duplicates) {
      const { data: existingComments } = await supabaseClient
        .from('campaign_comments_2025_10_27_01_40')
        .select('reddit_comment_id')
        .eq('campaign_id', campaign_id);
      
      existingIds = new Set(existingComments?.map(c => c.reddit_comment_id) || []);
      console.log(`📊 Found ${existingIds.size} existing comments to avoid`);
    }

    // Get Reddit token from user_api_keys table
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_api_keys')
      .select('key_value')
      .eq('user_id', user_id)
      .eq('service', 'reddit_access_token')
      .eq('status', 'active')
      .single();

    if (tokenError || !tokenData?.key_value) {
      return returnResponse({
        success: false,
        error: 'No Reddit token found. Please connect your Reddit account and ensure you have a valid access token.'
      });
    }

    const accessToken = tokenData.key_value;

    // Detailed logging object
    const fetchLog = {
      timestamp: new Date().toISOString(),
      campaign_id,
      subreddits_scanned: [],
      keywords_searched: keywords,
      search_mode,
      time_filter,
      allow_duplicates,
      total_found: 0,
      total_new: 0,
      total_duplicates: 0,
      errors: []
    };

    const allResults = [];
    const perSubredditLimit = Math.ceil(comment_limit / subreddits.length);

    // Process each subreddit
    for (const subreddit of subreddits) {
      console.log(`🔍 Processing subreddit: r/${subreddit}`);
      
      const subredditLog = {
        name: subreddit,
        posts_checked: 0,
        comments_found: 0,
        new_comments: 0,
        duplicate_comments: 0,
        keywords_found: {},
        errors: []
      };

      try {
        let subredditResults = [];

        if (keywords.length > 0) {
          // Search with keywords
          for (const keyword of keywords) {
            console.log(`🔎 Searching for keyword: "${keyword}" in r/${subreddit}`);
            
            try {
              const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?` +
                `q=${encodeURIComponent(keyword)}&` +
                `sort=${search_mode}&` +
                `t=${time_filter}&` +
                `limit=25&` +
                `restrict_sr=1`;

              const searchResponse = await fetch(searchUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'User-Agent': 'CampaignBot/1.0'
                }
              });

              if (!searchResponse.ok) {
                throw new Error(`Search failed: ${searchResponse.status}`);
              }

              const searchData = await searchResponse.json();
              const posts = searchData.data?.children || [];
              
              subredditLog.posts_checked += posts.length;
              subredditLog.keywords_found[keyword] = posts.length;

              console.log(`📊 Found ${posts.length} posts for keyword "${keyword}"`);

              // Get comments from each post
              for (const post of posts.slice(0, Math.ceil(perSubredditLimit / keywords.length))) {
                const postId = post.data.id;
                const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100`;

                const commentsResponse = await fetch(commentsUrl, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'CampaignBot/1.0'
                  }
                });

                if (commentsResponse.ok) {
                  const commentsData = await commentsResponse.json();
                  const comments = commentsData[1]?.data?.children || [];
                  
                  for (const comment of comments) {
                    if (comment.kind === 't1' && comment.data.body && comment.data.body !== '[deleted]') {
                      const commentId = comment.data.id;
                      
                      subredditLog.comments_found++;
                      
                      if (!allow_duplicates && existingIds.has(commentId)) {
                        subredditLog.duplicate_comments++;
                        continue;
                      }

                      subredditLog.new_comments++;
                      
                      subredditResults.push({
                        reddit_comment_id: commentId,
                        reddit_post_id: postId,
                        subreddit: subreddit,
                        author: comment.data.author,
                        content: comment.data.body,
                        reddit_score: comment.data.score || 0,
                        created_at: new Date(comment.data.created_utc * 1000).toISOString(),
                        post_title: post.data.title,
                        post_url: `https://reddit.com${post.data.permalink}`,
                        comment_url: `https://reddit.com${post.data.permalink}${commentId}/`,
                        keyword_matched: keyword
                      });
                    }
                  }
                }
              }
            } catch (keywordError) {
              console.error(`❌ Error searching keyword "${keyword}":`, keywordError);
              subredditLog.errors.push(`Keyword "${keyword}": ${keywordError.message}`);
            }
          }
        } else {
          // Get posts without keyword search
          console.log(`📈 Getting ${search_mode} posts from r/${subreddit}`);
          
          const postsUrl = `https://oauth.reddit.com/r/${subreddit}/${search_mode}.json?` +
            `t=${time_filter}&limit=25`;

          const postsResponse = await fetch(postsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'CampaignBot/1.0'
            }
          });

          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            const posts = postsData.data?.children || [];
            
            subredditLog.posts_checked = posts.length;
            console.log(`📊 Found ${posts.length} ${search_mode} posts`);

            // Process each post's comments
            for (const post of posts.slice(0, perSubredditLimit)) {
              const postId = post.data.id;
              const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100`;

              const commentsResponse = await fetch(commentsUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'User-Agent': 'CampaignBot/1.0'
                }
              });

              if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json();
                const comments = commentsData[1]?.data?.children || [];
                
                for (const comment of comments) {
                  if (comment.kind === 't1' && comment.data.body && comment.data.body !== '[deleted]') {
                    const commentId = comment.data.id;
                    
                    subredditLog.comments_found++;
                    
                    if (!allow_duplicates && existingIds.has(commentId)) {
                      subredditLog.duplicate_comments++;
                      continue;
                    }

                    subredditLog.new_comments++;
                    
                    subredditResults.push({
                      reddit_comment_id: commentId,
                      reddit_post_id: postId,
                      subreddit: subreddit,
                      author: comment.data.author,
                      content: comment.data.body,
                      reddit_score: comment.data.score || 0,
                      created_at: new Date(comment.data.created_utc * 1000).toISOString(),
                      post_title: post.data.title,
                      post_url: `https://reddit.com${post.data.permalink}`,
                      comment_url: `https://reddit.com${post.data.permalink}${commentId}/`
                    });
                  }
                }
              }
            }
          }
        }

        allResults.push(...subredditResults);
        fetchLog.subreddits_scanned.push(subredditLog);
        
        console.log(`✅ r/${subreddit}: ${subredditLog.new_comments} new comments (${subredditLog.duplicate_comments} duplicates)`);

      } catch (subredditError) {
        console.error(`❌ Error processing r/${subreddit}:`, subredditError);
        subredditLog.errors.push(subredditError.message);
        fetchLog.subreddits_scanned.push(subredditLog);
        fetchLog.errors.push(`r/${subreddit}: ${subredditError.message}`);
      }
    }

    // Update fetch log totals
    fetchLog.total_found = fetchLog.subreddits_scanned.reduce((sum, s) => sum + s.comments_found, 0);
    fetchLog.total_new = fetchLog.subreddits_scanned.reduce((sum, s) => sum + s.new_comments, 0);
    fetchLog.total_duplicates = fetchLog.subreddits_scanned.reduce((sum, s) => sum + s.duplicate_comments, 0);

    // Save results to database
    if (allResults.length > 0) {
      const commentsToInsert = allResults.map(result => ({
        ...result,
        campaign_id,
        user_id,
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabaseClient
        .from('campaign_comments_2025_10_27_01_40')
        .insert(commentsToInsert);

      if (insertError) {
        console.error('❌ Error saving comments:', insertError);
        return returnResponse({
          success: false,
          error: 'Failed to save comments to database',
          fetch_log: fetchLog
        });
      }
    }

    console.log('✅ FETCH COMPLETE');
    console.log('📊 SUMMARY:', JSON.stringify(fetchLog, null, 2));

    return returnResponse({
      success: true,
      message: `Found ${fetchLog.total_new} new comments (${fetchLog.total_duplicates} duplicates filtered)`,
      comments_saved: allResults.length,
      fetch_log: fetchLog
    });

  } catch (error) {
    console.error('❌ FETCH ERROR:', error);
    return returnResponse({
      success: false,
      error: error.message,
      step: 'general_error'
    });
  }
})