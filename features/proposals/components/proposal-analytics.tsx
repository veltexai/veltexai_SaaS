'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  Download,
  Mail,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProposalAnalyticsData {
  overview: {
    total_sent: number;
    total_views: number;
    total_downloads: number;
    average_view_time: number;
    open_rate: number;
    conversion_rate: number;
  };
  recent_activity: Array<{
    id: string;
    proposal_title: string;
    client_name: string;
    event_type: 'sent' | 'viewed' | 'downloaded' | 'accepted' | 'rejected';
    timestamp: string;
    tracking_id?: string;
  }>;
  top_proposals: Array<{
    id: string;
    title: string;
    client_name: string;
    status: string;
    view_count: number;
    download_count: number;
    last_viewed_at?: string;
    engagement_score: number;
  }>;
  tracking_details: Array<{
    id: string;
    proposal_title: string;
    recipient_email: string;
    delivery_method: string;
    sent_at: string;
    opened: boolean;
    opened_at?: string;
    viewed: boolean;
    viewed_at?: string;
    downloaded: boolean;
    downloaded_at?: string;
    view_count: number;
    download_count: number;
  }>;
}

interface ProposalAnalyticsProps {
  proposalId?: string; // If provided, show analytics for specific proposal
  className?: string;
}

export function ProposalAnalytics({ proposalId, className }: ProposalAnalyticsProps) {
  const [data, setData] = useState<ProposalAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = proposalId 
        ? `/api/proposals/${proposalId}/analytics`
        : '/api/proposals/analytics';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [proposalId]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'sent':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'viewed':
        return <Eye className="h-4 w-4 text-green-500" />;
      case 'downloaded':
        return <Download className="h-4 w-4 text-purple-500" />;
      case 'accepted':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="text-blue-600">Sent</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {proposalId ? 'Proposal Analytics' : 'Proposals Analytics'}
          </h2>
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {proposalId ? 'Proposal Analytics' : 'Proposals Analytics'}
          </h2>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading analytics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {proposalId ? 'Proposal Analytics' : 'Proposals Analytics'}
        </h2>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.total_sent}</div>
            <p className="text-xs text-muted-foreground">Proposals sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.total_views}</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.total_sent > 0 
                ? `${((data.overview.total_views / data.overview.total_sent) * 100).toFixed(1)}% view rate`
                : 'No proposals sent'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.total_downloads}</div>
            <p className="text-xs text-muted-foreground">PDF downloads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. View Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(data.overview.average_view_time)}
            </div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.overview.open_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Email opens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.overview.conversion_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Accepted proposals</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="performance">Top Performing</TabsTrigger>
          <TabsTrigger value="tracking">Tracking Details</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_activity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity found
                </p>
              ) : (
                <div className="space-y-4">
                  {data.recent_activity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      {getEventIcon(activity.event_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.proposal_title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.client_name} • {activity.event_type}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Last Viewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_proposals.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">
                        {proposal.title}
                      </TableCell>
                      <TableCell>{proposal.client_name}</TableCell>
                      <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1 text-muted-foreground" />
                          {proposal.view_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Download className="h-4 w-4 mr-1 text-muted-foreground" />
                          {proposal.download_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {Math.round(proposal.engagement_score)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {proposal.last_viewed_at ? (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDistanceToNow(new Date(proposal.last_viewed_at), { addSuffix: true })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Viewed</TableHead>
                    <TableHead>Downloaded</TableHead>
                    <TableHead>Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tracking_details.map((tracking) => (
                    <TableRow key={tracking.id}>
                      <TableCell className="font-medium">
                        {tracking.proposal_title}
                      </TableCell>
                      <TableCell>{tracking.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tracking.delivery_method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(tracking.sent_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {tracking.opened ? (
                          <div className="flex items-center text-green-600">
                            <Mail className="h-4 w-4 mr-1" />
                            {tracking.opened_at && formatDistanceToNow(new Date(tracking.opened_at), { addSuffix: true })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tracking.viewed ? (
                          <div className="flex items-center text-blue-600">
                            <Eye className="h-4 w-4 mr-1" />
                            {tracking.view_count}x
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tracking.downloaded ? (
                          <div className="flex items-center text-purple-600">
                            <Download className="h-4 w-4 mr-1" />
                            {tracking.download_count}x
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm">
                            {tracking.view_count + tracking.download_count}
                          </span>
                          <span className="text-xs text-muted-foreground">events</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}