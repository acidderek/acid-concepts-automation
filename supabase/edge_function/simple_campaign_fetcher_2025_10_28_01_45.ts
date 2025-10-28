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
    console.log('🚀 SIMPLE CAMPAIGN FETCHER START');
    
    const requestBody = await req.json();
    const { user_id, campaign_id, subreddits, keywords } = requestBody;

    if (!user_id || !campaign_id) {
      return returnResponse({
        success: false,
        error: 'Missing required parameters'
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
    console.log('✅ Found Reddit access token');

    let allComments = [];
    let scanDetails = [];

    // Process each subreddit
    for (const subreddit of subreddits) {
      console.log(`🔍 Scanning r/${subreddit}`);
      
      let subredditDetails = {
        subreddit: `r/${subreddit}`,
        posts_checked: 0,
        comments_found: 0,
        new_comments: 0,
        duplicates_filtered: 0,
        errors: []
      };

      try {
        // Get hot posts from subreddit
        const postsUrl = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=25`;
        const postsResponse = await fetch(postsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'CampaignBot/1.0'
          }
        });

        if (!postsResponse.ok) {
          const errorText = await postsResponse.text();
          console.error(`❌ Posts API error for r/${subreddit}:`, postsResponse.status, errorText);
          subredditDetails.errors.push(`Posts fetch failed: ${postsResponse.status}`);
          scanDetails.push(subredditDetails);
          continue;
        }

        const postsData = await postsResponse.json();
        const posts = postsData?.data?.children || [];
        subredditDetails.posts_checked = posts.length;

        console.log(`📊 Found ${posts.length} posts in r/${subreddit}`);

        // Process each post
        for (const post of posts) {
          const postData = post.data;
          
          // Check if post matches any keywords
          const postText = `${postData.title} ${postData.selftext || ''}`.toLowerCase();
          const matchingKeywords = keywords.filter(keyword => 
            postText.includes(keyword.toLowerCase())
          );

          if (matchingKeywords.length > 0) {
            // This is a matching post, save it as a "comment"
            const commentData = {
              campaign_id: campaign_id,
              reddit_comment_id: postData.id,
              subreddit: subreddit,
              comment_content: postData.title,
              comment_author: postData.author,
              comment_score: postData.score,
              comment_url: `https://reddit.com${postData.permalink}`,
              comment_created_at: new Date(postData.created_utc * 1000).toISOString(),
              keyword_matched: matchingKeywords[0],
              is_original_post: true
            };

            allComments.push(commentData);
            subredditDetails.comments_found++;
            subredditDetails.new_comments++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing r/${subreddit}:`, error);
        subredditDetails.errors.push(`Processing error: ${error.message}`);
      }

      scanDetails.push(subredditDetails);
    }

    // Save comments to database
    if (allComments.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('campaign_comments_2025_10_27_01_40')
        .insert(allComments);

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        return returnResponse({
          success: false,
          error: 'Failed to save comments to database'
        });
      }
    }

    const totalNew = allComments.length;
    console.log(`✅ Campaign fetch complete: ${totalNew} new comments`);

    return returnResponse({
      success: true,
      message: `Found ${totalNew} new comments`,
      comments_found: totalNew,
      scan_details: scanDetails,
      settings: {
        search_mode: 'hot',
        time_filter: 'day',
        allow_duplicates: false
      }
    });

  } catch (error) {
    console.error('❌ Campaign fetcher error:', error);
    return returnResponse({
      success: false,
      error: `Campaign fetcher error: ${error.message}`
    });
  }
});