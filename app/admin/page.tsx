'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/use-auth';
import { supabase } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  Mail,
  Building,
  Crown,
  Shield,
  User,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Analytics {
  totalUsers: number;
  totalProposals: number;
  totalRevenue: number;
  activeSubscriptions: number;
  recentUsers: Array<{
    id: string;
    email: string;
    full_name: string;
    company_name: string;
    created_at: string;
    role: string;
  }>;
  recentProposals: Array<{
    id: string;
    title: string;
    client_name: string;
    total_value: number;
    status: string;
    created_at: string;
    user_email: string;
  }>;
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    if (profile?.role === 'admin') {
      fetchAnalytics();
    }
  }, [profile, loading, router]);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total proposals
      const { count: totalProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue from proposals
      const { data: revenueData } = await supabase
        .from('proposals')
        .select('total_value')
        .eq('status', 'accepted');

      const totalRevenue =
        revenueData?.reduce(
          (sum, proposal) => sum + (proposal.total_value || 0),
          0
        ) || 0;

      // Fetch active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('stripe_customer_id', 'is', null);

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name, company_name, created_at, role')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent proposals with user email
      const { data: recentProposals } = await supabase
        .from('proposals')
        .select(
          `
          id,
          title,
          client_name,
          total_value,
          status,
          created_at,
          profiles!inner(email)
        `
        )
        .order('created_at', { ascending: false })
        .limit(10);

      const formattedProposals =
        recentProposals?.map((proposal) => ({
          ...proposal,
          user_email: (proposal.profiles as any)?.email || 'Unknown',
        })) || [];

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalProposals: totalProposals || 0,
        totalRevenue,
        activeSubscriptions: activeSubscriptions || 0,
        recentUsers: recentUsers || [],
        recentProposals: formattedProposals,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Refresh analytics to show updated data
      fetchAnalytics();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'moderator':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // if (loading || loadingAnalytics) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[400px]">
  //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  //     </div>
  //   )
  // }

  console.log('🚀 ~ AdminDashboard ~ profile:', profile);
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage users and view analytics</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Proposals
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalProposals || 0}
            </div>
            <p className="text-xs text-muted-foreground">Created proposals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From accepted proposals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.activeSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Paying customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Recent Data */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Recent Users</TabsTrigger>
          <TabsTrigger value="proposals">Recent Proposals</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>
                Latest registered users and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.full_name || 'No name'}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{user.email}</span>
                        </div>
                        {user.company_name && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Building className="h-3 w-3" />
                            <span>{user.company_name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={getRoleBadgeVariant(user.role)}
                        className="flex items-center space-x-1"
                      >
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </Badge>
                      {user.role !== 'admin' && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateUserRole(
                                user.id,
                                user.role === 'moderator' ? 'user' : 'moderator'
                              )
                            }
                          >
                            {user.role === 'moderator'
                              ? 'Remove Mod'
                              : 'Make Mod'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Proposals</CardTitle>
              <CardDescription>
                Latest proposals created by users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.recentProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{proposal.title}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>Client: {proposal.client_name}</span>
                        <span>
                          Value: {formatCurrency(proposal.total_value)}
                        </span>
                        <span>By: {proposal.user_email}</span>
                        <span>
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={getStatusBadgeVariant(proposal.status)}
                      className="capitalize"
                    >
                      {proposal.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
