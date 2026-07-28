"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { AUTH_ROUTES } from "@/features/auth/constants";
import type { DemoType } from "../types/demo-proposal";
import type { ScopeTemplateId } from "@/features/proposals/quick";
import { ANALYTICS_EVENTS, captureEvent } from "@/lib/analytics";

const SIGNUP_HREF = AUTH_ROUTES.SIGNUP_FROM_DEMO;

const TRUST_POINTS = [
  "No credit card",
  "Setup in under 3 minutes",
  "Unlimited proposals",
];

interface DemoCTAProps {
  demoType: DemoType;
  scopeTemplateId: ScopeTemplateId;
}

function buildQuickProposalHref(
  demoType: DemoType,
  scopeTemplateId: ScopeTemplateId,
) {
  const params = new URLSearchParams({
    source: "demo",
    demoType,
    scopeTemplateId,
  });

  return `${AUTH_ROUTES.QUICK_PROPOSAL}?${params.toString()}`;
}

export function DemoCTA({ demoType, scopeTemplateId }: DemoCTAProps) {
  const quickProposalHref = buildQuickProposalHref(demoType, scopeTemplateId);

  return (
    <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-r from-demo-primary to-demo-secondary" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-8 p-8 text-center sm:p-12 md:p-16">
        <div className="space-y-4">
          <h2 className="text-demo-display-sm tracking-tight text-demo-on-primary md:text-demo-display-lg">
            Ready to create your own proposal?
          </h2>
          <p className="mx-auto max-w-2xl text-demo-body-lg text-demo-primary-fixed-dim">
            Generate unlimited AI proposals for your cleaning business.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <Link
            href={quickProposalHref}
            onClick={() =>
              captureEvent(ANALYTICS_EVENTS.CREATE_MY_REAL_PROPOSAL_CLICKED, {
                demo_type: demoType,
                scope_template_id: scopeTemplateId,
              })
            }
            className="w-full rounded-2xl bg-white px-8 py-4 text-demo-body-md font-bold text-demo-primary shadow-lg transition-all hover:bg-demo-surface-container-lowest active:scale-95 sm:w-auto"
          >
            Create My Real Proposal
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="w-full rounded-2xl border-2 border-white/30 px-8 py-4 text-demo-body-md font-bold text-white transition-all hover:bg-white/10 active:scale-95 sm:w-auto"
          >
            Start Free Trial
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-4">
          {TRUST_POINTS.map((point) => (
            <div
              key={point}
              className="flex items-center gap-2 text-demo-label-md text-demo-on-primary/80"
            >
              <Check className="size-5" />
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SIGNUP_HREF };
