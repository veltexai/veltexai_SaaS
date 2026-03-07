'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminUsers } from './admin-users';
import { AdminProposals } from './admin-proposals';

interface User {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  created_at: string;
  role: string;
}

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  total_value: number;
  status: string;
  created_at: string;
  user_email: string;
}

interface AdminTabsProps {
  users: User[];
  proposals: Proposal[];
  onUserUpdate: () => void;
}

export function AdminTabs({ users, proposals, onUserUpdate }: AdminTabsProps) {
  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">Recent Users</TabsTrigger>
        <TabsTrigger value="proposals">Recent Proposals</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        <AdminUsers users={users} onUserUpdate={onUserUpdate} />
      </TabsContent>

      <TabsContent value="proposals" className="space-y-4">
        <AdminProposals proposals={proposals} />
      </TabsContent>
    </Tabs>
  );
}