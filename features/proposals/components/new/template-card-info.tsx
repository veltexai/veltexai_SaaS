import React from 'react'
import { TemplateItem } from '@/features/proposals';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTierBadgeColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Lock, Eye } from 'lucide-react';
import Link from 'next/link';

interface TemplateCardInfoProps {
  template: TemplateItem;
  isSelected: boolean;
  canAccess: boolean;
  onSelect: (id: string) => void;
  onPreview: (template: TemplateItem) => void;
}

export function TemplateCardInfo({ template, isSelected, canAccess, onSelect, onPreview }: TemplateCardInfoProps) {
  return (
    <div className="p-4 flex flex-col justify-between gap-2">
    <div className="flex items-start justify-between">
      <h3 className="font-medium text-sm">
        {template.display_name}
      </h3>
      {template.tiers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.tiers.map((tier) => (
            <Badge
              key={tier}
              variant="secondary"
              className={cn(
                'text-xs capitalize',
                getTierBadgeColor(tier)
              )}
            >
              {tier}
            </Badge>
          ))}
        </div>
      )}
    </div>

    {template.description && (
      <p className="text-xs text-muted-foreground">
        {template.description}
      </p>
    )}

    {/* Action Buttons */}
    <div className="flex gap-2">
      {canAccess ? (
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          className="flex-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(template.id);
          }}
        >
          {isSelected ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Selected
            </>
          ) : (
            'Select'
          )}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="text-xs" asChild>
          <Link
            href={'/dashboard/billing'}
            className="flex items-center"
          >
            <Lock className="h-3 w-3 mr-1" />
            Upgrade Required
          </Link>
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="px-2"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(template);
        }}
      >
        <Eye className="h-3 w-3" />
      </Button>
    </div>
  </div>
  )
}

export default TemplateCardInfo