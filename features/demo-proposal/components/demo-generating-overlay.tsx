"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Image from "next/image";

const GENERATION_STEPS = [
  "Understanding cleaning type",
  "Building proposal structure",
  "Calculating precision pricing",
  "Generating branded document",
  "Finalizing proposal delivery",
] as const;

interface DemoGeneratingOverlayProps {
  /** Total choreography length; keep in sync with the page's generate timeout. */
  durationMs: number;
}

/**
 * Full-screen "AI is engineering your proposal" state (Stitch screen:
 * "Veltex AI | Generating Your Proposal"). Purely presentational — it renders
 * while the page's existing `isGenerating` flag is true and owns no business
 * logic of its own.
 */
export function DemoGeneratingOverlay({
  durationMs,
}: DemoGeneratingOverlayProps) {
  const [percent, setPercent] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const next = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setPercent(next);

      if (elapsed < durationMs) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [durationMs]);

  const completedSteps = Math.floor(
    (percent / 100) * (GENERATION_STEPS.length + 1),
  );
  const isDone = percent >= 100;

  return (
    <div className="flex flex-grow items-center justify-center px-4 pb-12 pt-24 md:px-10">
      <div
        className={cn(
          "demo-glass relative z-10 w-full max-w-[940px] overflow-hidden rounded-[32px] p-8 transition-all md:p-12",
          isDone && "ring-4 ring-demo-primary/20",
        )}
      >
        {/* Decorative orb */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 opacity-10">
          <div className="size-full rounded-full bg-demo-primary-container blur-[80px]" />
        </div>

        <div className="flex flex-col items-center space-y-8 text-center">
          {/* Sparkle */}
          <div className="demo-animate-glow-pulse relative flex size-24 items-center justify-center">
            <Sparkles
              className="size-16 fill-demo-primary text-demo-primary"
              aria-hidden
            />
            <div className="absolute inset-0 animate-pulse rounded-full bg-demo-primary/20 blur-2xl" />
          </div>

          <div className="space-y-2">
            <h1
              className="text-demo-display-sm tracking-tight text-demo-on-surface"
              aria-live="polite"
            >
              {isDone
                ? "Proposal generated successfully!"
                : "AI is engineering your precision proposal..."}
            </h1>
            <p className="text-demo-body-md text-demo-on-surface-variant">
              {isDone
                ? "Opening your branded document preview..."
                : "Our intelligence engine is optimizing every parameter for maximum conversion."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="w-full space-y-6 pt-4">
              {/* Scanned document illustration */}
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-demo-outline-variant/30 bg-demo-surface-container-lowest/50">
                {/* <div className="flex w-[55%] flex-col gap-2 rounded-lg bg-white p-4 shadow-xl">
                <div className="h-3 w-1/2 rounded-full bg-demo-primary/70" />
                <div className="h-1.5 w-full rounded-full bg-demo-surface-container-highest" />
                <div className="h-1.5 w-5/6 rounded-full bg-demo-surface-container-highest" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="h-6 rounded bg-demo-surface-container" />
                  <div className="h-6 rounded bg-demo-surface-container" />
                </div>
                <div className="mt-1 h-4 w-1/3 self-end rounded bg-demo-primary/30" />
              </div> */}
                <Image
                  src="/images/generating-overlay.jpg"
                  alt="Generating overlay"
                  width={640}
                  height={360}
                  className="w-full h-full object-center"
                />
                <div
                  className="demo-animate-scan pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-demo-primary/10 to-transparent"
                  aria-hidden
                />
              </div>

              {/* Progress */}
              <div className="w-full space-y-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-demo-surface-container-highest">
                  <div
                    className="relative h-full bg-demo-primary transition-[width] duration-150 ease-out"
                    style={{ width: `${percent}%` }}
                  >
                    <div className="demo-progress-shimmer absolute inset-0" />
                  </div>
                </div>
                <div className="flex justify-between text-demo-label-sm text-demo-outline">
                  <span>{percent}%</span>
                  <span>ETA: &lt; 5s</span>
                </div>
              </div>
            </div>

            {/* Status steps */}
            <ul className="grid w-full grid-cols-1 gap-3 pt-4 text-left">
              {GENERATION_STEPS.map((step, index) => {
                const isComplete = index < completedSteps;

                return (
                  <li
                    key={step}
                    className={cn(
                      "flex items-center gap-4 rounded-xl p-3 transition-all duration-500",
                      isComplete
                        ? "bg-demo-surface-container-low opacity-100"
                        : "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isComplete
                          ? "border-demo-primary-container bg-demo-primary-container text-demo-on-primary-container"
                          : "border-demo-outline/30 text-demo-outline",
                      )}
                    >
                      {isComplete ? (
                        <Check className="size-4" strokeWidth={4} />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </span>
                    <span className="text-demo-body-md text-demo-on-surface-variant">
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
