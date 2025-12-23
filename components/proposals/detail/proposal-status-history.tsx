'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineIcon,
  TimelineDescription,
  TimelineContent,
} from '@/components/ui/timeline';
import {
  FileText,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StatusHistoryItem {
  id: string;
  proposal_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  created_at: string;
  change_reason: string | null;
  email_sent: boolean;
  profiles: {
    full_name: string;
  } | null;
}

interface ProposalStatusHistoryProps {
  proposalId: string;
}

export function ProposalStatusHistory({
  proposalId,
}: ProposalStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/proposals/${proposalId}/status-history`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch status history');
      }

      const data = await response.json();
      console.log('🚀 ~ fetchHistory ~ data:', data);
      setHistory(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load status history'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [proposalId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'viewed':
        return <Eye className="h-4 w-4 text-green-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return (
          <Badge variant="outline" className="text-blue-600">
            Sent
          </Badge>
        );
      case 'viewed':
        return (
          <Badge variant="outline" className="text-green-600">
            Viewed
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-600">
            Accepted
          </Badge>
        );
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusDescription = (item: StatusHistoryItem) => {
    if (item.old_status && item.new_status) {
      return `Status changed from ${item.old_status} to ${item.new_status}`;
    } else if (item.new_status) {
      return `Proposal ${item.new_status}`;
    }
    return 'Status updated';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Status History</CardTitle>
            <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 sm:space-x-4 animate-pulse"
              >
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Status History</CardTitle>
            <Button onClick={fetchHistory} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Retry</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-center text-red-600 text-sm sm:text-base">
            <p className="break-words">Error loading status history: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Status History</CardTitle>
          <Button onClick={fetchHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 overflow-hidden">
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 sm:py-8">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
            <p className="text-sm sm:text-base">No status history found</p>
            <p className="text-xs sm:text-sm mt-1">Status changes will appear here</p>
          </div>
        ) : (
          <Timeline>
            {history.map((item, index) => (
              <TimelineItem key={item.id} className="items-start sm:items-center">
                <TimelineConnector />
                <TimelineHeader>
                  <TimelineIcon>{getStatusIcon(item.new_status)}</TimelineIcon>
                  <TimelineTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm sm:text-base">
                    <span className="break-words">{getStatusDescription(item)}</span>
                    <span className="flex-shrink-0">{getStatusBadge(item.new_status)}</span>
                  </TimelineTitle>
                </TimelineHeader>
                <TimelineContent>
                  <TimelineDescription>
                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {item.profiles?.full_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{item.profiles.full_name}</span>
                        </div>
                      )}
                    </div>
                    {item.change_reason && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs sm:text-sm break-words">
                        {item.change_reason}
                      </div>
                    )}
                  </TimelineDescription>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}
