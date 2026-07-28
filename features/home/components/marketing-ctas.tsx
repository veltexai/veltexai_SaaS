"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/features/auth/constants";
import { cn } from "@/lib/utils/cn";
import { ANALYTICS_EVENTS, captureEvent } from "@/lib/analytics";

type MarketingCTAsVariant = "hero" | "gradient";

interface MarketingCTAsProps {
  variant: MarketingCTAsVariant;
  className?: string;
}

const TRIAL_HREF: Record<MarketingCTAsVariant, string> = {
  hero: "#pricing",
  gradient: AUTH_ROUTES.LOGIN,
};

export function MarketingCTAs({ variant, className }: MarketingCTAsProps) {
  const isGradient = variant === "gradient";

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-4 justify-center items-center",
        className,
      )}
    >
      <Link href={TRIAL_HREF[variant]}>
        <Button
          onClick={() =>
            captureEvent(ANALYTICS_EVENTS.LANDING_CTA_CLICKED, {
              placement: variant,
              destination: variant === "hero" ? "pricing" : "login",
            })
          }
          size="lg"
          className={cn(
            "text-lg px-8 py-3",
            isGradient
              ? "bg-white text-blue-600 hover:bg-gray-100"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          Start Free Trial
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
      <Link href="/demo-proposal">
        <Button
          onClick={() =>
            captureEvent(ANALYTICS_EVENTS.LANDING_CTA_CLICKED, {
              placement: variant,
              destination: "demo",
            })
          }
          size="lg"
          variant="outline"
          className={cn(
            "text-lg px-8 py-3",
            isGradient
              ? "border-white/60 bg-transparent text-white hover:bg-white/10"
              : "border-gray-300",
          )}
        >
          Try a Demo Proposal
        </Button>
      </Link>
    </div>
  );
}
