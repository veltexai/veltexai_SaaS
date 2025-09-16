import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LogsFilters from '@/components/admin/logs-filters';
import LogsTable from '@/components/admin/logs-table';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
}

interface Admin {
  id: string;
  email: string;
  full_name: string;
}

const actionTypes = [
  'user_created',
  'user_updated',
  'user_deleted',
  'user_status_changed',
  'proposal_created',
  'proposal_updated',
  'proposal_deleted',
  'proposal_status_changed',
  'pricing_settings_updated',
  'prompt_template_created',
  'prompt_template_updated',
  'prompt_template_deleted',
  'prompt_template_status_toggled',
  'prompt_template_duplicated',
  'default_templates_created',
  'system_settings_updated',
  'system_settings_reset',
  'admin_login',
  'admin_logout',
  'bulk_action_performed',
];

async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return user;
}

async function fetchAdmins(): Promise<Admin[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'admin');

  if (error) {
    console.error('Error fetching admins:', error);
    return [];
  }

  return data || [];
}

async function fetchInitialLogs(): Promise<{
  logs: AuditLog[];
  total: number;
}> {
  const supabase = createServiceClient();

  const { data, error, count } = await supabase
    .from('admin_audit_log')
    .select(
      `
      *,
      profiles!admin_id (
        email,
        full_name
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(0, 49); // First 50 logs

  if (error) {
    console.error('Error fetching logs:', error);
    return { logs: [], total: 0 };
  }

  const formattedLogs = (data || []).map((log) => ({
    ...log,
    admin_email: log.profiles?.email,
    admin_name: log.profiles?.full_name,
  }));

  return { logs: formattedLogs, total: count || 0 };
}

export default async function AuditLogsPage() {
  const currentUser = await checkAdminAccess();
  const admins = await fetchAdmins();
  const { logs: initialLogs, total } = await fetchInitialLogs();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Monitor admin actions and system events
          </p>
        </div>
      </div>

      <LogsFilters admins={admins} actionTypes={actionTypes} />

      <LogsTable
        initialLogs={initialLogs}
        initialTotal={total}
        currentUserId={currentUser.id}
        admins={admins}
        actionTypes={actionTypes}
      />
    </div>
  );
}
