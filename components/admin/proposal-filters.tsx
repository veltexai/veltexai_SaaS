'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Search } from 'lucide-react';

interface ProposalFiltersProps {
  selectedProposals: string[];
  onFiltersChange?: (filters: {
    searchTerm: string;
    statusFilter: string;
    dateFilter: string;
  }) => void;
  onBulkAction?: (action: string) => void;
}

export default function ProposalFilters({
  selectedProposals,
  onFiltersChange,
  onBulkAction,
}: ProposalFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState('');

  const handleFilterChange = (
    type: 'search' | 'status' | 'date',
    value: string
  ) => {
    let newFilters = { searchTerm, statusFilter, dateFilter };

    switch (type) {
      case 'search':
        setSearchTerm(value);
        newFilters.searchTerm = value;
        break;
      case 'status':
        setStatusFilter(value);
        newFilters.statusFilter = value;
        break;
      case 'date':
        setDateFilter(value);
        newFilters.dateFilter = value;
        break;
    }

    onFiltersChange?.(newFilters);
  };

  const handleBulkAction = () => {
    if (bulkAction) {
      onBulkAction?.(bulkAction);
      setBulkAction('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters & Bulk Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals, clients, or users..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateFilter}
              onValueChange={(value) => handleFilterChange('date', value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedProposals.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedProposals.length} proposal(s) selected
              </span>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choose action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Mark as Draft</SelectItem>
                  <SelectItem value="sent">Mark as Sent</SelectItem>
                  <SelectItem value="accepted">Mark as Accepted</SelectItem>
                  <SelectItem value="rejected">Mark as Rejected</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={bulkAction === 'delete' ? 'destructive' : 'default'}
                    disabled={!bulkAction}
                  >
                    Apply Action
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to {bulkAction}{' '}
                      {selectedProposals.length} proposal(s)?
                      {bulkAction === 'delete' &&
                        ' This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkAction}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}