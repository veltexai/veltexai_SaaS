'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreHorizontal,
  Trash2,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import ProposalFilters from './proposal-filters';

interface Proposal {
  id: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  total_amount: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_name: string;
  client_email: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface ProposalsTableProps {
  proposals: Proposal[];
  users: User[];
  currentUserId: string;
}

export default function ProposalsTable({
  proposals: initialProposals,
  users,
  currentUserId,
}: ProposalsTableProps) {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedProposals, setSelectedProposals] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.full_name || user?.email || 'Unknown User';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'outline' as const, color: 'text-gray-600' },
      sent: { variant: 'default' as const, color: 'text-blue-600' },
      accepted: { variant: 'default' as const, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, color: 'text-red-600' },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProposals(filteredProposals.map((p) => p.id));
    } else {
      setSelectedProposals([]);
    }
  };

  const handleSelectProposal = (proposalId: string, checked: boolean) => {
    if (checked) {
      setSelectedProposals([...selectedProposals, proposalId]);
    } else {
      setSelectedProposals(selectedProposals.filter((id) => id !== proposalId));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!action || selectedProposals.length === 0) return;

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('proposals')
          .delete()
          .in('id', selectedProposals);

        if (error) throw error;

        // Log admin action
        await supabase.from('admin_audit_log').insert({
          admin_id: currentUserId,
          action: 'proposals_bulk_deleted',
          details: {
            proposal_ids: selectedProposals,
            count: selectedProposals.length,
          },
        });

        setProposals(proposals.filter(p => !selectedProposals.includes(p.id)));
        toast.success(`Deleted ${selectedProposals.length} proposals`);
      } else if (
        ['draft', 'sent', 'accepted', 'rejected'].includes(action)
      ) {
        const { error } = await supabase
          .from('proposals')
          .update({ status: action })
          .in('id', selectedProposals);

        if (error) throw error;

        // Log admin action
        await supabase.from('admin_audit_log').insert({
          admin_id: currentUserId,
          action: 'proposals_bulk_status_updated',
          details: {
            proposal_ids: selectedProposals,
            new_status: action,
            count: selectedProposals.length,
          },
        });

        setProposals(proposals.map(p => 
          selectedProposals.includes(p.id) 
            ? { ...p, status: action as Proposal['status'] }
            : p
        ));
        toast.success(
          `Updated ${selectedProposals.length} proposals to ${action}`
        );
      }

      setSelectedProposals([]);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const deleteProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: currentUserId,
        action: 'proposal_deleted',
        target_id: proposalId,
      });

      setProposals(proposals.filter(p => p.id !== proposalId));
      toast.success('Proposal deleted successfully');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
    }
  };

  const updateProposalStatus = async (
    proposalId: string,
    newStatus: string
  ) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: newStatus })
        .eq('id', proposalId);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: currentUserId,
        action: 'proposal_status_updated',
        target_id: proposalId,
        details: { new_status: newStatus },
      });

      setProposals(proposals.map(p => 
        p.id === proposalId 
          ? { ...p, status: newStatus as Proposal['status'] }
          : p
      ));
      toast.success(`Proposal status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast.error('Failed to update proposal status');
    }
  };

  const getDateFilteredProposals = (proposals: Proposal[]) => {
    if (dateFilter === 'all') return proposals;

    const now = new Date();
    const filterDate = new Date();

    switch (dateFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      default:
        return proposals;
    }

    return proposals.filter((p) => new Date(p.created_at) >= filterDate);
  };

  const filteredProposals = useMemo(() => {
    return getDateFilteredProposals(
      proposals.filter((proposal) => {
        const matchesSearch =
          proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          proposal.client_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          proposal.client_email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getUserName(proposal.user_id)
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' || proposal.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
    );
  }, [proposals, searchTerm, statusFilter, dateFilter, users]);

  const handleFiltersChange = (filters: {
    searchTerm: string;
    statusFilter: string;
    dateFilter: string;
  }) => {
    setSearchTerm(filters.searchTerm);
    setStatusFilter(filters.statusFilter);
    setDateFilter(filters.dateFilter);
  };

  return (
    <>
      <ProposalFilters
        selectedProposals={selectedProposals}
        onFiltersChange={handleFiltersChange}
        onBulkAction={handleBulkAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Proposals ({filteredProposals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedProposals.length === filteredProposals.length &&
                        filteredProposals.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProposals.includes(proposal.id)}
                        onCheckedChange={(checked) =>
                          handleSelectProposal(proposal.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{proposal.title}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {proposal.id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {proposal.client_name || 'No name'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {proposal.client_email || 'No email'}
                      </div>
                    </TableCell>
                    <TableCell>{getUserName(proposal.user_id)}</TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell>
                      {formatCurrency(proposal.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(proposal.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/proposals/${proposal.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Proposal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateProposalStatus(proposal.id, 'draft')
                            }
                          >
                            Mark as Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateProposalStatus(proposal.id, 'sent')
                            }
                          >
                            Mark as Sent
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateProposalStatus(proposal.id, 'accepted')
                            }
                          >
                            Mark as Accepted
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateProposalStatus(proposal.id, 'rejected')
                            }
                          >
                            Mark as Rejected
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteProposal(proposal.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredProposals.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No proposals found matching your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}