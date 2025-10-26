import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface RedditAccount {
  id: string;
  account_name: string;
  client_id: string;
  username?: string;
  is_active: boolean;
  token_expires_at?: string;
  created_at: string;
}

export const RedditAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    client_id: '',
    client_secret: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts_2025_10_24_09_00')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch Reddit accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.client_id || !formData.client_secret) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate Reddit OAuth URL - use main page as callback
      const redirectUri = `${window.location.origin}/`;
      const state = Math.random().toString(36).substring(7);
      const scope = 'identity,read,submit,vote';
      
      const authUrl = `https://www.reddit.com/api/v1/authorize?` +
        `client_id=${formData.client_id}&` +
        `response_type=code&` +
        `state=${state}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `duration=permanent&` +
        `scope=${scope}`;

      // Store the form data temporarily for the OAuth callback
      sessionStorage.setItem('reddit_oauth_data', JSON.stringify({
        ...formData,
        state,
        redirect_uri: redirectUri
      }));

      // Open Reddit OAuth in new window
      window.open(authUrl, 'reddit_oauth', 'width=600,height=700');
      
      setDialogOpen(false);
      setFormData({ account_name: '', client_id: '', client_secret: '' });
      
      toast({
        title: 'OAuth Started',
        description: 'Please complete the Reddit authorization in the popup window',
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('reddit_accounts_2025_10_24_09_00')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reddit account deleted successfully',
      });
      
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete Reddit account',
        variant: 'destructive',
      });
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('reddit_auth_2025_10_24_09_00', {
        body: {
          action: 'refresh_token',
          account_id: accountId
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Token refreshed successfully',
      });
      
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to refresh token',
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
          <h2 className="text-2xl font-bold text-gray-900">Reddit Accounts</h2>
          <p className="text-gray-600">Manage your Reddit API credentials and OAuth connections</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Reddit Account</DialogTitle>
              <DialogDescription>
                Add your Reddit app credentials. You'll need to create a Reddit app at{' '}
                <a 
                  href="https://www.reddit.com/prefs/apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center"
                >
                  reddit.com/prefs/apps
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  placeholder="My Reddit Bot"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">Client ID</Label>
                <Input
                  id="client_id"
                  placeholder="Your Reddit app client ID"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_secret">Client Secret</Label>
                <Input
                  id="client_secret"
                  type="password"
                  placeholder="Your Reddit app client secret"
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Connect Account</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reddit accounts</h3>
              <p className="text-gray-600 mb-4">Add your first Reddit account to get started</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Your Reddit accounts and their connection status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Reddit Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Token Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>{account.username || 'Not connected'}</TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.token_expires_at 
                        ? new Date(account.token_expires_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshToken(account.id)}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAccount(account.id)}
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
      )}
    </div>
  );
};