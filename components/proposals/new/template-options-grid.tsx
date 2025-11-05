'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Layout, Check, Lock, Eye } from 'lucide-react';
import { cn, getTierBadgeColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubscriptionTier } from '@/types/subscription';
import { Database } from '@/types/database';
import TemplatePreviewDialog from '@/components/templates/template-preview-dialog';
import { createClient } from '@/lib/supabase/client';

export interface TemplateItem {
  id: string;
  display_name: string;
  description?: string | null;
  preview_image_url?: string | null;
  preview_pdf_url?: string | null;
  sort_order?: number | null;
  tiers: SubscriptionTier[];
  template_data?:
    | Database['public']['Tables']['proposal_templates']['Row']['template_data']
    | null;
}

interface TemplateOptionsGridProps {
  templates: TemplateItem[];
  userTier: SubscriptionTier;
  selectedTemplateId?: string;
  onSelectTemplate: (templateId: string) => void;
}

function hasAccess(tiers: SubscriptionTier[], userTier: SubscriptionTier) {
  if (tiers.length === 0) return true;
  return tiers.includes(userTier);
}

export function TemplateOptionsGrid({
  templates,
  userTier,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateOptionsGridProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(
    null
  );
  const supabase = createClient();

  const normalizePublicUrl = (
    rawUrl: string | null | undefined
  ): string | null => {
    if (!rawUrl) return null;
    try {
      const marker = '/storage/v1/object/public/';
      const idx = rawUrl.indexOf(marker);
      if (idx !== -1) {
        const bucketAndPath = rawUrl.slice(idx + marker.length);
        const slashIndex = bucketAndPath.indexOf('/');
        if (slashIndex !== -1) {
          const bucket = bucketAndPath.slice(0, slashIndex);
          const path = decodeURIComponent(bucketAndPath.slice(slashIndex + 1));
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          return data.publicUrl || rawUrl;
        }
      }
      return rawUrl;
    } catch {
      return rawUrl;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates
        .slice()
        .sort((a, b) => {
          const aHas = hasAccess(a.tiers, userTier);
          const bHas = hasAccess(b.tiers, userTier);

          if (aHas !== bHas) return aHas ? -1 : 1;

          const aOrder = typeof a.sort_order === 'number' ? a.sort_order : 0;
          const bOrder = typeof b.sort_order === 'number' ? b.sort_order : 0;
          if (aOrder !== bOrder) return aOrder - bOrder;

          return a.display_name.localeCompare(b.display_name);
        })
        .map((template) => {
          const canAccess = hasAccess(template.tiers, userTier);
          const isSelected = selectedTemplateId === template.id;

          return (
            <div
              key={template.id}
              className={cn(
                'relative border-2 rounded-lg overflow-hidden transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : canAccess
                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'
                  : 'border-gray-200 opacity-60'
              )}
              onClick={() => canAccess && onSelectTemplate(template.id)}
            >
              {/* Template Preview */}
              <div className="aspect-[1/1.4] bg-gray-100 relative">
                {template.preview_image_url ? (
                  <Image
                    src={normalizePublicUrl(template.preview_image_url) || ''}
                    alt={template.display_name || 'Template Preview'}
                    className={cn(
                      'w-full h-full object-cover',
                      !canAccess && 'blur-[1px]'
                    )}
                    width={200}
                    height={150}
                  />
                ) : (
                  <div
                    className={cn(
                      'w-full h-full flex items-center justify-center',
                      !canAccess && 'blur-[1px]'
                    )}
                  >
                    <Layout className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Lock Overlay */}
                {!canAccess && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-2">
                      <Lock className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Template Info */}
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
                        onSelectTemplate(template.id);
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
                    <Button size="sm" variant="outline" className="text-xs">
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
                      setPreviewTemplate(template);
                      setPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

      {previewTemplate && (
        <TemplatePreviewDialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) setPreviewTemplate(null);
          }}
          template={{
            id: previewTemplate.id,
            display_name: previewTemplate.display_name,
            description: previewTemplate.description ?? null,
            preview_image_url: previewTemplate.preview_image_url ?? null,
            preview_pdf_url: previewTemplate.preview_pdf_url ?? null,
            template_data:
              typeof previewTemplate.template_data === 'object' &&
              previewTemplate.template_data !== null &&
              !Array.isArray(previewTemplate.template_data)
                ? (previewTemplate.template_data as Record<string, unknown>)
                : null,
          }}
        />
      )}
    </div>
  );
}
