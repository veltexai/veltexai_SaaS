"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCcw, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Proposal } from "@/features/templates/types/templates";
import type { ScopeTemplateId } from "@/features/proposals/quick";
import type { DemoType } from "../types/demo-proposal";
import { DEMO_INSIGHTS } from "../constants/demo-insights";
import { DemoActions } from "./demo-actions";
import { DemoCTA } from "./demo-cta";
import { DemoSignupModal } from "./demo-signup-modal";
import { DemoViewerToolbar } from "./demo-viewer-toolbar";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const DEFAULT_ZOOM_INDEX = 2;

/**
 * The templates are laid out with fixed-size type over proportional (aspect
 * ratio) pages, so they only compose correctly at or above this width — the
 * same width the previous layout gave them. Narrower containers scale the
 * whole document down instead of re-flowing it, which keeps the rendering
 * identical to before.
 */
const TEMPLATE_WIDTH_PX = 768;
const MAX_FIT_SCALE = 1.4;

interface DemoResultLayoutProps {
  proposal: Proposal;
  demoType: DemoType;
  scopeTemplateId: ScopeTemplateId;
  previewLabel: string;
  onStartOver: () => void;
  /** The real template component — rendered untouched inside the canvas. */
  children: React.ReactNode;
}

/**
 * Visual shell around the generated proposal (Stitch: "Final Conversion CTA").
 *
 * This is presentation only. The proposal itself is whatever `children` is —
 * i.e. `ModernCorporateTemplate` / `LuxuryEliteTemplate`, rendered exactly as
 * before. Nothing here reads, transforms or duplicates proposal content.
 */
export function DemoResultLayout({
  proposal,
  demoType,
  scopeTemplateId,
  previewLabel,
  onStartOver,
  children,
}: DemoResultLayoutProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [isCompact, setIsCompact] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLElement[]>([]);

  const zoom = ZOOM_LEVELS[zoomIndex];

  // The templates' own responsive variants are viewport-driven, so below `sm`
  // they lay themselves out for a narrow page. Forcing them into the desktop
  // width there would shrink that mobile layout instead of using it.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    const apply = () => setIsCompact(!query.matches);

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // Scale the fixed-width document to whatever the canvas can give it.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const available = viewport.clientWidth;
      if (!available) return;
      setFitScale(Math.min(MAX_FIT_SCALE, available / TEMPLATE_WIDTH_PX));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // Read the rendered template's pages without touching the template itself:
  // both templates render <section> with one direct child per paper page.
  useEffect(() => {
    const templateRoot = canvasRef.current?.querySelector("section");
    const pages = templateRoot
      ? (Array.from(templateRoot.children) as HTMLElement[])
      : [];

    pagesRef.current = pages;
    setPageCount(pages.length);
    setCurrentPage(1);

    if (pages.length < 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const index = pages.indexOf(visible.target as HTMLElement);
        if (index >= 0) setCurrentPage(index + 1);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );

    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [children]);

  const goToPage = useCallback((page: number) => {
    const target = pagesRef.current[page - 1];
    if (!target) return;

    setCurrentPage(page);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openSignupModal = useCallback(() => setModalOpen(true), []);

  return (
    <main className="relative flex-grow pt-0">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-12 md:px-10 lg:flex-row">
        {/* Left: document viewer */}
        <div className="flex flex-col gap-6 lg:w-[65%]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-demo-secondary/20 bg-demo-secondary-container/10 px-3 py-1 text-demo-label-sm text-demo-secondary">
              {previewLabel}
            </span>
            {/* <button
              type="button"
              onClick={openSignupModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-demo-secondary p-3 font-semibold text-demo-on-secondary transition-all hover:opacity-90 active:scale-95"
            >
              <Send className="size-5" />
              Create My Real Proposal
            </button> */}
            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex items-center gap-1.5 rounded-lg border border-demo-outline-variant px-3 py-1.5 text-demo-label-md text-demo-on-surface-variant transition-colors hover:border-demo-primary hover:text-demo-primary"
            >
              <RotateCcw className="size-4" />
              Start over
            </button>
          </div>

          <DemoViewerToolbar
            zoom={zoom}
            onZoomIn={() =>
              setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))
            }
            onZoomOut={() => setZoomIndex((i) => Math.max(0, i - 1))}
            canZoomIn={zoomIndex < ZOOM_LEVELS.length - 1}
            canZoomOut={zoomIndex > 0}
            currentPage={currentPage}
            pageCount={pageCount}
            onPrevPage={() => goToPage(currentPage - 1)}
            onNextPage={() => goToPage(currentPage + 1)}
            onGatedAction={openSignupModal}
          />

          <div className="rounded-3xl bg-demo-surface-container-low p-2 sm:p-6 lg:h-[900px] lg:overflow-y-auto lg:p-8">
            <div ref={viewportRef} className="w-full overflow-x-auto">
              {/* Mirrors features/templates/template-renderer.tsx: fluid on
                  mobile, fixed-width + scaled to fit from `sm` up. */}
              <div
                ref={canvasRef}
                className={isCompact ? "min-w-[320px]" : "mx-auto"}
                style={
                  isCompact
                    ? undefined
                    : { width: TEMPLATE_WIDTH_PX, zoom: fitScale * zoom }
                }
              >
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Right: insights, recipient, actions */}
        <div className="flex flex-col gap-6 lg:w-[35%]">
          <section className="flex flex-col gap-6 rounded-3xl border border-demo-outline-variant/20 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-demo-headline-md text-demo-on-surface">
              Proposal Insights
            </h2>
            <div className="space-y-4">
              {DEMO_INSIGHTS.map((insight) => (
                <div
                  key={insight.title}
                  className="flex items-start gap-3 rounded-xl bg-demo-surface-container-low p-4 transition-all hover:bg-demo-surface-container-high/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check className="size-5 text-green-600" />
                  </span>
                  <div>
                    <h3 className="text-demo-label-md font-bold text-demo-on-surface">
                      {insight.title}
                    </h3>
                    <p className="text-demo-body-sm text-demo-on-surface-variant">
                      {insight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-demo-outline-variant/20 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-demo-label-sm uppercase tracking-wider text-demo-outline">
              Recipient Details
            </h3>
            <dl className="space-y-1">
              <RecipientRow label="Client" value={proposal.client_name} />
              <RecipientRow
                label="Location"
                value={
                  [proposal.service_location, proposal.city]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <RecipientRow label="Email" value={proposal.client_email} />
              <RecipientRow label="Valid for" value="14 days" accent />
            </dl>
          </section>

          <DemoActions onAction={openSignupModal} className="mt-auto" />
        </div>
      </div>

      <section className="w-full px-4 pb-12 md:px-10">
        <DemoCTA demoType={demoType} scopeTemplateId={scopeTemplateId} />
      </section>

      <DemoSignupModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}

function RecipientRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2",
        !accent && "border-b border-demo-outline-variant/10",
      )}
    >
      <dt className="text-demo-label-md text-demo-on-surface-variant">
        {label}
      </dt>
      <dd
        className={cn(
          "truncate text-demo-label-md font-semibold",
          accent ? "text-demo-tertiary" : "text-demo-on-surface",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
