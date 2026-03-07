'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Star, Lock, Check } from 'lucide-react';
import type { TemplateWithAccess } from '@/lib/templates/use-templates';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  template: TemplateWithAccess;
  isSelected?: boolean;
  onSelect?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function TemplatePreview({
  template,
  isSelected = false,
  onSelect,
  showDetails = false,
  className,
}: TemplatePreviewProps) {
  const getTemplateIcon = () => {
    if (template.name === 'basic-professional') {
      return <Star className="h-5 w-5" />;
    }
    return <Crown className="h-5 w-5" />;
  };

  const getTierBadge = () => {
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

  const getAccessibleTiers = () => {
    return template.tierAccess.map((t) => t.subscription_tier).join(', ');
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        !template.hasAccess && 'opacity-60',
        onSelect && 'cursor-pointer',
        className
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTemplateIcon()}
            <CardTitle className="text-lg">{template.display_name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getTierBadge()}
            {!template.hasAccess && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preview Image */}
        <div className="aspect-[4/3] relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-md overflow-hidden">
          {template.preview_image_url ? (
            <img
              src={template.preview_image_url}
              alt={template.display_name}
              className={cn(
                'w-full h-full object-cover',
                !template.hasAccess && 'blur-sm'
              )}
            />
          ) : (
            <div
              className={cn(
                'w-full h-full flex items-center justify-center',
                !template.hasAccess && 'blur-sm'
              )}
            >
              {getTemplateIcon()}
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
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        )}

        {/* Details */}
        {showDetails && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Available for:</span>{' '}
              {getAccessibleTiers()}
            </div>
            <div>
              <span className="font-medium">Template ID:</span> {template.name}
            </div>
            {template.template_data && (
              <div>
                <span className="font-medium">Features:</span>{' '}
                {
                  Object.keys(template.template_data as Record<string, any>)
                    .length
                }{' '}
                customizations
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {onSelect && (
          <Button
            variant={template.hasAccess ? 'default' : 'secondary'}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {template.hasAccess
              ? isSelected
                ? 'Selected'
                : 'Select Template'
              : 'Upgrade to Unlock'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
