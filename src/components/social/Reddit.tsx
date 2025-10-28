import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RedditProps {
  user: any;
  setMessage: (message: string) => void;
}

interface EnhancedComment {
  id: string;
  reddit_comment_id: string;
  subreddit: string;
  comment_content: string;
  comment_author: string;
  comment_score: number;
  comment_url: string;
  comment_created_at: string;
  original_post_url?: string;
  upvote_ratio?: number;
  num_comments?: number;
  post_type?: string;
  keyword_matched?: string;
}

const Reddit: React.FC<RedditProps> = ({ user, setMessage }) => {
  const [activeMode, setActiveMode] = useState('fetch');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<EnhancedComment[]>([]);
  
  // Fetch form state
  const [fetchForm, setFetchForm] = useState({
    subreddits: 'technology',
    keywords: '',
    limit: 20,
    searchType: 'posts',
    timeFilter: 'week'
  });

  // Vote and reply state
  const [replyTexts, setReplyTexts] = useState<{[key: string]: string}>({});
  const [replyLoading, setReplyLoading] = useState<{[key: string]: boolean}>({});
  const [showReplyForm, setShowReplyForm] = useState<{[key: string]: boolean}>({});
  const [voteLoading, setVoteLoading] = useState<{[key: string]: boolean}>({});
  const [userVotes, setUserVotes] = useState<{[key: string]: string}>({});
  const [lastReplyTime, setLastReplyTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const fetchRedditContent = async () => {
    if (!user?.id) {
      setMessage('❌ Please log in to fetch Reddit content');
      return;
    }

    const subredditsArray = fetchForm.subreddits
      .split(',')
      .map(s => s.trim())
      .filter(s => s);

    const keywordsArray = fetchForm.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k);

    if (subredditsArray.length === 0) {
      setMessage('❌ Please specify at least one subreddit');
      return;
    }

    try {
      setLoading(true);
      setMessage('🚀 Fetching Reddit content...');
      setComments([]);

      const { data, error } = await supabase.functions.invoke('reddit_max_context_fetcher_2025_10_27_10_00', {
        body: {
          user_id: user.id,
          subreddits: subredditsArray,
          keywords: keywordsArray,
          total_limit: fetchForm.limit,
          search_type: fetchForm.searchType,
          time_filter: fetchForm.timeFilter
        }
      });

      if (error) {
        console.error('Fetch error:', error);
        setMessage(`❌ Failed to fetch content: ${error.message}`);
        return;
      }

      if (data?.success) {
        const results = data.results || [];
        setComments(results);
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ Failed to fetch content: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Fetch exception:', error);
      setMessage(`❌ Fetch error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId: string, voteDirection: '1' | '0' | '-1') => {
    if (!user?.id || !postId) return;

    try {
      setVoteLoading(prev => ({ ...prev, [postId]: true }));
      
      const voteText = voteDirection === '1' ? 'upvoting' : 
                      voteDirection === '-1' ? 'downvoting' : 
                      'removing vote from';
      setMessage(`🔄 ${voteText} post...`);

      const { data, error } = await supabase.functions.invoke('reddit_reply_handler', {
        body: {
          action: 'vote',
          user_id: user.id,
          post_id: postId,
          vote_direction: voteDirection
        }
      });

      if (error) {
        console.error('Vote error:', error);
        setMessage(`❌ Failed to vote: ${error.message}`);
        return;
      }

      if (data?.success) {
        setMessage(`✅ ${data.message}`);
        setUserVotes(prev => ({ ...prev, [postId]: voteDirection }));
      } else {
        setMessage(`❌ Failed to vote: ${data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Vote error:', error);
      setMessage(`❌ Failed to vote: ${error.message}`);
    } finally {
      setVoteLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleReply = async (postId: string) => {
    if (!user?.id || !postId) return;

    // Check cooldown (3 minutes = 180 seconds)
    const now = Date.now();
    const timeSinceLastReply = (now - lastReplyTime) / 1000;
    const requiredCooldown = 180;
    
    if (timeSinceLastReply < requiredCooldown) {
      const remaining = Math.ceil(requiredCooldown - timeSinceLastReply);
      setCooldownRemaining(remaining);
      setMessage(`⏰ Please wait ${remaining} seconds before posting another reply (Reddit rate limit protection)`);
      return;
    }

    const replyText = replyTexts[postId]?.trim();
    if (!replyText) {
      setMessage('❌ Please enter a reply message');
      return;
    }

    try {
      setReplyLoading(prev => ({ ...prev, [postId]: true }));
      setMessage('🔄 Posting reply to Reddit...');

      const { data, error } = await supabase.functions.invoke('reddit_reply_handler', {
        body: {
          action: 'post_reply',
          user_id: user.id,
          post_id: postId,
          reply_text: replyText
        }
      });

      if (error) {
        console.error('Reply error:', error);
        setMessage(`❌ Failed to post reply: ${error.message}`);
        return;
      }

      if (data?.success) {
        setMessage(`✅ ${data.message}`);
        setReplyTexts(prev => ({ ...prev, [postId]: '' }));
        setShowReplyForm(prev => ({ ...prev, [postId]: false }));
        setLastReplyTime(Date.now());
      } else {
        setMessage(`❌ Failed to post reply: ${data?.error || 'Unknown error'}`);
        if (data?.error?.includes('Take a break') || data?.error?.includes('doing that a lot')) {
          setLastReplyTime(Date.now());
          setCooldownRemaining(180);
        }
      }
    } catch (error) {
      console.error('Reply error:', error);
      setMessage(`❌ Failed to post reply: ${error.message}`);
    } finally {
      setReplyLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleReplyForm = (postId: string) => {
    setShowReplyForm(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🔴 Reddit Tools</h2>
        <p className="text-gray-600">Fetch, analyze, and engage with Reddit content</p>
      </div>

      {/* Mode Selector */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveMode('fetch')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeMode === 'fetch'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📥 Fetch Content
          </button>
          <button
            onClick={() => setActiveMode('engage')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeMode === 'engage'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💬 Engage & Reply
          </button>
        </div>
      </div>

      {activeMode === 'fetch' && (
        <div className="space-y-6">
          {/* Fetch Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Content Fetching</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subreddits (comma-separated)
                </label>
                <input
                  type="text"
                  value={fetchForm.subreddits}
                  onChange={(e) => setFetchForm(prev => ({ ...prev, subreddits: e.target.value }))}
                  placeholder="technology, programming, webdev"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords (optional)
                </label>
                <input
                  type="text"
                  value={fetchForm.keywords}
                  onChange={(e) => setFetchForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="AI, automation, startup"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limit
                </label>
                <input
                  type="number"
                  value={fetchForm.limit}
                  onChange={(e) => setFetchForm(prev => ({ ...prev, limit: parseInt(e.target.value) || 20 }))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Filter
                </label>
                <select
                  value={fetchForm.timeFilter}
                  onChange={(e) => setFetchForm(prev => ({ ...prev, timeFilter: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hour">Past Hour</option>
                  <option value="day">Past Day</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchRedditContent}
              disabled={loading}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Fetching...' : '🚀 Fetch Reddit Content'}
            </button>
          </div>
        </div>
      )}

      {/* Results Display */}
      {comments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📋 Results ({comments.length})</h3>
          
          {comments.map((comment, index) => (
            <div key={comment.reddit_comment_id} className="border border-gray-200 rounded-lg p-4 bg-white">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">#{index + 1}</span>
                  <span>•</span>
                  <span className="font-medium">u/{comment.comment_author}</span>
                  <span>•</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">r/{comment.subreddit}</span>
                  {comment.keyword_matched && (
                    <>
                      <span>•</span>
                      <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800">
                        🔍 {comment.keyword_matched}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(comment.comment_created_at).toLocaleString()}
                </div>
              </div>

              {/* Post Content with Enhanced Context */}
              <div className="text-gray-800 bg-gray-50 p-4 rounded mb-3 whitespace-pre-wrap max-h-96 overflow-y-auto">
                <div className="text-sm text-blue-600 mb-2">
                  {comment.has_rich_context ? '🔍 Enhanced Context (includes top comments & metadata)' : '📝 Basic Content'}
                </div>
                {comment.comment_content.substring(0, 2000)}
                {comment.comment_content.length > 2000 && (
                  <div className="text-blue-600 mt-2 cursor-pointer hover:underline">
                    ... Click "View on Reddit" to see full context
                  </div>
                )}
              </div>

              {/* Post Stats with Context Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
                <span>📊 {comment.comment_score} points</span>
                {comment.upvote_ratio && (
                  <span>👍 {Math.round(comment.upvote_ratio * 100)}% upvoted</span>
                )}
                {comment.num_comments && (
                  <span>💬 {comment.num_comments} comments</span>
                )}
                {comment.top_comments_count && (
                  <span className="bg-green-100 px-2 py-1 rounded text-green-800">
                    🔍 {comment.top_comments_count} top comments included
                  </span>
                )}
                {comment.context_quality && (
                  <span className={`px-2 py-1 rounded text-xs ${
                    comment.context_quality === 'maximum' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    📈 {comment.context_quality} context
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex gap-3 items-center">
                  {/* Vote Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleVote(comment.reddit_comment_id, '1')}
                      disabled={voteLoading[comment.reddit_comment_id]}
                      className={`px-2 py-1 text-sm rounded transition-colors ${
                        userVotes[comment.reddit_comment_id] === '1'
                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                      } disabled:opacity-50`}
                    >
                      {voteLoading[comment.reddit_comment_id] ? '⏳' : '⬆️'} Upvote
                    </button>
                    <span className="text-sm text-gray-500 px-2">
                      {comment.comment_score} points
                    </span>
                    <button
                      onClick={() => handleVote(comment.reddit_comment_id, '-1')}
                      disabled={voteLoading[comment.reddit_comment_id]}
                      className={`px-2 py-1 text-sm rounded transition-colors ${
                        userVotes[comment.reddit_comment_id] === '-1'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      } disabled:opacity-50`}
                    >
                      {voteLoading[comment.reddit_comment_id] ? '⏳' : '⬇️'} Downvote
                    </button>
                  </div>

                  {/* Action Links */}
                  <div className="flex gap-3">
                    <a 
                      href={comment.comment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                    >
                      View on Reddit →
                    </a>
                    <button
                      onClick={() => toggleReplyForm(comment.reddit_comment_id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline"
                    >
                      💬 Reply to Post
                    </button>
                  </div>
                </div>

                {/* Reply Form */}
                {showReplyForm[comment.reddit_comment_id] && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h5 className="font-medium text-gray-900 mb-2">Reply to this post:</h5>
                    <textarea
                      value={replyTexts[comment.reddit_comment_id] || ''}
                      onChange={(e) => setReplyTexts(prev => ({ 
                        ...prev, 
                        [comment.reddit_comment_id]: e.target.value 
                      }))}
                      placeholder="Write your reply here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-vertical"
                      rows={4}
                      maxLength={10000}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-xs text-gray-500">
                        <div>{(replyTexts[comment.reddit_comment_id] || '').length}/10,000 characters</div>
                        {cooldownRemaining > 0 && (
                          <div className="text-orange-600 font-medium">
                            ⏰ Cooldown: {Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleReplyForm(comment.reddit_comment_id)}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReply(comment.reddit_comment_id)}
                          disabled={
                            replyLoading[comment.reddit_comment_id] || 
                            !(replyTexts[comment.reddit_comment_id]?.trim()) ||
                            cooldownRemaining > 0
                          }
                          className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {replyLoading[comment.reddit_comment_id] ? 'Posting...' : 
                           cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 
                           'Post Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reddit;