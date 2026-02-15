import React from 'react'
import { TemplateItem } from '@/features/proposals';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Check, Layout, Lock } from 'lucide-react';

interface TemplateCardPreviewProps {
  template: TemplateItem;
  canAccess: boolean;
  isSelected: boolean;
}

export function TemplateCardPreview({ template, canAccess, isSelected }: TemplateCardPreviewProps) {
  return (
            <div className="aspect-[1/1.4] bg-gray-100 relative">
                {template.preview_image_url ? (
                  <Image
                    src={template.preview_image_url}
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
  )
}

export default TemplateCardPreview