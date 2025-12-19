/**
 * useAddons Hook
 * Manages fetching, filtering, and mutations for add-ons list
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Addon, AddonFilters } from '../types';

interface UseAddonsReturn {
  addons: Addon[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  filters: AddonFilters;
  setFilters: (filters: AddonFilters) => void;
}

/**
 * Hook to fetch and manage add-ons list
 */
export function useAddons(initialFilters?: AddonFilters): UseAddonsReturn {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AddonFilters>(initialFilters || {});

  const fetchAddons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.active !== undefined) params.set('active', String(filters.active));
      if (filters.show_in_proposals !== undefined) {
        params.set('show_in_proposals', String(filters.show_in_proposals));
      }

      const response = await fetch(`/api/admin/addons?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch add-ons: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch add-ons');
      }

      setAddons(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      toast.error(`Error loading add-ons: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  return {
    addons,
    loading,
    error,
    refetch: fetchAddons,
    filters,
    setFilters,
  };
}

/**
 * Hook for optimistic updates
 */
interface UseAddonsWithMutationsReturn extends UseAddonsReturn {
  createAddon: (formData: any) => Promise<void>;
  updateAddon: (id: string, formData: any) => Promise<void>;
  deleteAddon: (id: string, soft?: boolean) => Promise<void>;
  toggleActive: (id: string, active: boolean) => Promise<void>;
  toggleShowInProposals: (id: string, show: boolean) => Promise<void>;
}

export function useAddonsWithMutations(initialFilters?: AddonFilters): UseAddonsWithMutationsReturn {
  const base = useAddons(initialFilters);
  const { addons, refetch } = base;

  const createAddon = async (formData: any) => {
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create add-on');
      }

      toast.success('Add-on created successfully');
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create add-on';
      toast.error(message);
      throw err;
    }
  };

  const updateAddon = async (id: string, formData: any) => {
    try {
      const response = await fetch(`/api/admin/addons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update add-on');
      }

      toast.success('Add-on updated successfully');
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update add-on';
      toast.error(message);
      throw err;
    }
  };

  const deleteAddon = async (id: string, soft = true) => {
    try {
      const response = await fetch(`/api/admin/addons/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soft }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete add-on');
      }

      toast.success(soft ? 'Add-on deactivated' : 'Add-on deleted permanently');
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete add-on';
      toast.error(message);
      throw err;
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateAddon(id, { active });
    } catch (err) {
      // Error already handled in updateAddon
      throw err;
    }
  };

  const toggleShowInProposals = async (id: string, show: boolean) => {
    try {
      await updateAddon(id, { show_in_proposals: show });
    } catch (err) {
      // Error already handled in updateAddon
      throw err;
    }
  };

  return {
    ...base,
    createAddon,
    updateAddon,
    deleteAddon,
    toggleActive,
    toggleShowInProposals,
  };
}







