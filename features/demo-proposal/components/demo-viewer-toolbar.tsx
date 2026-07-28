"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Printer,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface DemoViewerToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  currentPage: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  /** Print / fullscreen are gated behind sign-up, like Save / Download / Send. */
  onGatedAction: () => void;
}

const iconButton =
  "rounded-lg p-2 text-demo-on-surface-variant transition-colors hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Document viewer controls from the Stitch "Final Conversion CTA" screen.
 * Zoom and page navigation act on the real rendered template; print and
 * fullscreen open the sign-up modal.
 */
export function DemoViewerToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  currentPage,
  pageCount,
  onPrevPage,
  onNextPage,
  onGatedAction,
}: DemoViewerToolbarProps) {
  return (
    <div className="demo-glass flex items-center justify-between gap-2 rounded-xl border border-demo-outline-variant/20 px-4 py-3 shadow-sm sm:px-6">
      <div className="sm:flex hidden items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
          className={iconButton}
        >
          <ZoomOut className="size-5" />
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
          className={iconButton}
        >
          <ZoomIn className="size-5" />
        </button>
        <span className="min-w-11 text-demo-label-md text-demo-outline">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className={iconButton}
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="whitespace-nowrap rounded-md border border-demo-outline-variant/20 bg-white px-2 py-1 text-demo-label-md font-semibold">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPage >= pageCount}
            aria-label="Next page"
            className={iconButton}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-3">
        <button
          type="button"
          onClick={onGatedAction}
          aria-label="Print proposal"
          className={iconButton}
        >
          <Printer className="size-5" />
        </button>
        <button
          type="button"
          onClick={onGatedAction}
          aria-label="View fullscreen"
          className={iconButton}
        >
          <Maximize2 className="size-5" />
        </button>
      </div>
    </div>
  );
}
