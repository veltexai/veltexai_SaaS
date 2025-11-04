'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Check, Crown, Star } from 'lucide-react';
import {
  useTemplates,
  type TemplateWithAccess,
} from '@/lib/templates/use-templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Image from 'next/image';

interface TemplateSelectorProps {
  selectedTemplateId?: string | null;
  onTemplateSelect: (templateId: string) => void;
  className?: string;
}

export function TemplateSelector({
  selectedTemplateId,
  onTemplateSelect,
  className,
}: TemplateSelectorProps) {
  const { templates, loading, error } = useTemplates();
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleTemplateSelect = async (template: TemplateWithAccess) => {
    if (!template.hasAccess) {
      toast.error('Upgrade to unlock this template');
      return;
    }

    try {
      setSelecting(template.id);
      onTemplateSelect(template.id);
      toast.success(`${template.display_name} template selected`);
    } catch (error) {
      toast.error('Failed to select template');
    } finally {
      setSelecting(null);
    }
  };

  const getTemplateIcon = (template: TemplateWithAccess) => {
    if (template.name === 'basic-professional') {
      return <Star className="h-4 w-4" />;
    }
    return <Crown className="h-4 w-4" />;
  };

  const getTierBadge = (template: TemplateWithAccess) => {
    const tiers = template.tierAccess.map((t) => t.subscription_tier);

    if (tiers.includes('starter')) {
      return <Badge variant="secondary">Basic</Badge>;
    }
    if (tiers.includes('professional') && !tiers.includes('enterprise')) {
      return <Badge variant="default">Premium</Badge>;
    }
    if (tiers.includes('enterprise')) {
      return <Badge variant="destructive">Elite</Badge>;
    }

    return null;
  };

  if (loading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
          className
        )}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-[4/3] relative">
              <Skeleton className="w-full h-full" />
            </div>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full mb-3" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Failed to load templates</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No templates available</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
        className
      )}
    >
      {templates.map((template) => (
        <Card
          key={template.id}
          className={cn(
            'overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg',
            selectedTemplateId === template.id && 'ring-2 ring-primary',
            !template.hasAccess && 'opacity-60'
          )}
          onClick={() => handleTemplateSelect(template)}
        >
          <div className="aspect-[4/3] relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            {/* Template Preview Image */}
            {template.preview_image_url ? (
              <Image
                src={template.preview_image_url}
                alt={template.display_name}
                className={cn(
                  'w-full h-full object-cover',
                  !template.hasAccess && 'blur-sm'
                )}
                width={200}
                height={150}
              />
            ) : (
              <div
                className={cn(
                  'w-full h-full flex items-center justify-center',
                  !template.hasAccess && 'blur-sm'
                )}
              >
                {getTemplateIcon(template)}
              </div>
            )}

            {/* Overlay for locked templates */}
            {!template.hasAccess && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-gray-900/90 rounded-full p-3">
                  <Lock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            )}

            {/* Selected indicator */}
            {selectedTemplateId === template.id && (
              <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            {/* Tier badge */}
            {/* <div className="absolute top-2 left-2">
              {getTierBadge(template)}
            </div> */}
          </div>

          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{template.display_name}</h3>
              {getTemplateIcon(template)}
            </div>

            {template.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {template.description}
              </p>
            )}

            <Button
              size="sm"
              variant={template.hasAccess ? 'default' : 'secondary'}
              className="w-full"
              disabled={selecting === template.id}
              onClick={(e) => {
                e.stopPropagation();
                handleTemplateSelect(template);
              }}
            >
              {selecting === template.id
                ? 'Selecting...'
                : template.hasAccess
                ? selectedTemplateId === template.id
                  ? 'Selected'
                  : 'Select'
                : 'Upgrade to Unlock'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
