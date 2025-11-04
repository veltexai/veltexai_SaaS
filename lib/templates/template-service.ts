'use server';

import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/auth-helpers';
import type { 
  ProposalTemplate, 
  TemplateTierAccess, 
  UserTemplatePreferences,
  Profile 
} from '@/types/database';

export interface TemplateWithAccess extends ProposalTemplate {
  hasAccess: boolean;
  tierAccess: TemplateTierAccess[];
}

/**
 * Get all templates with access information for the current user
 */
export async function getUserAccessibleTemplates(): Promise<TemplateWithAccess[]> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user's subscription plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', user.id)
    .single();

  const userTier = profile?.subscription_plan || 'starter';

  // Get all active templates with their tier access
  const { data: templates, error } = await supabase
    .from('proposal_templates')
    .select(`
      *,
      template_tier_access (
        subscription_tier
      )
    `)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  // Check access for each template
  const templatesWithAccess: TemplateWithAccess[] = templates.map(template => {
    const tierAccess = template.template_tier_access as TemplateTierAccess[];
    const hasAccess = tierAccess.some(access => access.subscription_tier === userTier);
    
    return {
      ...template,
      hasAccess,
      tierAccess
    };
  });

  return templatesWithAccess;
}

/**
 * Check if user can access a specific template
 */
export async function canUserAccessTemplate(templateId: string): Promise<boolean> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    return false;
  }

  // Get user's subscription plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', user.id)
    .single();

  const userTier = profile?.subscription_plan || 'starter';

  // Use the database function to check access
  const { data, error } = await supabase
    .rpc('can_user_access_template', {
      p_user_id: user.id,
      p_template_id: templateId
    });

  if (error) {
    console.error('Error checking template access:', error);
    return false;
  }

  return data;
}

/**
 * Get user's preferred template
 */
export async function getUserPreferredTemplate(): Promise<UserTemplatePreferences | null> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_template_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching user template preferences:', error);
    return null;
  }

  return data;
}

/**
 * Set user's preferred template
 */
export async function setUserPreferredTemplate(
  templateId: string,
  templateSettings?: Record<string, any>
): Promise<void> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user can access this template
  const hasAccess = await canUserAccessTemplate(templateId);
  if (!hasAccess) {
    throw new Error('User does not have access to this template');
  }

  const { error } = await supabase
    .from('user_template_preferences')
    .upsert({
      user_id: user.id,
      preferred_template_id: templateId,
      template_settings: templateSettings || null
    });

  if (error) {
    throw new Error(`Failed to set preferred template: ${error.message}`);
  }
}

/**
 * Get template by ID (admin only)
 */
export async function getTemplateById(templateId: string): Promise<ProposalTemplate | null> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return data;
}

/**
 * Create a new template (admin only)
 */
export async function createTemplate(template: {
  name: string;
  display_name: string;
  description?: string;
  preview_image_url?: string;
  preview_pdf_url?: string;
  template_data?: Record<string, any>;
  sort_order?: number;
}): Promise<ProposalTemplate> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabase
    .from('proposal_templates')
    .insert({
      name: template.name,
      display_name: template.display_name,
      description: template.description || null,
      preview_image_url: template.preview_image_url || null,
      preview_pdf_url: template.preview_pdf_url || null,
      template_data: template.template_data || {},
      sort_order: template.sort_order || 0,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return data;
}

/**
 * Update template (admin only)
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<ProposalTemplate>
): Promise<ProposalTemplate> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabase
    .from('proposal_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return data;
}

/**
 * Set template tier access (admin only)
 */
export async function setTemplateTierAccess(
  templateId: string,
  tiers: Array<'starter' | 'professional' | 'enterprise'>
): Promise<void> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  // Delete existing tier access
  await supabase
    .from('template_tier_access')
    .delete()
    .eq('template_id', templateId);

  // Insert new tier access
  if (tiers.length > 0) {
    const tierAccess = tiers.map(tier => ({
      template_id: templateId,
      subscription_tier: tier
    }));

    const { error } = await supabase
      .from('template_tier_access')
      .insert(tierAccess);

    if (error) {
      throw new Error(`Failed to set template tier access: ${error.message}`);
    }
  }
}

/**
 * Get all templates (admin only)
 */
export async function getAllTemplates(): Promise<ProposalTemplate[]> {
  const supabase = await createClient();
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .order('sort_order');

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  return data;
}