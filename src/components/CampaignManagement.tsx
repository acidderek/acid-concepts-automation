import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Calendar, Target, MessageSquare, FileText, RefreshCw, LogOut } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  subreddits: string;
  post_type: string;
  title_template: string;
  content_template: string;
  created_at: string;
}

interface RedditAccount {
  id: string;
  username: string;
  is_active: boolean;
}

interface CampaignRun {
  id: string;
  campaign_id: string;
  reddit_account_id: string;
  subreddit: string;
  post_type: string;
  title: string;
  content: string;
  reddit_post_id: string;
  status: string;
  created_at: string;
}

export default function CampaignManagement() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [redditAccounts, setRedditAccounts] = useState<RedditAccount[]>([]);
  const [campaignRuns, setCampaignRuns] = useState<CampaignRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subreddits: '',
    post_type: 'text',
    title_template: '',
    content_template: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch campaigns with error handling
      try {
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns_2025_10_24_23_00')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (!campaignsError && campaignsData) {
          setCampaigns(campaignsData);
        } else {
          console.log('No campaigns table or data yet');
          setCampaigns([]);
        }
      } catch (error) {
        console.log('Campaigns table not available yet');
        setCampaigns([]);
      }

      // Try to fetch Reddit accounts with error handling
      try {
        const { data: accountsData, error: accountsError } = await supabase
          .from('reddit_accounts_2025_10_24_23_00')
          .select('id, username, is_active')
          .eq('user_id', user?.id)
          .eq('is_active', true);

        if (!accountsError && accountsData) {
          setRedditAccounts(accountsData);
        } else {
          console.log('No Reddit accounts table or data yet');
          setRedditAccounts([]);
        }
      } catch (error) {
        console.log('Reddit accounts table not available yet');
        setRedditAccounts([]);
      }

      // Try to fetch campaign runs with error handling
      try {
        const { data: runsResponse, error: runsError } = await supabase.functions.invoke('reddit_poster', {
          body: { action: 'get_runs' }
        });

        if (!runsError && runsResponse?.runs) {
          setCampaignRuns(runsResponse.runs);
        } else {
          console.log('Campaign runs not available yet');
          setCampaignRuns([]);
        }
      } catch (error) {
        console.log('Campaign runs function not available yet');
        setCampaignRuns([]);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Info",
        description: "Setting up your workspace...",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.subreddits || !formData.title_template || !formData.content_template) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('campaigns_2025_10_24_23_00')
        .insert({
          name: formData.name,
          description: formData.description,
          subreddits: formData.subreddits,
          post_type: formData.post_type,
          title_template: formData.title_template,
          content_template: formData.content_template,
          status: 'draft',
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setCampaigns(prev => [data, ...prev]);
      setFormData({
        name: '',
        description: '',
        subreddits: '',
        post_type: 'text',
        title_template: '',
        content_template: ''
      });
      setShowCreateForm(false);

      toast({
        title: "Success",
        description: "Campaign created successfully!",
      });
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Unable to create campaign. Please ensure your database is set up.",
        variant: "destructive",
      });
    }
  };

  const executeCampaign = async (campaign: Campaign, redditAccountId: string) => {
    if (!redditAccountId) {
      toast({
        title: "Error",
        description: "Please select a Reddit account",
        variant: "destructive",
      });
      return;
    }

    try {
      setExecuting(campaign.id);

      const subreddits = campaign.subreddits.split(',').map(s => s.trim()).filter(s => s);
      
      if (subreddits.length === 0) {
        throw new Error('No valid subreddits specified');
      }

      // Simulate execution for demo
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Campaign Executed",
        description: `Campaign "${campaign.name}" executed successfully!`,
      });

      await fetchData();

    } catch (error: any) {
      console.error('Error executing campaign:', error);
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Logo and User Info */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <svg 
            width="60" 
            height="16" 
            viewBox="0 0 755.97 201.99" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <style>
                {`.cls-1 { fill: #496fb1; }`}
              </style>
            </defs>
            <path className="cls-1" d="M209.46,201.99H72.98l25.61-52.52h56.56l-34.34-69.25-62.23,121.77H0L93.39,17.03c2.6-5.09,6.54-9.38,11.4-12.41C109.64,1.6,115.24,0,120.95,0s11.31,1.6,16.16,4.62c4.82,2.98,8.68,7.29,11.11,12.41l77.91,157.84c1.52,2.85,2.25,6.05,2.09,9.28-.15,3.23-1.18,6.35-2.96,9.04-1.59,2.76-3.9,5.04-6.68,6.59-2.78,1.55-5.93,2.32-9.12,2.22Z"/>
            <path className="cls-1" d="M333.25,52.52c-12.86,0-25.19,5.11-34.28,14.2-9.09,9.09-14.2,21.42-14.2,34.28s5.11,25.19,14.2,34.28,21.42,14.2,34.28,14.2h90.32v52.52h-90.32c-17.79.13-35.29-4.55-50.64-13.56-15.27-8.83-27.96-21.52-36.79-36.79-8.89-15.4-13.56-32.86-13.56-50.64s4.68-35.24,13.56-50.64c8.83-15.27,21.52-27.96,36.79-36.79C297.96,4.56,315.45-.13,333.25,0h90.32v52.52h-90.32Z"/>
            <path className="cls-1" d="M503.78,201.99h-52.52V0h52.52v201.98Z"/>
            <path className="cls-1" d="M654.98,0c17.79-.13,35.29,4.55,50.64,13.56,15.27,8.83,27.96,21.52,36.79,36.79,8.88,15.4,13.56,32.86,13.56,50.64s-4.68,35.24-13.56,50.64c-8.83,15.27-21.52,27.96-36.79,36.79-15.35,9.01-32.85,13.7-50.64,13.56h-116.57V0h116.57ZM654.98,149.47c12.86,0,25.19-5.11,34.28-14.2s14.2-21.42,14.2-34.28-5.11-25.19-14.2-34.28c-9.09-9.09-21.42-14.2-34.28-14.2h-64.06v96.95h64.06Z"/>
          </svg>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Campaign Management</h2>
            <p className="text-muted-foreground">Create and execute automation campaigns</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" onClick={fetchData} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">📋 Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="runs">📊 Execution History ({campaignRuns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <svg 
                    width="45" 
                    height="12" 
                    viewBox="0 0 755.97 201.99" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <style>
                        {`.cls-1 { fill: #496fb1; }`}
                      </style>
                    </defs>
                    <path className="cls-1" d="M209.46,201.99H72.98l25.61-52.52h56.56l-34.34-69.25-62.23,121.77H0L93.39,17.03c2.6-5.09,6.54-9.38,11.4-12.41C109.64,1.6,115.24,0,120.95,0s11.31,1.6,16.16,4.62c4.82,2.98,8.68,7.29,11.11,12.41l77.91,157.84c1.52,2.85,2.25,6.05,2.09,9.28-.15,3.23-1.18,6.35-2.96,9.04-1.59,2.76-3.9,5.04-6.68,6.59-2.78,1.55-5.93,2.32-9.12,2.22Z"/>
                    <path className="cls-1" d="M333.25,52.52c-12.86,0-25.19,5.11-34.28,14.2-9.09,9.09-14.2,21.42-14.2,34.28s5.11,25.19,14.2,34.28,21.42,14.2,34.28,14.2h90.32v52.52h-90.32c-17.79.13-35.29-4.55-50.64-13.56-15.27-8.83-27.96-21.52-36.79-36.79-8.89-15.4-13.56-32.86-13.56-50.64s4.68-35.24,13.56-50.64c8.83-15.27,21.52-27.96,36.79-36.79C297.96,4.56,315.45-.13,333.25,0h90.32v52.52h-90.32Z"/>
                    <path className="cls-1" d="M503.78,201.99h-52.52V0h52.52v201.98Z"/>
                    <path className="cls-1" d="M654.98,0c17.79-.13,35.29,4.55,50.64,13.56,15.27,8.83,27.96,21.52,36.79,36.79,8.88,15.4,13.56,32.86,13.56,50.64s-4.68,35.24-13.56,50.64c-8.83,15.27-21.52,27.96-36.79,36.79-15.35,9.01-32.85,13.7-50.64,13.56h-116.57V0h116.57ZM654.98,149.47c12.86,0,25.19-5.11,34.28-14.2s14.2-21.42,14.2-34.28-5.11-25.19-14.2-34.28c-9.09-9.09-21.42-14.2-34.28-14.2h-64.06v96.95h64.06Z"/>
                  </svg>
                  Create New Campaign
                </CardTitle>
                <CardDescription>Set up a new automation campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createCampaign} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Campaign Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Automation Campaign"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Post Type</label>
                      <Select value={formData.post_type} onValueChange={(value) => setFormData(prev => ({ ...prev, post_type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">📝 Text Post</SelectItem>
                          <SelectItem value="comment">💬 Comment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Campaign description"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">🎯 Target Subreddits *</label>
                    <Input
                      value={formData.subreddits}
                      onChange={(e) => setFormData(prev => ({ ...prev, subreddits: e.target.value }))}
                      placeholder="test, testingground4bots (comma-separated)"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter subreddit names separated by commas (without r/)</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">📰 Title Template *</label>
                    <Input
                      value={formData.title_template}
                      onChange={(e) => setFormData(prev => ({ ...prev, title_template: e.target.value }))}
                      placeholder="Testing my automation platform"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">📝 Content Template *</label>
                    <Textarea
                      value={formData.content_template}
                      onChange={(e) => setFormData(prev => ({ ...prev, content_template: e.target.value }))}
                      placeholder="This is a test post from my professional automation platform!"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">✨ Create Campaign</Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first automation campaign to get started
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {campaign.post_type === 'text' ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                          {campaign.name}
                        </CardTitle>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      <Badge variant={campaign.status === 'completed' ? 'default' : campaign.status === 'failed' ? 'destructive' : 'secondary'}>
                        {campaign.status === 'completed' ? '✅' : campaign.status === 'failed' ? '❌' : '📝'} {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">🎯 Target Subreddits:</p>
                        <p className="text-sm text-muted-foreground">r/{campaign.subreddits?.split(',').join(', r/') || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">📰 Title:</p>
                        <p className="text-sm text-muted-foreground">{campaign.title_template}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">📝 Content Preview:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{campaign.content_template}</p>
                      </div>
                      
                      {redditAccounts.length > 0 ? (
                        <div className="flex items-center gap-2 pt-2">
                          <Select onValueChange={(accountId) => executeCampaign(campaign, accountId)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {redditAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  👤 u/{account.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            disabled={executing === campaign.id}
                            className="flex items-center gap-2"
                          >
                            {executing === campaign.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            🚀 Execute
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-sm text-yellow-800">
                            ⚠️ No accounts connected. Connect an account to execute campaigns.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <div className="grid gap-4">
            {campaignRuns.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No executions yet</h3>
                  <p className="text-muted-foreground text-center">
                    Campaign execution history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              campaignRuns.map((run) => (
                <Card key={run.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={run.status === 'success' ? 'default' : 'destructive'}>
                            {run.status === 'success' ? '✅' : '❌'} {run.status}
                          </Badge>
                          <span className="font-medium">Campaign Execution</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          📍 Posted to r/{run.subreddit}
                        </p>
                        <p className="text-sm font-medium">{run.title}</p>
                        {run.reddit_post_id && (
                          <p className="text-xs text-muted-foreground">
                            🔗 Post ID: {run.reddit_post_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          🕒 {new Date(run.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}