'use client';

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layout, AlertCircle, Sparkles } from 'lucide-react';
import { ProposalFormData } from '@/lib/validations/proposal';
import { SubscriptionTier } from '@/types/subscription';
import { handleSelectTemplate, useProposalTemplates, canAccessTemplate, TemplateOptionsGrid } from '@/features/proposals';


interface TemplateSelectionSectionProps {
  userTier: SubscriptionTier;
}

export function TemplateSelectionSection({
  userTier,
}: TemplateSelectionSectionProps) {
  const { setValue, watch } = useFormContext<ProposalFormData>();
  const selectedTemplateId = watch('template_id');
  const { templates, isLoading, error, refetch } = useProposalTemplates();

  // Default to first accessible template (basic) when none selected
  useEffect(() => {
    if (templates.length === 0 || selectedTemplateId) return;
    const firstAccessible = templates.find((t) => canAccessTemplate(t.tiers, userTier));
    const defaultId = firstAccessible?.id ?? templates[0]?.id;
    if (defaultId) {
      setValue('template_id', defaultId, { shouldValidate: true });
    }
  }, [templates, selectedTemplateId, setValue, userTier]);

  if (isLoading) {
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
            onSelectTemplate={(id) => handleSelectTemplate(setValue, id)}
          />

          {/* Upgrade Notice */}
          {templates.some((t) => !canAccessTemplate(t.tiers, userTier)) && (
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
