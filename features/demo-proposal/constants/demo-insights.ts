export interface DemoInsight {
  title: string;
  description: string;
}

/**
 * "Proposal Insights" rows on the result screen (Stitch: "Final Conversion
 * CTA"). Static marketing copy — describes what the demo just produced.
 */
export const DEMO_INSIGHTS: DemoInsight[] = [
  {
    title: "AI Generated Scope",
    description:
      "The scope of service was tailored to the property type and cleaning frequency you selected.",
  },
  {
    title: "Professional Precision Pricing",
    description:
      "Line items and totals are laid out the way clients expect to review them.",
  },
  {
    title: "Branded for Your Business",
    description:
      "Your company name, contact details and accent colour are applied throughout the document.",
  },
  {
    title: "Ready to Send",
    description:
      "Terms, commitments and signature blocks are already in place — nothing left to assemble.",
  },
];
