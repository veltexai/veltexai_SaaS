"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  DollarSign,
  Download,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavButton } from "@/components/ui/nav-button";

const DISMISS_STORAGE_KEY = "veltex:onboarding-banner:dismissed";

interface OnboardingBannerProps {
  /** Total number of proposals the user has created. Banner hides when > 0. */
  totalProposals: number;
  /** Destination for the main CTA. Defaults to the new-proposal page. */
  createHref?: string;
  /** Optional user first name to personalize the headline. */
  firstName?: string | null;
}

/**
 * First-login onboarding prompt.
 * Rendered when the user has no proposals yet. Persists dismissal in
 * localStorage so a return visit does not re-show the banner, but always
 * re-appears if a user somehow reaches a zero-proposal state after reset.
 */
export function OnboardingBanner({
  totalProposals,
  createHref = "/dashboard/proposals/new",
  firstName,
}: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(
        typeof window !== "undefined" &&
          window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1",
      );
    } catch {
      // localStorage may be unavailable (private mode / SSR) — show the banner.
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // ignore — state already hides it for this session.
    }
  };

  // if (!mounted) return null;
  // if (totalProposals > 0) return null;
  // if (dismissed) return null;

  const greeting = firstName ? `Welcome, ${firstName}!` : "Welcome!";

  return (
    <section
      role="region"
      aria-label="Getting started"
      className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm sm:p-8"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        aria-label="Dismiss onboarding prompt"
        className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Getting started
          </div>

          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {greeting} Create your first proposal in under 5 minutes
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Just three simple steps stand between you and your first
            professional, ready-to-send proposal.
          </p>

          <ol className="mt-5 space-y-3">
            <OnboardingStep
              index={1}
              icon={<FileText className="h-4 w-4" />}
              title="Enter job details"
              description="Tell us about the site, scope, and frequency."
            />
            <OnboardingStep
              index={2}
              icon={<DollarSign className="h-4 w-4" />}
              title="Generate pricing"
              description="We calculate labor, margin, and add-ons automatically."
            />
            <OnboardingStep
              index={3}
              icon={<Download className="h-4 w-4" />}
              title="Download proposal"
              description="Export as a branded PDF or send directly to your client."
            />
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <NavButton
              size="lg"
              variant="default"
              href={createHref}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Create First Proposal
            </NavButton>
            <span className="text-xs text-gray-500">
              Your free trial includes up to 3 proposals.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface OnboardingStepProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function OnboardingStep({
  index,
  icon,
  title,
  description,
}: OnboardingStepProps) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
        <span className="sr-only">Step {index}:</span>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {index}. {title}
        </p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </li>
  );
}
