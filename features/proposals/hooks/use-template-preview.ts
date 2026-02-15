'use client';

import { TemplateItem } from '@/features/proposals';
import { useState } from 'react';


interface UseTemplatePreviewReturn {
    isPreviewOpen: boolean;
    previewTemplate: TemplateItem | null;
    openPreview: (template: TemplateItem) => void;
    closePreview: () => void;
    handlePreviewOpenChange: (open: boolean) => void;
  }
  
  export function useTemplatePreview(): UseTemplatePreviewReturn {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  
    const openPreview = (template: TemplateItem): void => {
      setPreviewTemplate(template);
      setIsPreviewOpen(true);
    };
  
    const closePreview = (): void => {
      setIsPreviewOpen(false);
      setPreviewTemplate(null);
    };
  
    const handlePreviewOpenChange = (open: boolean): void => {
      if (!open) closePreview();
      else setIsPreviewOpen(true);
    };
  
    return { isPreviewOpen, previewTemplate, openPreview, closePreview, handlePreviewOpenChange };
  }
