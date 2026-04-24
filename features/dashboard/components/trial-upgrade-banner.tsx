"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavButton } from "@/components/ui/nav-button";

const DISMISS_STORAGE_KEY = "veltex:trial-upgrade-banner:dismissed";

type TrialState = "active" | "ended";

interface TrialUpgradeBannerProps {
  /**
   * Whether the trial is still usable (`active`) or the user has hit the
   * 3-proposal limit / 7-day window (`ended`).
   */
  trialState: TrialState;
  /** Proposals left on the free trial. Only displayed while `trialState === "active"`. */
  remainingProposals: number;
  /** Whole days until the trial ends. Only displayed while `trialState === "active"`. */
  daysRemaining: number;
  /** Destination for the upgrade CTA. */
  upgradeHref?: string;
}

/**
 * Dashboard banner for free-trial users.
 *
 * Two visual modes:
 *   - `active`: amber/friendly — reminds the user they're on a free trial and
 *     shows remaining proposals + days. Dismissible (persisted to localStorage).
 *   - `ended`:  red/urgent — fires when all 3 proposals are used or 7 days
 *     have passed. Non-dismissible; the user must upgrade to continue.
 *
 * Mounted only when the user has ≥ 1 proposal so it never renders alongside
 * the first-login `OnboardingBanner`.
 */
export function TrialUpgradeBanner({
  trialState,
  remainingProposals,
  daysRemaining,
  upgradeHref = "/dashboard/billing",
}: TrialUpgradeBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dismissible = trialState === "active";

  useEffect(() => {
    setMounted(true);
    if (!dismissible) return;
    try {
      setDismissed(
        typeof window !== "undefined" &&
          window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1",
      );
    } catch {
      // localStorage unavailable — show the banner.
    }
  }, [dismissible]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // ignore — state already hides it for this session.
    }
  };

  if (!mounted) return null;
  if (dismissible && dismissed) return null;

  if (trialState === "ended") {
    return (
      <section
        role="region"
        aria-label="Free trial ended"
        className="relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50 p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Free trial ended
            </div>

            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Upgrade to keep creating proposals
            </h2>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              You&apos;ve used all 3 free proposals or your 7-day trial has
              ended. Choose a plan to continue generating, sending, and
              downloading proposals.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <NavButton
                size="lg"
                variant="default"
                href={upgradeHref}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Upgrade Plan
              </NavButton>
              <span className="text-xs text-gray-500">
                Plans start at $19.99/month. Cancel anytime.
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label="Free trial status"
      className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm sm:p-8"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        aria-label="Dismiss upgrade prompt"
        className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            You&apos;re on the free trial
          </div>

          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Upgrade for unlimited access
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Upgrade any time to send and download proposals, save branded
            templates, and remove free-trial limits.
          </p>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
            <div className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" aria-hidden />
              <dt className="sr-only">Proposals remaining</dt>
              <dd>
                <span className="font-semibold">{remainingProposals}</span>{" "}
                proposal{remainingProposals === 1 ? "" : "s"} left
              </dd>
            </div>
            <div className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" aria-hidden />
              <dt className="sr-only">Days remaining</dt>
              <dd>
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-semibold">{daysRemaining}</span> day
                    {daysRemaining === 1 ? "" : "s"} remaining
                  </>
                ) : (
                  "Less than 1 day left"
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <NavButton
              size="lg"
              variant="default"
              href={upgradeHref}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Upgrade Plan
            </NavButton>
            <span className="text-xs text-gray-500">
              Plans start at $19.99/month. Cancel anytime.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
