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
    console.log('🚀 DEBUG REDDIT FETCHER START');
    
    const requestBody = await req.json();
    console.log('📥 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { user_id, campaign_id, subreddits = [], keywords = [] } = requestBody;

    if (!user_id || !campaign_id) {
      console.log('❌ Missing required parameters');
      return returnResponse({
        success: false,
        error: 'User ID and Campaign ID are required'
      });
    }

    console.log('✅ Parameters validated:', { user_id, campaign_id, subreddits_count: subreddits.length, keywords_count: keywords.length });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('✅ Supabase client initialized');

    // Get Reddit access token
    console.log('🔍 Looking for Reddit access token...');
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_api_keys')
      .select('key_value')
      .eq('user_id', user_id)
      .eq('service', 'reddit_access_token')
      .eq('status', 'active')
      .single();

    console.log('🔑 Token query result:', { tokenData: tokenData ? 'found' : 'not found', tokenError });

    if (tokenError || !tokenData?.key_value) {
      console.log('❌ No Reddit access token found');
      return returnResponse({
        success: false,
        error: 'No Reddit access token found. Please authenticate with Reddit first.'
      });
    }

    const accessToken = tokenData.key_value;
    console.log('✅ Reddit access token found:', accessToken.substring(0, 20) + '...');

    let allResults = [];
    let subredditsScanned = [];

    // Test Reddit API with first subreddit
    if (subreddits.length > 0) {
      const testSubreddit = subreddits[0];
      console.log(`🧪 Testing Reddit API with r/${testSubreddit}`);
      
      const testUrl = `https://oauth.reddit.com/r/${testSubreddit}/hot.json?limit=3`;
      const testResponse = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'CampaignBot/1.0'
        }
      });

      console.log('🧪 Reddit API test response:', testResponse.status, testResponse.statusText);
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('🧪 Reddit API test data structure:', {
          has_data: !!testData.data,
          has_children: !!testData.data?.children,
          children_count: testData.data?.children?.length || 0
        });
        
        if (testData.data?.children?.length > 0) {
          const firstPost = testData.data.children[0].data;
          console.log('🧪 First post sample:', {
            id: firstPost.id,
            title: firstPost.title?.substring(0, 50) + '...',
            author: firstPost.author,
            subreddit: firstPost.subreddit
          });
        }
      } else {
        const errorText = await testResponse.text();
        console.log('❌ Reddit API test failed:', errorText);
        return returnResponse({
          success: false,
          error: `Reddit API test failed: ${testResponse.status} - ${errorText}`
        });
      }
    }

    // Process each subreddit
    for (const subreddit of subreddits.slice(0, 2)) { // Limit to 2 subreddits for debugging
      let subredditStats = {
        name: subreddit,
        posts_checked: 0,
        comments_found: 0,
        new_comments: 0,
        duplicates_filtered: 0,
        errors: []
      };

      try {
        console.log(`🔍 Processing r/${subreddit}`);
        
        const url = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=5`;
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
        console.log(`📊 Found ${posts.length} posts in r/${subreddit}`);

        // Check each post for keyword matches
        for (const post of posts) {
          const postData = post.data;
          const postText = `${postData.title} ${postData.selftext || ''}`.toLowerCase();
          
          // Find matching keywords
          const matchingKeywords = keywords.filter(keyword => 
            postText.includes(keyword.toLowerCase())
          );

          if (matchingKeywords.length > 0) {
            console.log(`✅ Found match in r/${subreddit}: "${postData.title.substring(0, 50)}..." matches "${matchingKeywords[0]}"`);
            
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

    console.log(`📊 Total results found: ${allResults.length}`);

    // Save results to database
    if (allResults.length > 0) {
      console.log('💾 Attempting to save to database...');
      console.log('💾 Sample result:', JSON.stringify(allResults[0], null, 2));
      
      const { data: insertData, error: insertError } = await supabaseClient
        .from('campaign_comments_2025_10_27_01_40')
        .insert(allResults)
        .select();

      console.log('💾 Database insert result:', { 
        insertData: insertData ? `${insertData.length} rows` : 'null', 
        insertError: insertError ? insertError.message : 'none' 
      });

      if (insertError) {
        console.error('❌ Database insert error details:', insertError);
        return returnResponse({
          success: false,
          error: `Failed to save results to database: ${insertError.message}`,
          debug_info: {
            results_count: allResults.length,
            sample_result: allResults[0],
            error_details: insertError
          }
        });
      }

      console.log('✅ Successfully saved to database');
    } else {
      console.log('ℹ️ No results to save');
    }

    console.log(`✅ Fetch complete: ${allResults.length} results`);

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
      },
      debug_info: {
        reddit_api_working: true,
        results_sample: allResults.slice(0, 2)
      }
    });

  } catch (error) {
    console.error('❌ Debug fetcher error:', error);
    return returnResponse({
      success: false,
      error: `Fetcher error: ${error.message}`,
      debug_info: {
        error_stack: error.stack
      }
    });
  }
});