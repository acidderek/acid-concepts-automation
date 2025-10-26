import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SubredditChannel {
  id: string;
  channel_name: string;
  subreddit_name: string;
  is_active: boolean;
  last_tested_at?: string;
  test_status?: string;
  reddit_accounts_2025_10_24_09_00: {
    account_name: string;
    username?: string;
  };
}

interface RedditAccount {
  id: string;
  account_name: string;
  username?: string;
  is_active: boolean;
}

export const SubredditChannels: React.FC = () => {
  const [channels, setChannels] = useState<SubredditChannel[]>([]);
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingChannels, setTestingChannels] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    channel_name: '',
    subreddit_name: '',
    reddit_account_id: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchChannels();
      fetchAccounts();
    }
  }, [user]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('subreddit_channels_2025_10_24_09_00')
        .select(`
          *,
          reddit_accounts_2025_10_24_09_00 (
            account_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch channels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts_2025_10_24_09_00')
        .select('id, account_name, username, is_active')
        .eq('is_active', true);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.channel_name || !formData.subreddit_name || !formData.reddit_account_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('subreddit_channels_2025_10_24_09_00')
        .insert({
          channel_name: formData.channel_name,
          subreddit_name: formData.subreddit_name.replace('r/', ''),
          reddit_account_id: formData.reddit_account_id,
          user_id: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Channel added successfully',
      });
      
      setDialogOpen(false);
      setFormData({ channel_name: '', subreddit_name: '', reddit_account_id: '' });
      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('subreddit_channels_2025_10_24_09_00')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Channel deleted successfully',
      });
      
      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete channel',
        variant: 'destructive',
      });
    }
  };

  const handleTestChannel = async (channelId: string) => {
    setTestingChannels(prev => new Set(prev).add(channelId));
    
    try {
      const { data, error } = await supabase.functions.invoke('reddit_api_2025_10_24_09_00', {
        body: {
          action: 'test_channel',
          channel_id: channelId
        }
      });

      if (error) throw error;

      toast({
        title: data.success ? 'Success' : 'Test Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
      
      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to test channel',
        variant: 'destructive',
      });
    } finally {
      setTestingChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
  };

  const toggleChannelStatus = async (channelId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subreddit_channels_2025_10_24_09_00')
        .update({ is_active: !currentStatus })
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Channel ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
      
      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update channel status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subreddit Channels</h2>
          <p className="text-gray-600">Configure subreddit channels for your automation workflows</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2" disabled={accounts.length === 0}>
              <Plus className="w-4 h-4" />
              <span>Add Channel</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subreddit Channel</DialogTitle>
              <DialogDescription>
                Create a new channel to connect a subreddit with your Reddit account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel_name">Channel Name</Label>
                <Input
                  id="channel_name"
                  placeholder="My Gaming Channel"
                  value={formData.channel_name}
                  onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subreddit_name">Subreddit Name</Label>
                <Input
                  id="subreddit_name"
                  placeholder="gaming (without r/)"
                  value={formData.subreddit_name}
                  onChange={(e) => setFormData({ ...formData, subreddit_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reddit_account">Reddit Account</Label>
                <Select
                  value={formData.reddit_account_id}
                  onValueChange={(value) => setFormData({ ...formData, reddit_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Reddit account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} ({account.username || 'Not connected'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Channel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reddit accounts</h3>
              <p className="text-gray-600 mb-4">You need to add a Reddit account before creating channels</p>
            </div>
          </CardContent>
        </Card>
      )}

      {channels.length === 0 && accounts.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No channels configured</h3>
              <p className="text-gray-600 mb-4">Add your first subreddit channel to get started</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : channels.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Configured Channels</CardTitle>
            <CardDescription>
              Your subreddit channels and their connection status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Subreddit</TableHead>
                  <TableHead>Reddit Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Test</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.channel_name}</TableCell>
                    <TableCell>r/{channel.subreddit_name}</TableCell>
                    <TableCell>
                      {channel.reddit_accounts_2025_10_24_09_00.account_name}
                      {channel.reddit_accounts_2025_10_24_09_00.username && (
                        <span className="text-gray-500 text-sm">
                          {' '}({channel.reddit_accounts_2025_10_24_09_00.username})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                          {channel.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {channel.test_status && (
                          <div className="flex items-center">
                            {channel.test_status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {channel.last_tested_at 
                        ? new Date(channel.last_tested_at).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestChannel(channel.id)}
                          disabled={testingChannels.has(channel.id)}
                        >
                          <TestTube className="w-3 h-3" />
                          {testingChannels.has(channel.id) ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleChannelStatus(channel.id, channel.is_active)}
                        >
                          {channel.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteChannel(channel.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};