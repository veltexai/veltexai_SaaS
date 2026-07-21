"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/features/auth/constants";
import type { DemoType } from "../types/demo-proposal";
import type { ScopeTemplateId } from "@/features/proposals/quick";
import { ANALYTICS_EVENTS, captureEvent } from "@/lib/analytics";

const SIGNUP_HREF = AUTH_ROUTES.SIGNUP_FROM_DEMO;

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
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-8 text-center">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        Ready to create your own proposal?
      </h3>
      <p className="text-gray-600 mb-6 max-w-lg mx-auto">
        Sign up free to build real proposals with your company branding, pricing,
        and client details — no credit card required.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={quickProposalHref}>
          <Button
            onClick={() =>
              captureEvent(
                ANALYTICS_EVENTS.CREATE_MY_REAL_PROPOSAL_CLICKED,
                {
                  demo_type: demoType,
                  scope_template_id: scopeTemplateId,
                },
              )
            }
            size="lg"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-8"
          >
            Create My Real Proposal
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href={SIGNUP_HREF}>
          <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
            Start Free Trial
          </Button>
        </Link>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        7-day free trial · 3 proposals · No credit card required
      </p>
    </div>
  );
}

export { SIGNUP_HREF };
