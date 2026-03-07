'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  UserCheck,
  UserX,
  Mail,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import UserFilters from './user-filters';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  role: string;
}

interface UserSubscription {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string;
}

interface UserStats {
  totalProposals: number;
  totalRevenue: number;
  lastActivity: string | null;
}

interface UsersTableProps {
  users: User[];
  subscriptions: UserSubscription[];
  userStats: Record<string, UserStats>;
  currentUserId: string;
}

export default function UsersTable({
  users: initialUsers,
  subscriptions,
  userStats,
  currentUserId,
}: UsersTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const supabase = createClient();

  const toggleAdminStatus = async (userId: string, currentStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: currentStatus === 'admin' ? 'user' : 'admin' })
        .eq('id', userId);

      if (error) throw error;

      setUsers(
        users.map((user) =>
          user.id === userId
            ? { ...user, role: currentStatus === 'admin' ? 'user' : 'admin' }
            : user
        )
      );

      toast.success(
        `User ${currentStatus === 'admin' ? 'revoked' : 'granted'} admin access`
      );
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      toast.success('Password reset email sent');
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const getUserSubscription = (userId: string) => {
    return subscriptions.find((sub) => sub.user_id === userId);
  };

  const getStatusBadge = (user: User) => {
    if (!user.email_confirmed_at) {
      return <Badge variant="outline">Unverified</Badge>;
    }
    if (user.last_sign_in_at) {
      const lastSignIn = new Date(user.last_sign_in_at);
      const daysSinceLastSignIn = Math.floor(
        (Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastSignIn <= 7) {
        return <Badge variant="default">Active</Badge>;
      }
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  const getPlanBadge = (userId: string) => {
    const subscription = getUserSubscription(userId);
    if (!subscription) {
      return <Badge variant="outline">Free</Badge>;
    }

    const planColors: Record<string, string> = {
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-green-100 text-green-800',
    };

    return (
      <Badge
        className={planColors[subscription.plan] || 'bg-gray-100 text-gray-800'}
      >
        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
      </Badge>
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' &&
          user.last_sign_in_at &&
          Math.floor(
            (Date.now() - new Date(user.last_sign_in_at).getTime()) /
              (1000 * 60 * 60 * 24)
          ) <= 7) ||
        (statusFilter === 'inactive' &&
          (!user.last_sign_in_at ||
            Math.floor(
              (Date.now() - new Date(user.last_sign_in_at).getTime()) /
                (1000 * 60 * 60 * 24)
            ) > 7)) ||
        (statusFilter === 'unverified' && !user.email_confirmed_at);

      const userSubscription = getUserSubscription(user.id);
      const matchesPlan =
        planFilter === 'all' ||
        (planFilter === 'free' && !userSubscription) ||
        (userSubscription && userSubscription.plan === planFilter);

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [users, searchTerm, statusFilter, planFilter, subscriptions]);

  const handleFiltersChange = (filters: {
    searchTerm: string;
    statusFilter: string;
    planFilter: string;
  }) => {
    setSearchTerm(filters.searchTerm);
    setStatusFilter(filters.statusFilter);
    setPlanFilter(filters.planFilter);
  };

  return (
    <>
      <UserFilters onFiltersChange={handleFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Proposals</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const stats = userStats[user.id] || {
                    totalProposals: 0,
                    totalRevenue: 0,
                    lastActivity: null,
                  };
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                          {user.role === 'admin' && (
                            <Badge
                              variant="destructive"
                              className="text-xs mt-1"
                            >
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell>{getPlanBadge(user.id)}</TableCell>
                      <TableCell>{stats.totalProposals}</TableCell>
                      <TableCell>
                        ${stats.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {stats.lastActivity
                          ? new Date(stats.lastActivity).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => sendPasswordReset(user.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Send Password Reset
                            </DropdownMenuItem>
                            {user.id !== currentUserId && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleAdminStatus(user.id, user.role)
                                }
                              >
                                {user.role === 'admin' ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Revoke Admin
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Grant Admin
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No users found matching your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}