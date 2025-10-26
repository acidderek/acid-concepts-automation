import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Users, Settings, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalAccounts: number;
  activeChannels: number;
  totalApiCalls: number;
  recentLogs: any[];
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    activeChannels: 0,
    totalApiCalls: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch accounts count
      const { count: accountsCount } = await supabase
        .from('reddit_accounts_2025_10_24_09_00')
        .select('*', { count: 'exact', head: true });

      // Fetch active channels count
      const { count: channelsCount } = await supabase
        .from('subreddit_channels_2025_10_24_09_00')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch total API calls count
      const { count: apiCallsCount } = await supabase
        .from('api_logs_2025_10_24_09_00')
        .select('*', { count: 'exact', head: true });

      // Fetch recent logs
      const { data: recentLogs } = await supabase
        .from('api_logs_2025_10_24_09_00')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalAccounts: accountsCount || 0,
        activeChannels: channelsCount || 0,
        totalApiCalls: apiCallsCount || 0,
        recentLogs: recentLogs || []
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Overview of your Reddit automation system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reddit Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Connected accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChannels}</div>
            <p className="text-xs text-muted-foreground">
              Configured subreddits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApiCalls}</div>
            <p className="text-xs text-muted-foreground">
              All time requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest API calls and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Subreddit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium capitalize">
                      {log.action_type}
                    </TableCell>
                    <TableCell>
                      {log.subreddit ? `r/${log.subreddit}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup Guide</CardTitle>
          <CardDescription>
            Get started with your Reddit automation in 3 easy steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Add Reddit Account</h4>
                <p className="text-sm text-gray-600">
                  Connect your Reddit app credentials and complete OAuth authentication
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Configure Channels</h4>
                <p className="text-sm text-gray-600">
                  Set up subreddit channels and test their connectivity
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Create API Token</h4>
                <p className="text-sm text-gray-600">
                  Generate secure API tokens for your portal to access the automation system
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};