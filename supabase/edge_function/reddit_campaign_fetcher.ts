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
    console.log('🚀 REDDIT CAMPAIGN FETCHER START');
    
    const requestBody = await req.json();
    const { user_id, campaign_id, subreddits = [], keywords = [], comment_limit = 10 } = requestBody;

    console.log(`📊 Parameters: ${subreddits.length} subreddits, ${keywords.length} keywords, limit: ${comment_limit}`);

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

    // Calculate posts per subreddit based on comment_limit
    const postsPerSubreddit = Math.max(1, Math.ceil(comment_limit / subreddits.length));
    console.log(`📊 Will fetch ${postsPerSubreddit} posts per subreddit (total limit: ${comment_limit})`);

    // Process each subreddit
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
        console.log(`🔍 Fetching ${postsPerSubreddit} posts from r/${subreddit}`);
        
        const url = `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=${postsPerSubreddit}`;
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
              keyword_matched: matchingKeywords[0],
              original_post_url: `https://reddit.com${postData.permalink}`,
              post_type: 'original_post'
            };

            allResults.push(result);
            subredditStats.comments_found++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing r/${subreddit}:`, error);
        subredditStats.errors.push(`Processing error: ${error.message}`);
      }

      subredditsScanned.push(subredditStats);
    }

    // Save results to database - handle duplicates properly
    let savedCount = 0;
    let duplicateCount = 0;

    if (allResults.length > 0) {
      console.log(`💾 Attempting to save ${allResults.length} results to database...`);
      
      // Insert one by one to handle duplicates gracefully
      for (const result of allResults) {
        try {
          const { error: insertError } = await supabaseClient
            .from('campaign_comments')
            .insert([result]);

          if (insertError) {
            if (insertError.code === '23505') {
              // Duplicate key error - this is expected and OK
              duplicateCount++;
              console.log(`ℹ️ Duplicate found: ${result.reddit_comment_id}`);
            } else {
              // Other error - log it
              console.error('❌ Unexpected insert error:', insertError);
            }
          } else {
            savedCount++;
          }
        } catch (error) {
          console.error('❌ Exception during insert:', error);
        }
      }

      console.log(`✅ Successfully saved ${savedCount} new records, ${duplicateCount} duplicates skipped`);
      
      // Update campaign's total_comments_pulled count ONLY if we saved new records
      if (savedCount > 0) {
        try {
          // Get current total count from database
          const { data: currentCampaign } = await supabaseClient
            .from('campaigns')
            .select('total_comments_pulled')
            .eq('id', campaign_id)
            .single();
          
          if (currentCampaign) {
            const newTotal = (currentCampaign.total_comments_pulled || 0) + savedCount;
            await supabaseClient
              .from('campaigns')
              .update({ 
                total_comments_pulled: newTotal,
                last_executed_at: new Date().toISOString()
              })
              .eq('id', campaign_id);
            
            console.log(`✅ Updated campaign total: ${newTotal} comments`);
          }
        } catch (error) {
          console.error('❌ Error updating campaign stats:', error);
        }
      } else {
        // Update last_executed_at even if no new records
        try {
          await supabaseClient
            .from('campaigns')
            .update({ 
              last_executed_at: new Date().toISOString()
            })
            .eq('id', campaign_id);
        } catch (error) {
          console.error('❌ Error updating last_executed_at:', error);
        }
      }
    }

    // Update subreddit stats with actual saved counts
    subredditsScanned.forEach(sub => {
      const subResults = allResults.filter(r => r.subreddit === sub.name);
      sub.new_comments = Math.floor(savedCount * (sub.comments_found / Math.max(1, allResults.length)));
      sub.duplicates_filtered = sub.comments_found - sub.new_comments;
    });

    const resultMessage = savedCount > 0 
      ? `Found ${allResults.length} matching posts, saved ${savedCount} new records (${duplicateCount} were duplicates)`
      : `Found ${allResults.length} matching posts, but all were duplicates - no new records saved`;

    console.log(`✅ Campaign complete: ${resultMessage}`);

    return returnResponse({
      success: true,
      message: resultMessage,
      comments_found: allResults.length,
      new_records_saved: savedCount,
      duplicates_skipped: duplicateCount,
      fetch_log: {
        subreddits_scanned: subredditsScanned,
        total_comments_found: allResults.length,
        total_new_comments: savedCount,
        total_duplicates_filtered: duplicateCount,
        search_mode: 'hot',
        time_filter: 'day',
        allow_duplicates: false
      }
    });

  } catch (error) {
    console.error('❌ Campaign fetcher error:', error);
    return returnResponse({
      success: false,
      error: `Fetcher error: ${error.message}`
    });
  }
});