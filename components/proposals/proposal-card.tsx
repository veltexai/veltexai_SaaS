'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Eye, Edit, Download, Trash2, Loader2, Send } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [error, setError] = useState('');
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(
    null
  );

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
      <Card className="hover:shadow-md transition-shadow">
        {templatePreviewUrl ? (
          <div className="relative w-full aspect-video overflow-hidden rounded-t-md bg-gray-100">
            <Image
              src={templatePreviewUrl}
              alt={proposal.title}
              fill
              className="object-contain"
              unoptimized
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        ) : (
          <div className="w-full aspect-video rounded-t-md bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
            No preview available
          </div>
        )}
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-xl">{proposal.title}</CardTitle>
              <CardDescription className="mt-1">
                Client: {proposal.client_name}
                {proposal.client_email && ` (${proposal.client_email})`}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  statusColors[proposal.status]
                }`}
              >
                {statusLabels[proposal.status]}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-start flex-col gap-2.5">
            <div className="flex items-center space-x-2">
              {/* Status Update Buttons */}
              {proposal.status === 'draft' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSendModal(true)}
                  disabled={updatingStatus}
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
                    onClick={() => setShowSendModal(true)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Again
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus('accepted')}
                    disabled={updatingStatus}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Mark Accepted
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus('rejected')}
                    disabled={updatingStatus}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Mark Rejected
                  </Button>
                </>
              )}

              {/* Action Buttons */}
              {/* <Link href={`/dashboard/proposals/${proposal.id}`}>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link> */}
              <Link href={`/dashboard/proposals/${proposal.id}`}>
                <Button size="sm" variant="outline">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
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
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={deleteProposal}
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
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              {/* <div>
                <span className="font-medium">Value:</span>{' '}
                {formatCurrency(proposal.value)}
              </div> */}
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
