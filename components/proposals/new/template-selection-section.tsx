'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layout, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { ProposalFormData } from '@/lib/validations/proposal';
import { TemplateOptionsGrid } from './template-options-grid';
import { SubscriptionTier } from '@/types/subscription';

type ProposalTemplate =
  Database['public']['Tables']['proposal_templates']['Row'];

interface TemplateWithTiers extends ProposalTemplate {
  tiers: SubscriptionTier[];
}

interface TemplateSelectionSectionProps {
  userTier: SubscriptionTier;
}

// Module-level cache (persists across component renders)
let templatesCache: TemplateWithTiers[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function TemplateSelectionSection({
  userTier,
}: TemplateSelectionSectionProps) {
  const { setValue, watch } = useFormContext<ProposalFormData>();
  const selectedTemplateId = watch('template_id');

  const [templates, setTemplates] = useState<TemplateWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Check cache first
      if (templatesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
        console.log('Using cached templates');
        setTemplates(templatesCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();

      // Fetch templates with their tier access
      const { data: templatesData, error: templatesError } = await supabase
        .from('proposal_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (templatesError) throw templatesError;

      // Fetch tier access for each template
      const templatesWithTiers: TemplateWithTiers[] = [];

      for (const template of templatesData || []) {
        const { data: tierData, error: tierError } = await supabase
          .from('template_tier_access')
          .select('subscription_tier')
          .eq('template_id', template.id);

        if (tierError) {
          console.error('Error fetching tier access:', tierError);
          continue;
        }

        templatesWithTiers.push({
          ...template,
          tiers: tierData?.map((t) => t.subscription_tier) || [],
        });
      }

      // Save to cache (with tier data included)
      templatesCache = templatesWithTiers;
      cacheTimestamp = Date.now();

      setTemplates(templatesWithTiers);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (templateTiers: SubscriptionTier[]) => {
    if (templateTiers.length === 0) return true; // No restrictions
    return templateTiers.includes(userTier);
  };

  const selectTemplate = (templateId: string) => {
    setValue('template_id', templateId, { shouldValidate: true });
    toast.success('Template selected successfully');
  };

  // Default to first accessible template (basic) when none selected
  useEffect(() => {
    if (templates.length === 0 || selectedTemplateId) return;
    const firstAccessible = templates.find((t) => hasAccess(t.tiers));
    const defaultId = firstAccessible?.id ?? templates[0]?.id;
    if (defaultId) {
      setValue('template_id', defaultId, { shouldValidate: true });
    }
  }, [templates, selectedTemplateId, setValue]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Choose a Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-80 w-3xs" />
                <Skeleton className="h-80 w-3xs" />
                <Skeleton className="h-80 w-3xs" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Choose a Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Choose a Template
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Choose client-ready output format. You can customize the content later.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Template Options */}
          <TemplateOptionsGrid
            templates={templates}
            userTier={userTier}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={(id) => selectTemplate(id)}
          />

          {/* Upgrade Notice */}
          {templates.some((t) => !hasAccess(t.tiers)) && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Some templates require a higher subscription tier.
                <Button variant="link" className="p-0 h-auto ml-1">
                  Upgrade your plan
                </Button>{' '}
                to access all templates.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
