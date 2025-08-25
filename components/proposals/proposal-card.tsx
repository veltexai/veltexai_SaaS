'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Eye, Edit, Trash2, Loader2, Download } from 'lucide-react';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  value: number;
  created_at: string;
  updated_at: string;
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
  rejected: 'bg-red-100 text-red-800'
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected'
};

export function ProposalCard({ proposal, onUpdate, onDelete }: ProposalCardProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const exportToPDF = async () => {
    setExportingId(proposal.id);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          template: 'modern',
          includeCompanyInfo: true 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_proposal.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
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
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[proposal.status]}`}>
              {statusLabels[proposal.status]}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">Value:</span> {formatCurrency(proposal.value)}
            </div>
            <div>
              <span className="font-medium">Created:</span> {formatDate(proposal.created_at)}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {formatDate(proposal.updated_at)}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status Update Buttons */}
            {proposal.status === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus('sent')}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Mark as Sent'
                )}
              </Button>
            )}
            {proposal.status === 'sent' && (
              <>
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
            <Link href={`/dashboard/proposals/${proposal.id}`}>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/proposals/${proposal.id}/edit`}>
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={exportToPDF}
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
        </div>
      </CardContent>
    </Card>
  );
}