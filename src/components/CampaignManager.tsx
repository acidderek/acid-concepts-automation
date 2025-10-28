import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CampaignIntelligence from './CampaignIntelligence';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  subreddits: string[];
  keywords: string[];
  comment_limit: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  last_executed_at?: string;
  total_comments_pulled: number;
  created_at: string;
  updated_at: string;
}

interface CampaignComment {
  id: string;
  campaign_id: string;
  reddit_comment_id: string;
  comment_content: string;
  comment_author: string;
  comment_score: number;
  comment_created_at: string;
  comment_url: string;
  subreddit: string;
  post_type: string;
  keyword_matched?: string;
  upvote_ratio?: number;
  num_comments?: number;
  original_post_url: string;
  original_post_title?: string;
  original_post_content?: string;
  original_post_author?: string;
  original_post_score?: number;
  post_flair?: string;
  comment_context?: string;
  status: 'new' | 'reviewed' | 'responded' | 'ignored';
  created_at: string;
}

interface CampaignManagerProps {
  user: any;
  setMessage: (message: string) => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ user, setMessage }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignComments, setCampaignComments] = useState<CampaignComment[]>([]);
  const [message, setLocalMessage] = useState<string>(''); // Local message state
  
  // Helper function to set only local message (avoid duplicates)
  const updateMessage = (msg: string) => {
    setLocalMessage(msg);
    // Don't set parent message to avoid duplicate display
  };
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'intelligence'>('table');
  const [selectedComment, setSelectedComment] = useState<CampaignComment | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Form state for creating campaigns
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subreddits: '',
    keywords: '',
    comment_limit: 20
  });

  useEffect(() => {
    if (user?.id) {
      loadCampaigns();
    }
  }, [user?.id]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading campaigns:', error);
        updateMessage('❌ Failed to load campaigns');
        return;
      }

      setCampaigns(data || []);
    } catch (error) {
      console.error('Exception loading campaigns:', error);
      updateMessage('❌ Error loading campaigns');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!user?.id) return;

    const subredditsArray = formData.subreddits
      .split(',')
      .map(s => s.trim())
      .filter(s => s);

    const keywordsArray = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k);

    if (!formData.name.trim() || subredditsArray.length === 0) {
      updateMessage('❌ Campaign name and at least one subreddit are required');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          subreddits: subredditsArray,
          keywords: keywordsArray,
          comment_limit: formData.comment_limit,
          status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        updateMessage('❌ Failed to create campaign');
        return;
      }

      updateMessage('✅ Campaign created successfully!');
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        subreddits: '',
        keywords: '',
        comment_limit: 20
      });
      loadCampaigns();
    } catch (error) {
      console.error('Exception creating campaign:', error);
      updateMessage('❌ Error creating campaign');
    } finally {
      setLoading(false);
    }
  };

  const updateCampaign = async () => {
    if (!editingCampaign) return;

    try {
      setLoading(true);
      
      if (!formData.name.trim() || !formData.subreddits.trim()) {
        updateMessage('❌ Campaign name and at least one subreddit are required');
        return;
      }

      const subredditsArray = formData.subreddits.split(',').map(s => s.trim()).filter(s => s);
      const keywordsArray = formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [];

      const { error } = await supabase
        .from('campaigns')
        .update({
          name: formData.name,
          description: formData.description,
          subreddits: subredditsArray,
          keywords: keywordsArray,
          comment_limit: formData.comment_limit,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCampaign.id);

      if (error) {
        updateMessage('❌ Failed to update campaign');
        return;
      }

      updateMessage('✅ Campaign updated successfully!');
      setEditingCampaign(null);
      setFormData({
        name: '',
        description: '',
        subreddits: '',
        keywords: '',
        comment_limit: 5
      });
      loadCampaigns();
    } catch (error: any) {
      updateMessage(`❌ Error updating campaign: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      subreddits: campaign.subreddits.join(', '),
      keywords: campaign.keywords.join(', '),
      comment_limit: campaign.comment_limit
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      description: '',
      subreddits: '',
      keywords: '',
      comment_limit: 5
    });
    setShowCreateForm(false);
  };

  const selectCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    await loadCampaignComments(campaign.id);
  };

  const loadCampaignComments = async (campaignId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaign_comments')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading campaign comments:', error);
        updateMessage('❌ Failed to load campaign comments');
        return;
      }

      setCampaignComments(data || []);
    } catch (error) {
      console.error('Exception loading campaign comments:', error);
      updateMessage('❌ Error loading campaign comments');
    } finally {
      setLoading(false);
    }
  };

  const executeCampaign = async (campaign: Campaign) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      updateMessage('🚀 Executing campaign...');

      const { data, error } = await supabase.functions.invoke('reddit_campaign_fetcher', {
        body: {
          user_id: user.id,
          campaign_id: campaign.id,
          subreddits: campaign.subreddits,
          keywords: campaign.keywords,
          comment_limit: campaign.comment_limit,
          search_mode: 'hot', // Can be changed to 'new', 'top', etc.
          time_filter: 'day', // Can be changed to 'week', 'month', etc.
          allow_duplicates: false // Set to true to re-fetch existing comments
        }
      });

      if (error) {
        console.error('Campaign execution error:', error);
        updateMessage(`❌ Campaign execution failed: ${error.message}`);
        return;
      }

      if (data?.success) {
        // Show detailed results
        const log = data.fetch_log;
        let detailMessage = `✅ ${data.message}\n\n📊 SCAN DETAILS:\n`;
        
        log.subreddits_scanned.forEach((sub: any) => {
          detailMessage += `\n🔍 r/${sub.name}:\n`;
          detailMessage += `  • Posts checked: ${sub.posts_checked}\n`;
          detailMessage += `  • Comments found: ${sub.comments_found}\n`;
          detailMessage += `  • New comments: ${sub.new_comments}\n`;
          detailMessage += `  • Duplicates filtered: ${sub.duplicates_filtered || 0}\n`;
          
          if (sub.keywords_found && Object.keys(sub.keywords_found).length > 0) {
            detailMessage += `  • Keywords: ${Object.entries(sub.keywords_found).map(([k, v]) => `"${k}" (${v} posts)`).join(', ')}\n`;
          }
          
          if (sub.errors && sub.errors.length > 0) {
            detailMessage += `  • Errors: ${sub.errors.join(', ')}\n`;
          }
        });
        
        detailMessage += `\n⚙️ SETTINGS:\n`;
        detailMessage += `  • Search mode: ${log.search_mode || 'hot'}\n`;
        detailMessage += `  • Time filter: ${log.time_filter || 'day'}\n`;
        detailMessage += `  • Allow duplicates: ${log.allow_duplicates ? 'Yes' : 'No'}\n`;
        
        updateMessage(detailMessage);
        
        // Reload campaigns to update stats
        loadCampaigns();
        // If this campaign is selected, reload its comments
        if (selectedCampaign?.id === campaign.id) {
          loadCampaignComments(campaign.id);
        }
      } else {
        updateMessage(`❌ Campaign execution failed: ${data?.error || 'Unknown error'}`);
        if (data?.fetch_log) {
          console.log('Fetch log:', data.fetch_log);
        }
      }
    } catch (error) {
      console.error('Campaign execution exception:', error);
      updateMessage(`❌ Campaign execution error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateCommentStatus = async (commentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaign_comments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) {
        console.error('Error updating comment status:', error);
        updateMessage('❌ Failed to update comment status');
        return;
      }

      // Update local state
      setCampaignComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, status: newStatus as any }
            : comment
        )
      );
    } catch (error) {
      console.error('Exception updating comment status:', error);
      updateMessage('❌ Error updating comment status');
    }
  };

  // Delete campaign function
  const deleteCampaign = async (campaignId: string) => {
    if (!user?.id) {
      updateMessage('❌ Please log in to delete campaigns');
      return;
    }

    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      updateMessage('🗑️ Deleting campaign...');

      // Delete campaign comments first
      const { error: commentsError } = await supabase
        .from('campaign_comments')
        .delete()
        .eq('campaign_id', campaignId);

      if (commentsError) {
        console.error('Error deleting campaign comments:', commentsError);
        updateMessage('❌ Failed to delete campaign comments');
        return;
      }

      // Delete campaign
      const { error: campaignError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user.id);

      if (campaignError) {
        console.error('Error deleting campaign:', campaignError);
        updateMessage('❌ Failed to delete campaign');
        return;
      }

      // Update local state
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null);
        setCampaignComments([]);
      }

      updateMessage('✅ Campaign deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      updateMessage('❌ Error deleting campaign');
    } finally {
      setLoading(false);
    }
  };

  // View comment details
  const viewCommentDetails = (comment: CampaignComment) => {
    setSelectedComment(comment);
    setShowCommentModal(true);
  };

  // Comment Details Modal - Enhanced to show ALL pulled data
  const renderCommentModal = () => {
    if (!showCommentModal || !selectedComment) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Reddit Thread View</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span>📍 r/{selectedComment.subreddit}</span>
                  <span>🕒 {new Date(selectedComment.comment_created_at).toLocaleString()}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedComment.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    selectedComment.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                    selectedComment.status === 'responded' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedComment.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-light"
              >
                ×
              </button>
            </div>

            {/* Reddit-Style Thread Layout */}
            <div className="space-y-6">
              
              {/* Original Post */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">r/{selectedComment.subreddit}</span>
                    <span>•</span>
                    <span>Posted by u/{selectedComment.original_post_author || selectedComment.comment_author}</span>
                    <span>•</span>
                    <span>{selectedComment.original_post_score || selectedComment.comment_score} points</span>
                    {selectedComment.post_flair && (
                      <>
                        <span>•</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{selectedComment.post_flair}</span>
                      </>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {selectedComment.original_post_title || selectedComment.comment_content.split('\n')[0].substring(0, 100)}
                  </h2>
                  
                  {/* Show post content if available */}
                  {selectedComment.original_post_content && (
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedComment.original_post_content}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                    <span>💬 {selectedComment.num_comments || 0} comments</span>
                    <span>📊 {selectedComment.upvote_ratio ? `${(selectedComment.upvote_ratio * 100).toFixed(0)}% upvoted` : 'N/A'}</span>
                    <span>🔗 {selectedComment.post_type || 'post'}</span>
                  </div>
                </div>
                
                {/* Content Analysis */}
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">📊 Content Analysis</h4>
                  
                  {/* Check if this is an original post or actual comment */}
                  {selectedComment.post_type === 'original_post' ? (
                    // This is an original post
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center space-x-2 text-blue-800 mb-2">
                        <span>📄</span>
                        <span className="font-medium">Original Post Found</span>
                      </div>
                      <div className="text-blue-700 text-sm space-y-2">
                        <p>This original post matched your campaign keywords "{selectedComment.keyword_matched}".</p>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <span className="font-medium">Engagement:</span>
                            <div>{selectedComment.num_comments || 0} comments, {selectedComment.comment_score} points</div>
                          </div>
                          <div>
                            <span className="font-medium">Upvote Ratio:</span>
                            <div>{selectedComment.upvote_ratio ? `${(selectedComment.upvote_ratio * 100).toFixed(0)}%` : 'N/A'}</div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs">
                          💡 <strong>To see all {selectedComment.num_comments || 0} comments:</strong> Click "View Full Post on Reddit" below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // This is an actual comment
                    <div className="space-y-4">
                      {/* Parent Comments Context */}
                      {selectedComment.comment_context && (
                        <div className="p-3 bg-gray-50 border-l-4 border-blue-400 rounded-r">
                          <h5 className="font-medium text-gray-700 mb-2">📝 Parent Comments:</h5>
                          <div className="text-gray-600 text-sm whitespace-pre-wrap">
                            {selectedComment.comment_context}
                          </div>
                        </div>
                      )}
                      
                      {/* The Target Comment */}
                      <div className="border-l-4 border-green-400 bg-green-50 pl-4 py-3 rounded-r">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            🎯 FOUND COMMENT
                          </span>
                          <span className="font-medium text-green-900">u/{selectedComment.comment_author}</span>
                          <span>•</span>
                          <span>{selectedComment.comment_score} points</span>
                          <span>•</span>
                          <span>{new Date(selectedComment.comment_created_at).toLocaleString()}</span>
                          {selectedComment.keyword_matched && (
                            <>
                              <span>•</span>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                🔍 Matched: {selectedComment.keyword_matched}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                          {selectedComment.comment_content}
                        </div>
                      </div>
                      
                      {/* Context Notice for comments */}
                      {!selectedComment.comment_context && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="flex items-center space-x-2 text-yellow-800">
                            <span>⚠️</span>
                            <span className="font-medium">Limited Context</span>
                          </div>
                          <p className="text-yellow-700 text-sm mt-1">
                            Parent comment context not available. This shows the original post and the comment that matched your keywords.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign Management Panel */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📋 Campaign Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Pulled:</span>
                    <div className="text-gray-800">{new Date(selectedComment.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Comment ID:</span>
                    <div className="text-gray-800 font-mono text-xs">{selectedComment.reddit_comment_id}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <select
                      value={selectedComment.status}
                      onChange={(e) => {
                        updateCommentStatus(selectedComment.id, e.target.value);
                        setSelectedComment(prev => prev ? { ...prev, status: e.target.value as any } : null);
                      }}
                      className="mt-1 px-2 py-1 border border-gray-300 rounded text-xs w-full"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="responded">Responded</option>
                      <option value="ignored">Ignored</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t mt-6">
              <div className="space-x-3">
                <a
                  href={selectedComment.comment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  🔗 View Comment on Reddit
                </a>
                <a
                  href={selectedComment.original_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📄 View Full Post on Reddit
                </a>
              </div>

              <button
                onClick={() => setShowCommentModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaignList = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Campaign Results</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          ➕ New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Campaigns Yet</h3>
          <p className="text-gray-600 mb-4">Create your first campaign to start pulling Reddit content</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => selectCampaign(campaign)}
              className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all hover:shadow-md"
            >
              {/* Campaign Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{campaign.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>📍 r/{campaign.subreddits.join(', r/')}</span>
                      <span>💬 {campaign.total_comments_pulled} pulled</span>
                      <span>🕒 {campaign.last_executed_at ? new Date(campaign.last_executed_at).toLocaleDateString() : 'Never run'}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeCampaign(campaign);
                      }}
                      disabled={loading}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? '⏳' : '🚀'} Pull
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditCampaign(campaign);
                      }}
                      disabled={loading}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCampaign(campaign.id);
                      }}
                      disabled={loading}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              {/* Pulled Content Preview */}
              <CampaignContentPreview campaignId={campaign.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Component to show pulled content preview for each campaign
  const CampaignContentPreview: React.FC<{ campaignId: string }> = ({ campaignId }) => {
    const [previewComments, setPreviewComments] = useState<CampaignComment[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
      const loadPreview = async () => {
        setPreviewLoading(true);
        try {
          const { data, error } = await supabase
            .from('campaign_comments')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false })
            .limit(3);

          if (error) {
            console.error('Error loading preview:', error);
            return;
          }

          setPreviewComments(data || []);
        } catch (error) {
          console.error('Error loading preview:', error);
        } finally {
          setPreviewLoading(false);
        }
      };

      loadPreview();
    }, [campaignId]);

    if (previewLoading) {
      return (
        <div className="p-4 text-center text-gray-500">
          <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
          <span className="ml-2">Loading preview...</span>
        </div>
      );
    }

    if (previewComments.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          <div className="text-2xl mb-2">📭</div>
          <p>No content pulled yet. Click "🚀 Pull" to fetch Reddit posts.</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-3">
        <h4 className="font-medium text-gray-900 mb-3">📄 Latest Pulled Content:</h4>
        {previewComments.map((comment, index) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">r/{comment.subreddit}</span>
                <span>👤 u/{comment.comment_author}</span>
                <span>⭐ {comment.comment_score}</span>
                {comment.keyword_matched && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">🎯 {comment.keyword_matched}</span>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                comment.status === 'new' ? 'bg-blue-100 text-blue-800' :
                comment.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                comment.status === 'responded' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {comment.status.toUpperCase()}
              </span>
            </div>
            
            {/* Original Post Title */}
            {comment.original_post_title && (
              <div className="mb-2">
                <h5 className="font-medium text-gray-900 text-sm">📄 {comment.original_post_title}</h5>
              </div>
            )}
            
            {/* Comment Preview */}
            <div className="text-gray-700 text-sm">
              <p className="line-clamp-2">
                💬 {comment.comment_content.substring(0, 200)}
                {comment.comment_content.length > 200 && '...'}
              </p>
            </div>
            
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  viewCommentDetails(comment);
                }}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                📖 View Full Thread
              </button>
            </div>
          </div>
        ))}
        
        {previewComments.length >= 3 && (
          <div className="text-center pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const campaign = campaigns.find(c => c.id === campaignId);
                if (campaign) selectCampaign(campaign);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All {campaigns.find(c => c.id === campaignId)?.total_comments_pulled || 0} Comments →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCreateForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Orylu Tech Monitoring"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of campaign goals"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subreddits * (comma-separated)
            </label>
            <input
              type="text"
              value={formData.subreddits}
              onChange={(e) => setFormData(prev => ({ ...prev, subreddits: e.target.value }))}
              placeholder="technology, programming, webdev"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords (comma-separated, optional)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="AI, automation, startup"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment Limit
            </label>
            <input
              type="number"
              value={formData.comment_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, comment_limit: parseInt(e.target.value) || 20 }))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={editingCampaign ? cancelEdit : () => setShowCreateForm(false)}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={editingCampaign ? updateCampaign : createCampaign}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (editingCampaign ? 'Updating...' : 'Creating...') : (editingCampaign ? 'Update Campaign' : 'Create Campaign')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCampaignDetails = () => {
    if (!selectedCampaign) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Campaigns
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{selectedCampaign.name}</h2>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              selectedCampaign.status === 'active' ? 'bg-green-100 text-green-800' :
              selectedCampaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              selectedCampaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {selectedCampaign.status}
            </span>
          </div>
          <button
            onClick={() => executeCampaign(selectedCampaign)}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '⏳ Pulling...' : '🚀 Pull Comments'}
          </button>
        </div>

        {/* Campaign Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Campaign Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Subreddits:</span>
              <div className="text-gray-600">{selectedCampaign.subreddits.join(', ')}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Keywords:</span>
              <div className="text-gray-600">
                {selectedCampaign.keywords.length > 0 ? selectedCampaign.keywords.join(', ') : 'None'}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Comment Limit:</span>
              <div className="text-gray-600">{selectedCampaign.comment_limit}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Total Pulled:</span>
              <div className="text-gray-600">{selectedCampaign.total_comments_pulled}</div>
            </div>
          </div>
          {selectedCampaign.description && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Description:</span>
              <div className="text-gray-600">{selectedCampaign.description}</div>
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'table' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Table
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'kanban' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📋 Kanban
          </button>
          <button
            onClick={() => setViewMode('intelligence')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'intelligence' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🧠 Intelligence
          </button>
        </div>

        {/* Comments Display */}
        {viewMode === 'table' ? renderCommentsTable() : 
         viewMode === 'kanban' ? renderCommentsKanban() :
         <CampaignIntelligence 
           campaignId={selectedCampaign.id} 
           user={user} 
           setMessage={updateMessage} 
         />}
      </div>
    );
  };

  const renderCommentsTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-lg font-semibold">Comments ({campaignComments.length})</h3>
      </div>
      
      {campaignComments.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No comments yet. Click "Pull Comments" to fetch from Reddit.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subreddit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaignComments.map((comment) => (
                <tr key={comment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <select
                      value={comment.status}
                      onChange={(e) => updateCommentStatus(comment.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border-0 ${
                        comment.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        comment.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                        comment.status === 'responded' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="responded">Responded</option>
                      <option value="ignored">Ignored</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">u/{comment.comment_author}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      r/{comment.subreddit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{comment.comment_score}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                    <div className="truncate">
                      {comment.comment_content.substring(0, 100)}
                      {comment.comment_content.length > 100 && '...'}
                    </div>
                    <button
                      onClick={() => viewCommentDetails(comment)}
                      className="text-blue-600 hover:text-blue-800 text-xs mt-1 font-medium"
                    >
                      📖 View Complete Data
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <a
                      href={comment.comment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      🔗 Reddit
                    </a>
                    <a
                      href={comment.original_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800"
                    >
                      📄 Post
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCommentsKanban = () => {
    const statusColumns = [
      { key: 'new', title: 'New', color: 'bg-blue-50 border-blue-200' },
      { key: 'reviewed', title: 'Reviewed', color: 'bg-yellow-50 border-yellow-200' },
      { key: 'responded', title: 'Responded', color: 'bg-green-50 border-green-200' },
      { key: 'ignored', title: 'Ignored', color: 'bg-gray-50 border-gray-200' }
    ];

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Comments Kanban ({campaignComments.length})</h3>
        
        {campaignComments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No comments yet. Click "Pull Comments" to fetch from Reddit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statusColumns.map((column) => {
              const columnComments = campaignComments.filter(c => c.status === column.key);
              
              return (
                <div key={column.key} className={`border-2 rounded-lg p-3 ${column.color}`}>
                  <h4 className="font-semibold text-gray-800 mb-3">
                    {column.title} ({columnComments.length})
                  </h4>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {columnComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-white p-3 rounded shadow-sm border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            u/{comment.comment_author}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            r/{comment.subreddit}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-800 mb-2">
                          {comment.comment_content.substring(0, 150)}
                          {comment.comment_content.length > 150 && '...'}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>📊 {comment.comment_score} points</span>
                          <div className="flex gap-2">
                            <select
                              value={comment.status}
                              onChange={(e) => updateCommentStatus(comment.id, e.target.value)}
                              className="text-xs border rounded px-1"
                            >
                              <option value="new">New</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="responded">Responded</option>
                              <option value="ignored">Ignored</option>
                            </select>
                            <a
                              href={comment.comment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to manage campaigns.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Status Message */}
      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <pre className="text-blue-800 whitespace-pre-wrap font-sans text-sm">{message}</pre>
        </div>
      )}

      {/* Main Content */}
      {selectedCampaign ? renderCampaignDetails() : renderCampaignList()}

      {/* Create Form Modal */}
      {showCreateForm && renderCreateForm()}

      {/* Comment Details Modal */}
      {showCommentModal && renderCommentModal()}
    </div>
  );
};

export default CampaignManager;