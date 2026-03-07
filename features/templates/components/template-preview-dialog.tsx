'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    display_name: string;
    description?: string | null;
    preview_image_url?: string | null;
    preview_pdf_url?: string | null;
    template_data?: Record<string, unknown> | null;
  };
}

export default function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: TemplatePreviewDialogProps) {
  const data = (template?.template_data ?? {}) as Record<string, unknown>;

  // Only use the explicit preview_pdf_url field
  const previewPdfUrl: string | undefined =
    typeof template.preview_pdf_url === 'string' ? template.preview_pdf_url : undefined;

  // PDF.js rendering to canvases
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      if (!previewPdfUrl || !open) return;
      setRenderError(null);
      setIsRendering(true);
      // Clear previous canvases
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      try {
        // Load UMD build from CDN for compatibility without bundling workers
        const ensurePdfJs = async () => {
          const w = window as any;
          if (w.pdfjsLib) return w.pdfjsLib;
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.async = true;
            script.onload = () => resolve(undefined);
            script.onerror = () => reject(new Error('Failed to load PDF.js')); 
            document.head.appendChild(script);
          });
          return (window as any).pdfjsLib;
        };

        const pdfjsLib = await ensurePdfJs();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument(previewPdfUrl);
        const pdf = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          await page.render({ canvasContext: context!, viewport }).promise;
          if (!cancelled && containerRef.current) {
            containerRef.current.appendChild(canvas);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to render PDF';
        setRenderError(msg);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }

    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [previewPdfUrl, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-4">
          <DialogTitle className="text-lg">
            {template.display_name} Preview
          </DialogTitle>
        </DialogHeader>
        {previewPdfUrl ? (
          <div className="h-[80vh] overflow-y-auto px-4 pb-4">
            {renderError ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {renderError}
              </div>
            ) : (
              <div ref={containerRef} className="space-y-4" />
            )}
          </div>
        ) : (
          <div className="h-[80vh] flex items-center justify-center text-muted-foreground px-4 pb-4">
            No preview available.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
