'use client';

/**
 * AddonList Component
 * Table view with search, filters, and CRUD operations
 */

import { useState, useMemo } from 'react';
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
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Loader2,
  AlertCircle,
  Package 
} from 'lucide-react';
import { AddonForm } from './AddonForm';
import { AddonRow } from './AddonRow';
import { useAddonsWithMutations } from '../hooks/useAddons';
import type { Addon, CategoryType, AddonFormData } from '../types';
import { CATEGORY_LABELS } from '../types';

const categories: CategoryType[] = ['cleaning', 'maintenance', 'specialty', 'seasonal', 'other'];

export function AddonList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showInProposalsFilter, setShowInProposalsFilter] = useState<'all' | 'yes' | 'no'>('all');
  
  const [showForm, setShowForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  // Build filters
  const filters = useMemo(() => {
    const f: any = {};
    if (searchQuery) f.search = searchQuery;
    if (categoryFilter !== 'all') f.category = categoryFilter;
    if (activeFilter === 'active') f.active = true;
    if (activeFilter === 'inactive') f.active = false;
    if (showInProposalsFilter === 'yes') f.show_in_proposals = true;
    if (showInProposalsFilter === 'no') f.show_in_proposals = false;
    return f;
  }, [searchQuery, categoryFilter, activeFilter, showInProposalsFilter]);

  const {
    addons,
    loading,
    error,
    refetch,
    createAddon,
    updateAddon,
    deleteAddon,
    toggleActive,
    toggleShowInProposals,
  } = useAddonsWithMutations(filters);

  const handleCreateClick = () => {
    setEditingAddon(null);
    setShowForm(true);
  };

  const handleEditClick = (addon: Addon) => {
    setEditingAddon(addon);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: AddonFormData) => {
    if (editingAddon) {
      await updateAddon(editingAddon.id, data);
    } else {
      await createAddon(data);
    }
  };

  const handleDelete = async (id: string, soft: boolean) => {
    await deleteAddon(id, soft);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await toggleActive(id, active);
  };

  const handleToggleShowInProposals = async (id: string, show: boolean) => {
    await toggleShowInProposals(id, show);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setActiveFilter('all');
    setShowInProposalsFilter('all');
  };

  const hasActiveFilters = 
    searchQuery || 
    categoryFilter !== 'all' || 
    activeFilter !== 'all' || 
    showInProposalsFilter !== 'all';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Add-On Services Catalog
              </CardTitle>
              <CardDescription>
                Manage additional services that can be added to proposals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={handleCreateClick}>
                <Plus className="h-4 w-4 mr-2" />
                Create Add-On
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, SKU, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Active Filter */}
              <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Show in Proposals Filter */}
              <Select 
                value={showInProposalsFilter} 
                onValueChange={(v) => setShowInProposalsFilter(v as any)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="yes">In Proposals</SelectItem>
                  <SelectItem value="no">Hidden</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: {searchQuery}
                  </Badge>
                )}
                {categoryFilter !== 'all' && (
                  <Badge variant="secondary">
                    Category: {CATEGORY_LABELS[categoryFilter as CategoryType]}
                  </Badge>
                )}
                {activeFilter !== 'all' && (
                  <Badge variant="secondary">
                    {activeFilter === 'active' ? 'Active Only' : 'Inactive Only'}
                  </Badge>
                )}
                {showInProposalsFilter !== 'all' && (
                  <Badge variant="secondary">
                    {showInProposalsFilter === 'yes' ? 'In Proposals' : 'Hidden'}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading add-ons...</span>
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <>
              {addons.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No add-ons found</h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? 'Try adjusting your filters or search query'
                      : 'Get started by creating your first add-on service'}
                  </p>
                  {!hasActiveFilters && (
                    <Button onClick={handleCreateClick}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Add-On
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Default Frequency</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>In Proposals</TableHead>
                        <TableHead>Amortize</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addons.map((addon) => (
                        <AddonRow
                          key={addon.id}
                          addon={addon}
                          onEdit={handleEditClick}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                          onToggleShowInProposals={handleToggleShowInProposals}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Results Count */}
              {addons.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {addons.length} add-on{addons.length !== 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      <AddonForm
        open={showForm}
        onOpenChange={setShowForm}
        addon={editingAddon}
        onSubmit={handleFormSubmit}
      />
    </>
  );
}


