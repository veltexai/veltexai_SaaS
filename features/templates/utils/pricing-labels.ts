// Single source of truth for the pricing-page labels that assume a recurring
// engagement.
//
// A one-time job (residential deep clean, move-in/move-out, or any proposal
// saved with a one-time frequency) must not be quoted a monthly price or a
// twelve-month term. `resolveAgreementTerms` already says so on the Terms &
// Legal card; these labels keep the Service Quote & Pricing page from
// contradicting it in the same document.
//
// Deliberately dependency-free apart from the pure `isOneTimeFrequency`
// helper, so the public "use client" /demo-proposal bundle can resolve labels
// without dragging anything else in. Mirrors the `payment-terms.ts` pattern.

import { isOneTimeFrequency } from "@/lib/utils/frequency";

export interface PricingLabels {
  /** Pricing-table price column header. */
  priceColumn: string;
  /** Summary row label above the grand total. */
  totalLabel: string;
  /** Value rendered after the "Agreement Term:" label. */
  agreementTerm: string;
}

const RECURRING_LABELS: PricingLabels = {
  priceColumn: "Price/month",
  totalLabel: "Total Monthly Investment:",
  agreementTerm: "12 Months",
};

const ONE_TIME_LABELS: PricingLabels = {
  priceColumn: "Price",
  totalLabel: "Total One-Time Investment:",
  agreementTerm: "One-Time Service",
};

/**
 * Pricing labels for a proposal's service frequency.
 *
 * Anything that isn't recognizably one-time — including a missing frequency —
 * keeps the recurring labels, so an unwired call site renders exactly what it
 * renders today. `isOneTimeFrequency` normalizes case and separators, so
 * "one-time", "one_time" and "One Time" all resolve the same way.
 */
export function resolvePricingLabels(
  serviceFrequency?: string | null,
): PricingLabels {
  return serviceFrequency && isOneTimeFrequency(serviceFrequency)
    ? ONE_TIME_LABELS
    : RECURRING_LABELS;
}
