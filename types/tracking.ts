import { ProposalView, ProposalStatusHistory } from './database';

export interface TrackingToken {
  token: string;
  proposal_id: string;
  expires_at?: string;
}

export interface ViewEvent {
  proposal_id: string;
  viewer_ip?: string;
  tracking_token?: string;
  user_agent?: string;
  view_duration?: number;
  page_url?: string;
  referrer?: string;
}

export interface TrackingStats {
  total_views: number;
  unique_viewers: number;
  last_viewed_at?: string | null;
  average_view_duration?: number;
  bounce_rate?: number;
  conversion_rate?: number;
}

export interface DetailedTrackingStats extends TrackingStats {
  view_history: ProposalView[];
  status_history: ProposalStatusHistory[];
  geographic_data?: GeographicView[];
  device_breakdown?: DeviceBreakdown;
  time_series_data?: TimeSeriesData[];
}

export interface GeographicView {
  country?: string;
  region?: string;
  city?: string;
  view_count: number;
  last_viewed: string;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface TimeSeriesData {
  date: string;
  views: number;
  unique_views: number;
  average_duration: number;
}

export interface TrackingConfiguration {
  enabled: boolean;
  track_ip: boolean;
  track_user_agent: boolean;
  track_duration: boolean;
  track_geographic: boolean;
  anonymize_data: boolean;
  retention_days: number;
}

export interface ProposalAnalytics {
  proposal_id: string;
  title: string;
  created_at: string;
  status: string;
  tracking_stats: TrackingStats;
  engagement_score: number;
  conversion_probability: number;
}

export interface AnalyticsDashboard {
  overview: {
    total_proposals: number;
    total_views: number;
    average_engagement: number;
    conversion_rate: number;
  };
  recent_activity: ProposalView[];
  top_performing: ProposalAnalytics[];
  trends: TimeSeriesData[];
}

export interface TrackingEvent {
  event_type: 'view' | 'download' | 'share' | 'status_change';
  proposal_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface EmailTrackingData {
  email_sent: boolean;
  email_opened?: boolean;
  email_clicked?: boolean;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  recipient_email?: string;
}

// Utility functions for tracking
export interface TrackingUtils {
  generateTrackingToken: () => string;
  parseUserAgent: (userAgent: string) => {
    browser: string;
    os: string;
    device: string;
  };
  calculateEngagementScore: (stats: TrackingStats) => number;
  estimateConversionProbability: (analytics: ProposalAnalytics) => number;
}

// Default tracking configuration
export const DEFAULT_TRACKING_CONFIG: TrackingConfiguration = {
  enabled: true,
  track_ip: true,
  track_user_agent: true,
  track_duration: true,
  track_geographic: false,
  anonymize_data: true,
  retention_days: 90,
};

// Event types for tracking
export const TRACKING_EVENTS = {
  PROPOSAL_VIEWED: 'proposal_viewed',
  PROPOSAL_DOWNLOADED: 'proposal_downloaded',
  PROPOSAL_SHARED: 'proposal_shared',
  STATUS_CHANGED: 'status_changed',
  EMAIL_SENT: 'email_sent',
  EMAIL_OPENED: 'email_opened',
  EMAIL_CLICKED: 'email_clicked',
} as const;

export type TrackingEventType = typeof TRACKING_EVENTS[keyof typeof TRACKING_EVENTS];