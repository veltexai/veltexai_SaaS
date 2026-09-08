/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

// The dashboard surfaces (new-proposal preview, saved-proposal Edit tab) render
// generated markdown through MarkdownRenderer rather than through the branded
// ServiceQuotePricing component. Both paths must agree on one-time labels.
const CONTENT = [
  "## Service Quote & Pricing",
  "",
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

const renderMd = (serviceFrequency?: string | null) =>
  render(
    <MarkdownRenderer content={CONTENT} serviceFrequency={serviceFrequency} />,
  ).container.textContent ?? "";

describe("MarkdownRenderer pricing table", () => {
  it("drops the monthly price column on a one-time proposal", () => {
    const text = renderMd("one-time");

    expect(text).not.toMatch(/Price\/month/i);
    expect(text).toContain("Price");
    // The generator emits the "One-time" label, not the underscore form.
    expect(text).toContain("One time");
  });

  it("keeps the monthly price column on a recurring proposal", () => {
    expect(renderMd("bi-weekly")).toContain("Price/month");
  });

  it("defaults to the monthly column when no frequency is supplied", () => {
    expect(renderMd(undefined)).toContain("Price/month");
  });
});
