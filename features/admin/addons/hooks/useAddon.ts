/**
 * useAddon Hook
 * Manages fetching a single add-on by ID
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Addon } from '../types';

interface UseAddonReturn {
  addon: Addon | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch a single add-on
 */
export function useAddon(id: string | null): UseAddonReturn {
  const [addon, setAddon] = useState<Addon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddon = async () => {
    if (!id) {
      setLoading(false);
      setAddon(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/addons/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch add-on: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch add-on');
      }

      setAddon(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      toast.error(`Error loading add-on: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddon();
  }, [id]);

  return {
    addon,
    loading,
    error,
    refetch: fetchAddon,
  };
}









