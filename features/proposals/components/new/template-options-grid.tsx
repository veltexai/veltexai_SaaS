'use client';

import { SubscriptionTier } from '@/types/subscription';
import TemplatePreviewDialog from '@/components/templates/template-preview-dialog';
import { canAccessTemplate, sortTemplatesByAccess, TemplateCard, TemplateItem, useTemplatePreview } from '@/features/proposals';
import { useMemo } from 'react';

interface TemplateOptionsGridProps {
  templates: TemplateItem[];
  userTier: SubscriptionTier;
  selectedTemplateId?: string;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateOptionsGrid({
  templates,
  userTier,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateOptionsGridProps) {

  // Template preview state and functions
  const { isPreviewOpen, previewTemplate, openPreview, handlePreviewOpenChange, closePreview } =
  useTemplatePreview();

  // Sort templates by access and order
  const sortedTemplates = useMemo(
    () => sortTemplatesByAccess(templates, userTier),
    [templates, userTier]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedTemplates.map((template: TemplateItem) => (
        <TemplateCard
        key={template.id}
        template={template}
        isSelected={selectedTemplateId === template.id}
        canAccess={canAccessTemplate(template.tiers, userTier)}
        onSelect={onSelectTemplate}
        onPreview={openPreview}
      />
      ))}

      {previewTemplate && (
        <TemplatePreviewDialog
          open={isPreviewOpen}
          onOpenChange={(open) => {
            handlePreviewOpenChange(open);
            if (!open) {
              closePreview();
            }
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
