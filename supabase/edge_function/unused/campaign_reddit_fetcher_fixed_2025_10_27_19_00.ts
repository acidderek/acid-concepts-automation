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
    console.log('🚀 FIXED CAMPAIGN REDDIT FETCHER START');
    
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
    console.log('🎯 Campaign ID:', campaign_id);
    console.log('🎯 Subreddits:', subreddits);
    console.log('🔍 Keywords:', keywords);
    console.log('📊 Comment limit:', comment_limit);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify campaign exists and belongs to user
    console.log('🔍 Verifying campaign ownership...');
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

    console.log('✅ Campaign verified:', campaign.name);

    // Get existing reddit_comment_ids to avoid duplicates
    console.log('🔍 Checking existing comments for deduplication...');
    const { data: existingComments, error: existingError } = await supabaseClient
      .from('campaign_comments_2025_10_27_01_40')
      .select('reddit_comment_id')
      .eq('campaign_id', campaign_id);

    if (existingError) {
      console.error('❌ Error checking existing comments:', existingError);
      return returnResponse({
        success: false,
        error: 'Failed to check existing comments',
        step: 'deduplication_check'
      });
    }

    const existingIds = new Set(existingComments?.map(c => c.reddit_comment_id) || []);
    console.log(`📊 Found ${existingIds.size} existing comments to avoid`);

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
    const perSubredditLimit = Math.ceil(comment_limit / subreddits.length);

    // Process each subreddit
    for (const subreddit of subreddits) {
      console.log(`🔍 Processing subreddit: r/${subreddit}`);
      
      try {
        let subredditResults = [];

        if (keywords.length > 0) {
          // Search with keywords
          for (const keyword of keywords) {
            console.log(`🔎 Searching for keyword: "${keyword}" in r/${subreddit}`);
            
            const searchResults = await searchRedditWithKeywordFixed(
              tokenData.access_token,
              subreddit,
              keyword,
              Math.ceil(perSubredditLimit / keywords.length),
              existingIds
            );
            
            subredditResults.push(...searchResults);
          }
        } else {
          // Get hot posts without keyword search
          console.log(`📈 Getting hot posts from r/${subreddit}`);
          
          const hotPosts = await getHotPostsFixed(
            tokenData.access_token,
            subreddit,
            perSubredditLimit,
            existingIds
          );
          
          subredditResults.push(...hotPosts);
        }

        // Add campaign info to results
        subredditResults.forEach(result => {
          result.campaign_id = campaign_id;
          result.source_subreddit = subreddit;
          result.campaign_keywords = keywords;
        });

        allResults.push(...subredditResults);
        console.log(`✅ Found ${subredditResults.length} NEW results from r/${subreddit}`);

      } catch (subredditError) {
        console.error(`❌ Error processing r/${subreddit}:`, subredditError);
        // Continue with other subreddits
      }
    }

    // Sort by score and limit total results
    allResults.sort((a, b) => (b.comment_score || 0) - (a.comment_score || 0));
    const finalResults = allResults.slice(0, comment_limit);

    console.log(`💾 Saving ${finalResults.length} NEW results to database...`);

    if (finalResults.length === 0) {
      return returnResponse({
        success: true,
        message: `No new content found. All matching posts/comments have already been pulled.`,
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

    if (updateError) {
      console.error('❌ Error updating campaign stats:', updateError);
    }

    console.log(`🎉 Campaign execution complete! Saved ${insertedComments?.length || 0} new comments`);

    return returnResponse({
      success: true,
      message: `Successfully pulled ${finalResults.length} NEW posts/comments for campaign "${campaign.name}"`,
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

// FIXED: Search Reddit with keywords - properly distinguish posts vs comments
async function searchRedditWithKeywordFixed(
  accessToken: string,
  subreddit: string,
  keyword: string,
  limit: number,
  existingIds: Set<string>
) {
  const results = [];
  
  try {
    // Search for posts first
    const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?` +
      `q=${encodeURIComponent(keyword)}&` +
      `restrict_sr=1&` +
      `sort=relevance&` +
      `t=week&` +
      `limit=${limit * 2}&` + // Get more to account for filtering
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
          
          // Skip if already exists
          if (existingIds.has(post.id)) {
            console.log(`⏭️ Skipping duplicate post: ${post.id}`);
            continue;
          }
          
          // FIXED: Store as POST, not comment
          results.push({
            reddit_comment_id: post.id,
            comment_content: post.title + (post.selftext ? '\n\n' + post.selftext : ''),
            comment_author: post.author,
            comment_score: post.score,
            comment_created_at: new Date(post.created_utc * 1000).toISOString(),
            comment_url: `https://reddit.com${post.permalink}`,
            subreddit: post.subreddit,
            post_type: 'original_post',
            keyword_matched: keyword,
            upvote_ratio: post.upvote_ratio,
            num_comments: post.num_comments,
            original_post_url: `https://reddit.com${post.permalink}`
          });

          if (results.length >= limit) break;
        }
      }
    }

  } catch (searchError) {
    console.error('❌ Search error:', searchError);
  }

  return results;
}

// FIXED: Get hot posts - properly distinguish posts vs comments
async function getHotPostsFixed(
  accessToken: string,
  subreddit: string,
  limit: number,
  existingIds: Set<string>
) {
  const results = [];
  
  try {
    const hotUrl = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=${limit * 2}`;

    console.log('🔥 Hot posts URL:', hotUrl);

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
          
          // Skip if already exists
          if (existingIds.has(post.id)) {
            console.log(`⏭️ Skipping duplicate post: ${post.id}`);
            continue;
          }
          
          // FIXED: Store as POST, not comment
          results.push({
            reddit_comment_id: post.id,
            comment_content: post.title + (post.selftext ? '\n\n' + post.selftext : ''),
            comment_author: post.author,
            comment_score: post.score,
            comment_created_at: new Date(post.created_utc * 1000).toISOString(),
            comment_url: `https://reddit.com${post.permalink}`,
            subreddit: post.subreddit,
            post_type: 'original_post',
            keyword_matched: null,
            upvote_ratio: post.upvote_ratio,
            num_comments: post.num_comments,
            original_post_url: `https://reddit.com${post.permalink}`
          });

          if (results.length >= limit) break;
        }
      }
    }

  } catch (hotError) {
    console.error('❌ Hot posts error:', hotError);
  }

  return results;
}