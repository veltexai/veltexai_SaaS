'use client';

import { useState } from 'react';
import { AdminTabs } from './admin-tabs';
import { createClient } from '@/lib/supabase/server';

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

interface AdminClientWrapperProps {
  users: User[];
  proposals: Proposal[];
}

export function AdminClientWrapper({ users: initialUsers, proposals }: AdminClientWrapperProps) {
  const [users, setUsers] = useState(initialUsers);

  const handleUserUpdate = async () => {
    // Refresh users data
    window.location.reload();
  };

  return (
    <AdminTabs
      users={users}
      proposals={proposals}
      onUserUpdate={handleUserUpdate}
    />
  );
}