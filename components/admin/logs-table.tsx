'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  User,
  Activity,
  CheckCircle,
  XCircle,
  Info,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import LogDetailsDialog from './log-details-dialog';

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

interface LogFilters {
  search: string;
  action: string;
  admin: string;
  dateFrom: string;
  dateTo: string;
}

interface LogsTableProps {
  initialLogs: AuditLog[];
  initialTotal: number;
  currentUserId: string;
  admins: Admin[];
  actionTypes: string[];
}

const getActionIcon = (action: string) => {
  if (action.includes('created'))
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (action.includes('updated'))
    return <Info className="h-4 w-4 text-blue-500" />;
  if (action.includes('deleted'))
    return <XCircle className="h-4 w-4 text-red-500" />;
  if (action.includes('login') || action.includes('logout'))
    return <User className="h-4 w-4 text-purple-500" />;
  return <Activity className="h-4 w-4 text-gray-500" />;
};

const getActionColor = (action: string) => {
  if (action.includes('created')) return 'bg-green-100 text-green-800';
  if (action.includes('updated')) return 'bg-blue-100 text-blue-800';
  if (action.includes('deleted')) return 'bg-red-100 text-red-800';
  if (action.includes('login') || action.includes('logout'))
    return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
};

const formatActionName = (action: string) => {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function LogsTable({
  initialLogs,
  initialTotal,
  currentUserId,
  admins,
  actionTypes,
}: LogsTableProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    action: 'all',
    admin: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: initialTotal,
  });

  const supabase = createClient();

  const fetchLogs = async (newFilters?: LogFilters, page = 1) => {
    try {
      setLoading(true);
      const activeFilters = newFilters || filters;

      let query = supabase
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
        .range((page - 1) * pagination.limit, page * pagination.limit - 1);

      // Apply filters
      if (activeFilters.search) {
        query = query.or(
          `action.ilike.%${activeFilters.search}%,details.ilike.%${activeFilters.search}%`
        );
      }

      if (activeFilters.action !== 'all') {
        query = query.eq('action', activeFilters.action);
      }

      if (activeFilters.admin !== 'all') {
        query = query.eq('admin_id', activeFilters.admin);
      }

      if (activeFilters.dateFrom) {
        query = query.gte('created_at', activeFilters.dateFrom);
      }

      if (activeFilters.dateTo) {
        query = query.lte('created_at', activeFilters.dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedLogs = (data || []).map((log) => ({
        ...log,
        admin_email: log.profiles?.email,
        admin_name: log.profiles?.full_name,
      }));

      setLogs(formattedLogs);
      setPagination((prev) => ({ ...prev, total: count || 0, page }));
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: LogFilters) => {
    setFilters(newFilters);
    fetchLogs(newFilters, 1);
  };

  const handleRefresh = () => {
    fetchLogs(filters, pagination.page);
  };

  const handleExport = async () => {
    try {
      const csvContent = [
        [
          'Timestamp',
          'Admin',
          'Action',
          'Target ID',
          'Details',
          'IP Address',
        ].join(','),
        ...logs.map((log) =>
          [
            new Date(log.created_at).toISOString(),
            log.admin_email || 'Unknown',
            log.action,
            log.target_id || '',
            JSON.stringify(log.details || {}),
            log.ip_address || '',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({pagination.total} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {log.admin_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.admin_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge className={getActionColor(log.action)}>
                          {formatActionName(log.action)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.target_id ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {log.target_id.slice(0, 8)}...
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.ip_address ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {log.ip_address}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No audit logs found matching your filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(filters, pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(filters, pagination.page + 1)}
                  disabled={pagination.page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <LogDetailsDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </>
  );
}