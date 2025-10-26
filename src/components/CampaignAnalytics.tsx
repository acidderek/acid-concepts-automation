import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, MessageCircle, ThumbsUp, Eye, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

interface MonitoredPost {
  id: string;
  reddit_post_id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  num_comments: number;
  ai_relevance_score: number;
  ai_decision: string;
  ai_reasoning: string;
  ai_suggested_comment: string;
  ai_confidence: number;
  engagement_status: string;
  engagement_action: string;
  discovered_at: string;
  analyzed_at: string;
  engaged_at: string;
}

interface CampaignRun {
  id: string;
  run_type: string;
  status: string;
  posts_discovered: number;
  posts_analyzed: number;
  posts_engaged: number;
  posts_skipped: number;
  execution_time_ms: number;
  started_at: string;
  completed_at: string;
}

interface CampaignStats {
  total_posts: number;
  analyzed_posts: number;
  engaged_posts: number;
  skipped_posts: number;
  avg_relevance_score: number;
  total_cost: number;
  success_rate: number;
}

export const CampaignAnalytics: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<MonitoredPost[]>([]);
  const [recentRuns, setRecentRuns] = useState<CampaignRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignAnalytics();
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns_2025_10_24_23_00')
        .select('id, name, status')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Campaigns table not available:', error);
        setCampaigns([]);
        return;
      }
      
      setCampaigns(data || []);
      
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error: any) {
      console.log('Analytics: Campaigns not available yet');
      setCampaigns([]);
      toast({
        title: 'Info',
        description: 'Analytics will be available once you create campaigns',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignAnalytics = async () => {
    if (!selectedCampaign) return;

    try {
      setLoading(true);

      // Try to fetch campaign stats, but handle gracefully if tables don't exist
      let posts = [];
      try {
        const { data: postsData, error: postsError } = await supabase
          .from('monitored_posts_2025_10_24_09_00')
          .select('*')
          .eq('campaign_id', selectedCampaign)
          .order('discovered_at', { ascending: false });

        if (!postsError && postsData) {
          posts = postsData;
        }
      } catch (error) {
        console.log('Monitored posts table not available yet');
      }

      // Calculate stats
      const totalPosts = posts?.length || 0;
      const analyzedPosts = posts?.filter(p => p.ai_analysis_status === 'analyzed').length || 0;
      const engagedPosts = posts?.filter(p => p.engagement_status === 'completed').length || 0;
      const skippedPosts = posts?.filter(p => p.engagement_action === 'skipped').length || 0;
      
      const relevanceScores = posts?.filter(p => p.ai_relevance_score !== null).map(p => p.ai_relevance_score) || [];
      const avgRelevanceScore = relevanceScores.length > 0 
        ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length 
        : 0;

      const successRate = analyzedPosts > 0 ? (engagedPosts / analyzedPosts) * 100 : 0;

      // Try to fetch AI usage costs, but handle gracefully if tables don't exist
      let totalCost = 0;
      try {
        const { data: aiUsage, error: usageError } = await supabase
          .from('ai_usage_logs_2025_10_24_09_00')
          .select('cost_usd')
          .eq('campaign_id', selectedCampaign);

        if (!usageError && aiUsage) {
          totalCost = aiUsage.reduce((sum, usage) => sum + (usage.cost_usd || 0), 0);
        }
      } catch (error) {
        console.log('AI usage logs table not available yet');
      }

      setStats({
        total_posts: totalPosts,
        analyzed_posts: analyzedPosts,
        engaged_posts: engagedPosts,
        skipped_posts: skippedPosts,
        avg_relevance_score: avgRelevanceScore,
        total_cost: totalCost,
        success_rate: successRate
      });

      // Set recent posts (limit to 20)
      setRecentPosts(posts?.slice(0, 20) || []);

      // Try to fetch recent runs, but handle gracefully if tables don't exist
      let runs = [];
      try {
        const { data: runsData, error: runsError } = await supabase
          .from('campaign_runs_2025_10_24_09_00')
          .select('*')
          .eq('campaign_id', selectedCampaign)
          .order('started_at', { ascending: false })
          .limit(10);

        if (!runsError && runsData) {
          runs = runsData;
        }
      } catch (error) {
        console.log('Campaign runs table not available yet');
      }
      
      setRecentRuns(runs);

    } catch (error: any) {
      console.log('Analytics error:', error);
      toast({
        title: 'Info',
        description: 'Analytics will be available once campaigns are executed and monitoring data is collected',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'running':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'vote':
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'skip':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  if (loading && campaigns.length === 0) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
        <p className="text-gray-600">Create a campaign first to view analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaign Analytics</h2>
          <p className="text-gray-600">Monitor AI performance and engagement metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <div className="flex items-center space-x-2">
                    <span>{campaign.name}</span>
                    <Badge variant={campaign.is_active ? 'default' : 'secondary'} className="text-xs">
                      {campaign.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCampaignAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_posts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.analyzed_posts} analyzed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.engaged_posts} engaged
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Relevance</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.avg_relevance_score * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">
                  AI confidence score
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Costs</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.total_cost.toFixed(4)}</div>
                <p className="text-xs text-muted-foreground">
                  Total spent
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaign Runs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaign Runs</CardTitle>
              <CardDescription>
                Latest execution history and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRuns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No campaign runs yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Discovered</TableHead>
                      <TableHead>Analyzed</TableHead>
                      <TableHead>Engaged</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="capitalize">{run.run_type}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(run.status)}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{run.posts_discovered}</TableCell>
                        <TableCell>{run.posts_analyzed}</TableCell>
                        <TableCell>{run.posts_engaged}</TableCell>
                        <TableCell>
                          {run.execution_time_ms ? `${(run.execution_time_ms / 1000).toFixed(1)}s` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(run.started_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Monitored Posts</CardTitle>
              <CardDescription>
                Latest posts discovered and analyzed by AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No posts monitored yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post</TableHead>
                      <TableHead>Subreddit</TableHead>
                      <TableHead>AI Decision</TableHead>
                      <TableHead>Relevance</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Discovered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium truncate">{post.title}</div>
                            <div className="text-sm text-gray-500">by u/{post.author}</div>
                          </div>
                        </TableCell>
                        <TableCell>r/{post.subreddit}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getDecisionIcon(post.ai_decision)}
                            <span className="capitalize">{post.ai_decision}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {post.ai_relevance_score !== null 
                            ? `${(post.ai_relevance_score * 100).toFixed(0)}%`
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(post.engagement_status)}>
                            {post.engagement_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(post.discovered_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};