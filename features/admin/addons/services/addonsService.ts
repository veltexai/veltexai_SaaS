/**
 * Add-ons Service
 * Server-side service for add-on CRUD operations
 * Uses Supabase with RLS for admin-only access
 */

import { createClient } from '@/lib/supabase/client';
import { createServiceClient } from '@/lib/supabase/server';
import type { Addon, AddonFormData, AddonFilters } from '../types';

/**
 * Fetch all add-ons with optional filters
 * Public read access for catalog
 */
export async function getAddons(filters?: AddonFilters): Promise<Addon[]> {
  const supabase = createClient();

  let query = supabase
    .from('additional_service_catalog')
    .select('*')
    .order('label', { ascending: true });

  // Apply filters
  if (filters?.search) {
    query = query.or(
      `label.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  if (filters?.show_in_proposals !== undefined) {
    query = query.eq('show_in_proposals', filters.show_in_proposals);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching add-ons:', error);
    throw new Error(`Failed to fetch add-ons: ${error.message}`);
  }

  return (data as Addon[]) || [];
}

/**
 * Fetch catalog for proposal builder
 * Returns only active add-ons that should show in proposals
 */
export async function getCatalog(): Promise<Addon[]> {
  return getAddons({
    active: true,
    show_in_proposals: true,
  });
}

/**
 * Fetch single add-on by ID
 */
export async function getAddonById(id: string): Promise<Addon | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('additional_service_catalog')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching add-on:', error);
    return null;
  }

  return data as Addon;
}

/**
 * Fetch single add-on by SKU
 */
export async function getAddonBySku(sku: string): Promise<Addon | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('additional_service_catalog')
    .select('*')
    .eq('sku', sku)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching add-on by SKU:', error);
    return null;
  }

  return data as Addon;
}

/**
 * Check if SKU is unique (client-side validation helper)
 */
export async function isSkuUnique(sku: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient();

  let query = supabase
    .from('additional_service_catalog')
    .select('id')
    .eq('sku', sku);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.single();

  if (error) {
    // If not found, SKU is unique
    return error.code === 'PGRST116';
  }

  return !data;
}

/**
 * Server-side CRUD operations below
 * These should be called via API routes with admin authentication
 */

/**
 * Create a new add-on (admin only - call via API)
 */
export async function createAddon(formData: AddonFormData): Promise<Addon> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('additional_service_catalog')
    .insert([formData])
    .select()
    .single();

  if (error) {
    console.error('Error creating add-on:', error);
    throw new Error(`Failed to create add-on: ${error.message}`);
  }

  return data as Addon;
}

/**
 * Update an existing add-on (admin only - call via API)
 */
export async function updateAddon(id: string, formData: Partial<AddonFormData>): Promise<Addon> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('additional_service_catalog')
    .update(formData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating add-on:', error);
    throw new Error(`Failed to update add-on: ${error.message}`);
  }

  return data as Addon;
}

/**
 * Soft delete add-on (set active = false)
 */
export async function softDeleteAddon(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('additional_service_catalog')
    .update({ active: false })
    .eq('id', id);

  if (error) {
    console.error('Error soft-deleting add-on:', error);
    throw new Error(`Failed to deactivate add-on: ${error.message}`);
  }
}

/**
 * Hard delete add-on (permanent - admin only)
 */
export async function deleteAddon(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('additional_service_catalog')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting add-on:', error);
    throw new Error(`Failed to delete add-on: ${error.message}`);
  }
}

/**
 * Toggle active status
 */
export async function toggleAddonActive(id: string, active: boolean): Promise<Addon> {
  return updateAddon(id, { active });
}

/**
 * Toggle show_in_proposals status
 */
export async function toggleAddonShowInProposals(id: string, showInProposals: boolean): Promise<Addon> {
  return updateAddon(id, { show_in_proposals: showInProposals });
}

/**
 * Bulk operations for seeding/management
 */
export async function bulkCreateAddons(addons: AddonFormData[]): Promise<Addon[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('additional_service_catalog')
    .insert(addons)
    .select();

  if (error) {
    console.error('Error bulk creating add-ons:', error);
    throw new Error(`Failed to bulk create add-ons: ${error.message}`);
  }

  return (data as Addon[]) || [];
}











