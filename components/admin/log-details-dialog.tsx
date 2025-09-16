'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Info,
  User,
  Activity,
} from 'lucide-react';

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

interface LogDetailsDialogProps {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const renderLogDetails = (log: AuditLog) => {
  if (!log.details) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Details</h4>
      <pre className="bg-muted p-3 rounded text-sm overflow-auto max-h-40">
        {JSON.stringify(log.details, null, 2)}
      </pre>
    </div>
  );
};

export default function LogDetailsDialog({
  log,
  open,
  onOpenChange,
}: LogDetailsDialogProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon(log.action)}
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about this audit log entry
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Timestamp</Label>
              <p className="text-sm">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Admin</Label>
              <p className="text-sm">{log.admin_name || log.admin_email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Action</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getActionColor(log.action)}>
                  {formatActionName(log.action)}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Target ID</Label>
              <p className="text-sm font-mono">
                {log.target_id || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">IP Address</Label>
              <p className="text-sm font-mono">
                {log.ip_address || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">User Agent</Label>
              <p
                className="text-sm truncate"
                title={log.user_agent}
              >
                {log.user_agent || 'N/A'}
              </p>
            </div>
          </div>
          {renderLogDetails(log)}
        </div>
      </DialogContent>
    </Dialog>
  );
}