"use client";

import { ChevronLeft } from "lucide-react";

interface DemoStepperProps {
  currentStep: number;
  totalSteps: number;
  label: string;
  onBack?: () => void;
}

/**
 * "Step N of M" indicator + progress track. Mirrors the Stitch prototype's
 * step header: the Previous button is hidden on the first step and the fill
 * width is currentStep / totalSteps.
 */
export function DemoStepper({
  currentStep,
  totalSteps,
  label,
  onBack,
}: DemoStepperProps) {
  const progress = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <div className="mx-auto mb-12 max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 rounded-lg border border-demo-outline-variant px-3 py-1.5 text-demo-label-md text-demo-on-surface-variant transition-colors hover:border-demo-primary hover:text-demo-primary"
            >
              <ChevronLeft className="size-5" />
              <span>Previous</span>
            </button>
          )}
          <span className="text-demo-label-md font-bold text-demo-primary">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <span className="text-demo-label-md text-demo-on-surface-variant">
          {label}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-demo-surface-container"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep} of ${totalSteps}: ${label}`}
      >
        <div
          className="h-full rounded-full bg-demo-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
