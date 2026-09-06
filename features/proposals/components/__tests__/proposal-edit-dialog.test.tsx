/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ProposalEditDialog } from "../proposal-edit-dialog";

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

jest.mock("@/features/proposals/components/new/service-type-selector", () => ({
  ServiceTypeSelector: () => <div>Service type fields</div>,
}));
jest.mock("@/features/proposals/components/new/global-inputs-section", () => ({
  GlobalInputsSection: () => <div>Client fields</div>,
}));
jest.mock(
  "@/features/proposals/components/new/service-specific-section",
  () => ({ ServiceSpecificSection: () => <div>Service fields</div> }),
);
jest.mock("@/features/proposals/components/new/enhanced-facility-section", () => ({
  EnhancedFacilitySection: () => <div>Facility fields</div>,
}));
jest.mock("@/features/proposals/components/new/pricing-section", () => ({
  PricingSection: () => <div>Editable pricing fields</div>,
}));

type Proposal = ComponentProps<typeof ProposalEditDialog>["proposal"];

const completePricing = {
  price_range: { low: 900, high: 1100 },
  hours_estimate: { min: 12, max: 18 },
  assumptions: {
    labor_rate: 35,
    overhead_percentage: 15,
    margin_percentage: 25,
    production_rate: { min: 50, max: 100 },
  },
};

function createProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "proposal-1",
    user_id: "user-1",
    title: "Office Cleaning Proposal",
    client_name: "Example Client",
    client_email: "client@example.com",
    client_company: "Example Company",
    contact_phone: "555-0100",
    service_location: "100 Main Street",
    facility_size: 5000,
    service_type: "commercial",
    service_frequency: "weekly",
    service_specific_data: { property_type: "office" },
    global_inputs: {},
    pricing_enabled: true,
    pricing_data: null,
    generated_content: "## Service Quote & Pricing\n\nGenerated quote",
    status: "draft",
    facility_details: {},
    traffic_analysis: {},
    service_scope: {},
    special_requirements: {},
    regional_location: null,
    city: null,
    property_type: null,
    pricing_breakdown: null,
    ai_tone: "professional",
    view_count: 0,
    last_viewed_at: null,
    tracking_enabled: true,
    send_options: null,
    template_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderDialog(proposal: Proposal) {
  render(
    <ProposalEditDialog
      proposal={proposal}
      open
      onOpenChange={jest.fn()}
      onProposalUpdated={jest.fn()}
    />,
  );
}

describe("ProposalEditDialog pricing tab", () => {
  it("hides pricing for a Quick Proposal without structured pricing data", () => {
    renderDialog(createProposal());

    expect(screen.queryByRole("tab", { name: "Pricing" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Update the proposal details and service requirements."),
    ).toBeInTheDocument();
  });

  it("keeps pricing available for proposals with complete structured data", () => {
    renderDialog(createProposal({ pricing_data: completePricing }));

    expect(screen.getByRole("tab", { name: "Pricing" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Update the proposal details, service requirements, and pricing.",
      ),
    ).toBeInTheDocument();
  });
});
