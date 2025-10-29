'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  MapPin,
  Building,
  Calendar,
  Users,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ProposalData {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_company: string;
  service_location: string;
  service_type: string;
  service_frequency: string;
  facility_size: number;
  generated_content: string;
  pricing_enabled: boolean;
  pricing_data: any;
  status: string;
  created_at: string;
  company_profiles: {
    company_name: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface TrackingData {
  id: string;
  tracking_id: string;
  proposal_id: string;
  recipient_email: string;
  delivery_method: string;
  track_opens: boolean;
  track_downloads: boolean;
  view_count: number;
  download_count: number;
}

interface PublicProposalViewProps {
  proposal: ProposalData;
  tracking: TrackingData;
}

export function PublicProposalView({ proposal, tracking }: PublicProposalViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const primaryColor = proposal.company_profiles.primary_color || '#3b82f6';
  const companyName = proposal.company_profiles.company_name;
  const logoUrl = proposal.company_profiles.logo_url;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(`/api/proposals/${proposal.id}/download?tracking=${tracking.tracking_id}`);
      
      if (!response.ok) {
        throw new Error('Failed to download proposal');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadError('Failed to download proposal. Please try again.');
    } finally {
      setIsDownloading(false);
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center" style={{ borderTopColor: primaryColor }}>
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt={companyName}
                className="h-16 object-contain"
              />
            </div>
          )}
          <CardTitle className="text-3xl font-bold" style={{ color: primaryColor }}>
            {proposal.title}
          </CardTitle>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-lg text-muted-foreground">{companyName}</span>
            {getStatusBadge(proposal.status)}
          </div>
        </CardHeader>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{proposal.client_company}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{proposal.client_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{proposal.client_email}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{proposal.service_location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created {formatDate(proposal.created_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>
              {proposal.service_type}
            </div>
            <div className="text-sm text-muted-foreground">Service Type</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>
              {proposal.facility_size.toLocaleString()} sq ft
            </div>
            <div className="text-sm text-muted-foreground">Facility Size</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>
              {proposal.service_frequency}
            </div>
            <div className="text-sm text-muted-foreground">Frequency</div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Content */}
      {proposal.generated_content && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Proposal Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: proposal.generated_content }}
            />
          </CardContent>
        </Card>
      )}

      {/* Pricing Information */}
      {proposal.pricing_enabled && proposal.pricing_data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-6 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(proposal.pricing_data, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Section */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Download Proposal</h3>
            <p className="text-muted-foreground">
              Get a PDF copy of this proposal for your records
            </p>
            {downloadError && (
              <div className="text-red-600 text-sm">{downloadError}</div>
            )}
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              size="lg"
              className="w-full md:w-auto"
              style={{ backgroundColor: primaryColor }}
            >
              {isDownloading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Download...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-6">
        <Separator className="mb-4" />
        <p>This proposal was generated using Veltex AI</p>
        <p className="mt-1">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
      </div>
    </div>
  );
}