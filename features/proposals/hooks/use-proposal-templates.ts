'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { SubscriptionTier } from '@/types/subscription';
import { TemplateWithTiers } from '@/features/proposals';
import { templatesCache } from '@/lib/templates/templates-cache';

interface UseProposalTemplatesReturn {
  templates: TemplateWithTiers[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProposalTemplates(): UseProposalTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateWithTiers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (): Promise<void> => {
    // 1. Return early from cache if still valid
    const cached = templatesCache.get();
    if (cached) {
      setTemplates(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 2. Fetch all active templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('proposal_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (templatesError) throw templatesError;

      const safeTemplatesData = templatesData ?? [];

      // 3. Single query for ALL tier access rows (fixes N+1)
      const templateIds = safeTemplatesData.map((t) => t.id);

      const { data: allTierData, error: tierError } = await supabase
        .from('template_tier_access')
        .select('template_id, subscription_tier')
        .in('template_id', templateIds);

      if (tierError) throw tierError;

      // 4. Group tier rows by template_id
      const tiersByTemplateId = (allTierData ?? []).reduce
        <Record<string, SubscriptionTier[]>
      >((acc, row) => {
        acc[row.template_id] = [
          ...(acc[row.template_id] ?? []),
          row.subscription_tier,
        ];
        return acc;
      }, {});

      // 5. Merge templates with their tiers
      const templatesWithTiers: TemplateWithTiers[] = safeTemplatesData.map(
        (template) => ({
          ...template,
          tiers: tiersByTemplateId[template.id] ?? [],
        })
      );

      // 6. Save to cache and update state
      templatesCache.set(templatesWithTiers);
      setTemplates(templatesWithTiers);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, isLoading, error, refetch: fetchTemplates };
}