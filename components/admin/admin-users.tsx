'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Mail,
  Building,
  Crown,
  Shield,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  created_at: string;
  role: string;
}

interface AdminUsersProps {
  users: User[];
  onUserUpdate: () => void;
}

export function AdminUsers({ users, onUserUpdate }: AdminUsersProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setUpdating(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      onUserUpdate();
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setUpdating(null);
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
        return 'destructive' as const;
      case 'moderator':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
        <CardDescription>Latest registered users and their roles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
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
                  <p className="font-medium">{user.full_name || 'No name'}</p>
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
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updating === user.id}
                    onClick={() =>
                      updateUserRole(
                        user.id,
                        user.role === 'moderator' ? 'user' : 'moderator'
                      )
                    }
                  >
                    {updating === user.id
                      ? 'Updating...'
                      : user.role === 'moderator'
                      ? 'Remove Mod'
                      : 'Make Mod'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}