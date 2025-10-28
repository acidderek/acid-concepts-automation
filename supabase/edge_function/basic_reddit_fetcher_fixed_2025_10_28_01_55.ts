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
    console.log('🚀 BASIC REDDIT FETCHER START');
    
    const requestBody = await req.json();
    const { user_id, campaign_id, subreddits = [], keywords = [] } = requestBody;

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

    // Get Reddit access token
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
        error: 'No Reddit access token found. Please authenticate with Reddit first.'
      });
    }

    const accessToken = tokenData.key_value;
    let allResults = [];
    let subredditsScanned = [];

    // Simple approach: get hot posts from each subreddit
    for (const subreddit of subreddits) {
      let subredditStats = {
        name: subreddit,
        posts_checked: 0,
        comments_found: 0,
        new_comments: 0,
        duplicates_filtered: 0,
        errors: []
      };

      try {
        console.log(`🔍 Fetching from r/${subreddit}`);
        
        const url = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=10`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'CampaignBot/1.0'
          }
        });

        if (!response.ok) {
          console.error(`❌ Error fetching r/${subreddit}:`, response.status);
          subredditStats.errors.push(`API error: ${response.status}`);
          subredditsScanned.push(subredditStats);
          continue;
        }

        const data = await response.json();
        const posts = data?.data?.children || [];
        subredditStats.posts_checked = posts.length;

        // Check each post for keyword matches
        for (const post of posts) {
          const postData = post.data;
          const postText = `${postData.title} ${postData.selftext || ''}`.toLowerCase();
          
          // Find matching keywords
          const matchingKeywords = keywords.filter(keyword => 
            postText.includes(keyword.toLowerCase())
          );

          if (matchingKeywords.length > 0) {
            // Found a match - save it
            const result = {
              campaign_id: campaign_id,
              reddit_comment_id: postData.id,
              subreddit: subreddit,
              comment_content: postData.title,
              comment_author: postData.author,
              comment_score: postData.score,
              comment_url: `https://reddit.com${postData.permalink}`,
              comment_created_at: new Date(postData.created_utc * 1000).toISOString(),
              keyword_matched: matchingKeywords[0]
            };

            allResults.push(result);
            subredditStats.comments_found++;
            subredditStats.new_comments++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing r/${subreddit}:`, error);
        subredditStats.errors.push(`Processing error: ${error.message}`);
      }

      subredditsScanned.push(subredditStats);
    }

    // Save results to database (simple insert, no deduplication)
    if (allResults.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('campaign_comments_2025_10_27_01_40')
        .insert(allResults);

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        return returnResponse({
          success: false,
          error: 'Failed to save results to database'
        });
      }
    }

    console.log(`✅ Found ${allResults.length} matching posts`);

    return returnResponse({
      success: true,
      message: `Found ${allResults.length} new comments`,
      comments_found: allResults.length,
      fetch_log: {
        subreddits_scanned: subredditsScanned,
        total_comments_found: allResults.length,
        total_new_comments: allResults.length,
        total_duplicates_filtered: 0
      },
      settings: {
        search_mode: 'hot',
        time_filter: 'day',
        allow_duplicates: false
      }
    });

  } catch (error) {
    console.error('❌ Basic fetcher error:', error);
    return returnResponse({
      success: false,
      error: `Fetcher error: ${error.message}`
    });
  }
});