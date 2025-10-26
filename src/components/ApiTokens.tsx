import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ApiToken {
  id: string;
  token_name: string;
  token_hash: string;
  permissions: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export const ApiTokens: React.FC = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set());
  const [newToken, setNewToken] = useState<string>('');
  const [formData, setFormData] = useState({
    token_name: '',
    permissions: [] as string[],
    expires_days: '30',
  });
  const { user } = useAuth();

  const availablePermissions = [
    'comment',
    'reply', 
    'vote',
    'search',
    'test_channel'
  ];

  useEffect(() => {
    if (user) {
      fetchTokens();
    }
  }, [user]);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('api_tokens_2025_10_24_09_00')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch API tokens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const hashToken = async (token: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.token_name || formData.permissions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide a token name and select at least one permission',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = generateToken();
      const tokenHash = await hashToken(token);
      
      const expiresAt = formData.expires_days 
        ? new Date(Date.now() + parseInt(formData.expires_days) * 24 * 60 * 60 * 1000)
        : null;

      const { error } = await supabase
        .from('api_tokens_2025_10_24_09_00')
        .insert({
          token_name: formData.token_name,
          token_hash: tokenHash,
          permissions: formData.permissions,
          expires_at: expiresAt?.toISOString(),
          user_id: user?.id,
        });

      if (error) throw error;

      setNewToken(token);
      toast({
        title: 'Success',
        description: 'API token created successfully',
      });
      
      setFormData({ token_name: '', permissions: [], expires_days: '30' });
      fetchTokens();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('api_tokens_2025_10_24_09_00')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'API token deleted successfully',
      });
      
      fetchTokens();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete API token',
        variant: 'destructive',
      });
    }
  };

  const toggleTokenVisibility = (tokenId: string) => {
    setShowTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        newSet.add(tokenId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Token copied to clipboard',
    });
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Tokens</h2>
          <p className="text-gray-600">Manage API tokens for secure access from your portal</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create Token</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>
                Create a new API token for your portal to access the Reddit automation API
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateToken} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token_name">Token Name</Label>
                <Input
                  id="token_name"
                  placeholder="My Portal Token"
                  value={formData.token_name}
                  onChange={(e) => setFormData({ ...formData, token_name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availablePermissions.map((permission) => (
                    <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_days">Expires in (days)</Label>
                <Input
                  id="expires_days"
                  type="number"
                  placeholder="30"
                  value={formData.expires_days}
                  onChange={(e) => setFormData({ ...formData, expires_days: e.target.value })}
                />
                <p className="text-xs text-gray-500">Leave empty for no expiration</p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Token</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {newToken && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">New API Token Created</CardTitle>
            <CardDescription className="text-green-700">
              Copy this token now - you won't be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Textarea
                value={newToken}
                readOnly
                className="font-mono text-sm bg-white"
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => copyToClipboard(newToken)}
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewToken('')}
              className="mt-2"
            >
              I've copied the token
            </Button>
          </CardContent>
        </Card>
      )}

      {tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No API tokens</h3>
              <p className="text-gray-600 mb-4">Create your first API token to enable portal access</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Token
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Your API tokens for secure portal access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">{token.token_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {token.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.is_active ? 'default' : 'secondary'}>
                        {token.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {token.last_used_at 
                        ? new Date(token.last_used_at).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {token.expires_at 
                        ? new Date(token.expires_at).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleTokenVisibility(token.id)}
                        >
                          {showTokens.has(token.id) ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteToken(token.id)}
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

      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            How to use your API tokens with your portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Base URL</h4>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              https://fsgflmlmpoodpvxavfvc.supabase.co/functions/v1/reddit_api_2025_10_24_09_00
            </code>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-gray-600 mb-2">Include your API token in the request headers:</p>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm block">
              X-API-Token: your_api_token_here
            </code>
          </div>

          <div>
            <h4 className="font-medium mb-2">Example Request</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`POST /functions/v1/reddit_api_2025_10_24_09_00
Headers:
  X-API-Token: your_api_token_here
  Content-Type: application/json

Body:
{
  "action": "comment",
  "subreddit": "gaming",
  "target_id": "t3_abc123",
  "text": "Great post!"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};