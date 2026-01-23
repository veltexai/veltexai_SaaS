'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { 
  ProposalTemplate, 
  UserTemplatePreferences 
} from '@/types/database';

export interface TemplateWithAccess extends ProposalTemplate {
  hasAccess: boolean;
  tierAccess: Array<{ subscription_tier: string }>;
}

interface UseTemplatesReturn {
  templates: TemplateWithAccess[];
  preferredTemplate: UserTemplatePreferences | null;
  loading: boolean;
  error: string | null;
  refreshTemplates: () => Promise<void>;
  setPreferredTemplate: (templateId: string, settings?: Record<string, any>) => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateWithAccess[]>([]);
  const [preferredTemplate, setPreferredTemplateState] = useState<UserTemplatePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's subscription plan
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First try to get from subscriptions table (more reliable during trial)
      let userTier = 'starter';
      
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscription?.plan) {
        userTier = subscription.plan;
      } else {
        // Fallback to profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', user.id)
          .single();
        
        userTier = profile?.subscription_plan || 'starter';
      }

      // Get all active templates with their tier access
      const { data: templatesData, error: templatesError } = await supabase
        .from('proposal_templates')
        .select(`
          *,
          template_tier_access (
            subscription_tier
          )
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (templatesError) {
        throw new Error(`Failed to fetch templates: ${templatesError.message}`);
      }

      // Check access for each template
      const templatesWithAccess: TemplateWithAccess[] = templatesData.map(template => {
        const tierAccess = template.template_tier_access as Array<{ subscription_tier: string }>;
        const hasAccess = tierAccess.some(access => access.subscription_tier === userTier);
        
        return {
          ...template,
          hasAccess,
          tierAccess
        };
      });

      setTemplates(templatesWithAccess);

      // Fetch user's preferred template
      const { data: preferredData, error: preferredError } = await supabase
        .from('user_template_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferredError && preferredError.code !== 'PGRST116') {
        console.error('Error fetching user template preferences:', preferredError);
      } else {
        setPreferredTemplateState(preferredData);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const setPreferredTemplate = useCallback(async (
    templateId: string,
    templateSettings?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user can access this template
      const template = templates.find(t => t.id === templateId);
      if (!template?.hasAccess) {
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

      // Update local state
      setPreferredTemplateState({
        id: crypto.randomUUID(),
        user_id: user.id,
        preferred_template_id: templateId,
        template_settings: templateSettings || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    }
  }, [supabase, templates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    preferredTemplate,
    loading,
    error,
    refreshTemplates: fetchTemplates,
    setPreferredTemplate
  };
}

/**
 * Hook for checking if user can access a specific template
 */
export function useTemplateAccess(templateId: string | null) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (!templateId) {
      setHasAccess(null);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasAccess(false);
          return;
        }

        // Use the database function to check access
        const { data, error } = await supabase
          .rpc('can_user_access_template', {
            p_user_id: user.id,
            p_template_id: templateId
          });

        if (error) {
          console.error('Error checking template access:', error);
          setHasAccess(false);
          return;
        }

        setHasAccess(data);
      } catch (err) {
        console.error('Error checking template access:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [templateId, supabase]);

  return { hasAccess, loading };
}