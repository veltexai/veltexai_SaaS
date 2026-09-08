/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import ServiceQuotePricing from "../components/sections/service-quote-pricing";
import { resolvePaymentTerms } from "../utils/payment-terms";

// The pricing block the generate route emits for a residential proposal:
// note `frequency: "One-time"` (hyphen, title case) — the label produced by
// `getServiceFrequencyLabel`, not the underscore form.
const CONTENT = [
  "```veliz_pricing_table",
  JSON.stringify({
    rows: [
      {
        service: "Residential Cleaning Service",
        frequency: "One-time",
        pricePerMonth: "$640.00",
      },
    ],
    summary: { subtotal: "$640.00", tax: "$0.00", total: "$640.00" },
  }),
  "```",
].join("\n");

const RESIDENTIAL_TERMS = resolvePaymentTerms({ service_type: "residential" });
const COMMERCIAL_TERMS = resolvePaymentTerms({ service_type: "commercial" });

function renderPricing(serviceFrequency: string | null | undefined, terms = RESIDENTIAL_TERMS) {
  return render(
    <ServiceQuotePricing
      title="Service Quote & Pricing"
      content={CONTENT}
      templateType="luxury_elite"
      paymentTerms={terms}
      serviceFrequency={serviceFrequency}
    />,
  ).container.textContent ?? "";
}

describe("ServiceQuotePricing — one-time proposals", () => {
  it("shows no recurring pricing language for a one-time residential proposal", () => {
    const text = renderPricing("one-time");

    // The four strings reported by the client.
    expect(text).not.toMatch(/Price\/month/i);
    expect(text).not.toMatch(/Total Monthly Investment/i);
    expect(text).not.toMatch(/Agreement Term:\s*12\s*Months/i);
    expect(text).not.toMatch(/Recurring Monthly/i);

    // …and nothing else that implies a recurring commitment.
    expect(text).not.toMatch(/monthly/i);
    expect(text).not.toMatch(/12 months/i);

    expect(text).toContain("Agreement Term:");
    expect(text).toContain("One-Time Service");
    expect(text).toContain("Total One-Time Investment:");
    expect(text).toContain("Due Upon Completion");
  });

  it("renders the generator's 'One-time' frequency label as a one-time row", () => {
    // Regression guard: the old `=== "one_time"` check never matched the
    // "One-time" label the generate route actually emits.
    expect(renderPricing("one-time")).toContain("One time");
  });

  it("keeps recurring language for a recurring residential proposal", () => {
    const text = renderPricing("bi-weekly");

    expect(text).toContain("Price/month");
    expect(text).toContain("Total Monthly Investment:");
    expect(text).toContain("Agreement Term:");
    expect(text).toContain("12 Months");
  });

  it("keeps recurring language for a recurring commercial proposal", () => {
    const text = renderPricing("5x-week", COMMERCIAL_TERMS);

    expect(text).toContain("Price/month");
    expect(text).toContain("Total Monthly Investment:");
    expect(text).toContain("12 Months");
    expect(text).toContain("Net 30");
  });

  it("defaults to recurring labels when no frequency is supplied", () => {
    const text = renderPricing(undefined);

    expect(text).toContain("Price/month");
    expect(text).toContain("Total Monthly Investment:");
    expect(text).toContain("12 Months");
  });
});
