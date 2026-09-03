import type { CampaignBrief, ResearchInsight } from "./types";

export const US_BID_SMARTER_CAMPAIGN: CampaignBrief = {
  id: "us-bid-smarter-01",
  name: "US Bid Smarter",
  market: "US",
  trafficMedium: "organic_social",
  audience: "Owners and estimators at US commercial cleaning and janitorial companies",
  objective: "Turn qualified social visitors into calculator users, trial users, and subscribers",
  offer: "bid_calculator",
  destinationUrl: "https://www.veltexai.com/tools/cleaning-bid-calculator",
  approvedDestinationPaths: ["/tools/cleaning-bid-calculator", "/demo-proposal", "/auth/signup"],
  approvedClaimIds: ["claim-labor-burden", "claim-walkthrough", "claim-scope-boundaries", "claim-pricing-vs-proposal", "claim-proposal-workflow", "claim-human-review"],
  approvedClaims: [
    "Veltex AI is built for janitorial companies",
    "Veltex AI structures scope, labor, pricing, and proposal information",
    "The cleaning bid calculator is free to use",
    "A trial can be started without a credit card",
  ],
  prohibitedClaims: ["guaranteed contracts", "guaranteed profit", "guaranteed close rate"],
};

export const LAUNCH_INSIGHTS: ResearchInsight[] = [
  {
    id: "labor-burden", sourceUrl: "https://www.veltexai.com/resources/commercial-cleaning-pricing-guide",
    title: "The hourly wage is not the full labor cost",
    summary: "A sustainable commercial cleaning price should account for labor, payroll burden, overhead, supplies, frequency, and target margin.",
    audienceProblem: "Using wages alone can make a cleaning bid look profitable when the complete labor cost says otherwise.",
    collectedAt: "2026-09-02T00:00:00.000Z", verified: true, claimIds: ["claim-labor-burden"],
  },
  {
    id: "walkthrough", sourceUrl: "https://www.veltexai.com/resources/commercial-cleaning-walkthrough-checklist",
    title: "A stronger proposal starts during the walkthrough",
    summary: "Facility areas, surfaces, traffic, access, service frequency, and customer requirements should be recorded before pricing.",
    audienceProblem: "Missing one operating condition during a walkthrough can create a vague scope or an estimate that is difficult to deliver.",
    collectedAt: "2026-09-02T00:00:00.000Z", verified: true, claimIds: ["claim-walkthrough"],
  },
  {
    id: "scope-boundaries", sourceUrl: "https://www.veltexai.com/resources/janitorial-scope-of-work-template",
    title: "Clear scope boundaries protect both sides",
    summary: "Recurring work, periodic services, options, exclusions, and customer responsibilities should be separated in a commercial cleaning proposal.",
    audienceProblem: "A proposal that says only ‘general cleaning’ leaves the customer and operations team with different expectations.",
    collectedAt: "2026-09-02T00:00:00.000Z", verified: true, claimIds: ["claim-scope-boundaries"],
  },
  {
    id: "pricing-vs-proposal", sourceUrl: "https://www.veltexai.com/solutions",
    title: "Calculating the price and presenting the offer are different jobs",
    summary: "The estimator should review production, labor, frequency, overhead, margin, and risk before creating the customer-facing proposal.",
    audienceProblem: "A polished document cannot repair an estimate built on incomplete assumptions.",
    collectedAt: "2026-09-02T00:00:00.000Z", verified: true, claimIds: ["claim-pricing-vs-proposal"],
  },
  {
    id: "proposal-speed", sourceUrl: "https://www.veltexai.com/",
    title: "Move from job details to a professional proposal",
    summary: "Veltex AI provides one cleaning-specific workflow for entering job details, reviewing AI-assisted pricing, and producing a customer-ready proposal.",
    audienceProblem: "Rebuilding every estimate and proposal across notes, spreadsheets, and documents slows down follow-up after a walkthrough.",
    collectedAt: "2026-09-02T00:00:00.000Z", verified: true, claimIds: ["claim-proposal-workflow"],
  },
  {
    id: "review-before-send", sourceUrl: "https://www.veltexai.com/solutions",
    title: "Software supports—not replaces—the estimator's judgment",
    summary: "Veltex AI structures the inputs and proposal workflow while the cleaning professional reviews the operating assumptions before quoting a customer.",
    audienceProblem: "No calculator or AI tool can see every facility condition, local cost, access restriction, or customer requirement.",
    collectedAt: "2026-09-02T00:00:00.000Z", verified: true, claimIds: ["claim-human-review"],
  },
];
