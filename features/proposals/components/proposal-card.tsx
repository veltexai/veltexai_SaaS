'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Edit, Download, Trash2, Loader2, Send } from 'lucide-react';
import { SendProposalModal } from '@/components/proposals/send-proposal-modal';
import { Alert, AlertDescription } from '../ui/alert';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  value: number;
  created_at: string;
  updated_at: string;
  template_id?: string | null;
}

interface ProposalCardProps {
  proposal: Proposal;
  onUpdate: (id: string, updates: Partial<Proposal>) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export function ProposalCard({
  proposal,
  onUpdate,
  onDelete,
}: ProposalCardProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [error, setError] = useState('');
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(
    null
  );

  const handleCardClick = () => {
    router.push(`/dashboard/proposals/${proposal.id}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const deleteProposal = async () => {
    if (!confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    setDeletingId(proposal.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposal.id);

      if (error) throw error;

      onDelete(proposal.id);
    } catch (error) {
      console.error('Error deleting proposal:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const updateStatus = async (status: Proposal['status']) => {
    setUpdatingStatus(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', proposal.id);

      if (error) throw error;

      onUpdate(proposal.id, { status });
    } catch (error) {
      console.error('Error updating proposal status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendSuccess = () => {
    setShowSendModal(false);
    onUpdate(proposal.id, { status: 'sent' });
  };

  useEffect(() => {
    let mounted = true;
    async function fetchTemplatePreview() {
      if (!proposal.template_id) {
        setTemplatePreviewUrl(null);
        return;
      }
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('proposal_templates')
          .select('preview_image_url')
          .eq('id', proposal.template_id)
          .single();
        if (error) return;
        if (!mounted) return;
        setTemplatePreviewUrl(data?.preview_image_url ?? null);
      } catch {}
    }
    fetchTemplatePreview();
    return () => {
      mounted = false;
    };
  }, [proposal.template_id]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        {templatePreviewUrl ? (
          <div className="relative w-full aspect-[16/10] sm:aspect-video overflow-hidden rounded-t-md bg-gray-100">
            <Image
              src={templatePreviewUrl}
              alt={proposal.title}
              fill
              className="object-contain"
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="w-full aspect-[16/10] sm:aspect-video rounded-t-md bg-gray-100 flex items-center justify-center text-gray-500 text-xs sm:text-sm">
            No preview available
          </div>
        )}
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl truncate">{proposal.title}</CardTitle>
              <CardDescription className="mt-1 text-sm truncate">
                Client: {proposal.client_name}
                <span className="hidden sm:inline">
                  {proposal.client_email && ` (${proposal.client_email})`}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  statusColors[proposal.status]
                }`}
              >
                {statusLabels[proposal.status]}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {/* Status Update Buttons - Stack on mobile */}
            {(proposal.status === 'draft' || proposal.status === 'sent') && (
              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {proposal.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSendModal(true);
                    }}
                    disabled={updatingStatus}
                    className="flex-1 sm:flex-none"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                )}
                {proposal.status === 'sent' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSendModal(true);
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      <span className="hidden xs:inline">Send Again</span>
                      <span className="xs:hidden">Resend</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus('accepted');
                      }}
                      disabled={updatingStatus}
                      className="text-green-600 border-green-600 hover:bg-green-50 flex-1 sm:flex-none"
                    >
                      <span className="hidden sm:inline">Mark </span>Accepted
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus('rejected');
                      }}
                      disabled={updatingStatus}
                      className="text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                    >
                      <span className="hidden sm:inline">Mark </span>Rejected
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons - Always visible */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Link 
                href={`/dashboard/proposals/${proposal.id}`} 
                className="flex-1 sm:flex-none"
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    setError('');
                    setExportingId(proposal.id);
                    const res = await fetch(
                      `/api/proposals/${proposal.id}/print`
                    );
                    if (!res.ok) throw new Error('Failed to generate PDF');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `proposal-${proposal.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e: any) {
                    setError(e?.message ?? 'Failed to generate PDF');
                    console.error(e);
                  } finally {
                    setExportingId(null);
                  }
                }}
                disabled={exportingId === proposal.id}
              >
                {exportingId === proposal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">PDF</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProposal();
                }}
                disabled={deletingId === proposal.id}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {deletingId === proposal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Date Info - Stack on mobile */}
            <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs sm:text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {formatDate(proposal.created_at)}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{' '}
                {formatDate(proposal.updated_at)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SendProposalModal
        proposal={proposal}
        open={showSendModal}
        onOpenChange={setShowSendModal}
        onSuccess={handleSendSuccess}
      />
    </>
  );
}
