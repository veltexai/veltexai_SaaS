import { proposalFormSchema } from "@/features/proposals/schemas/proposal";
import {
  buildQuickProposalGenerateRequest,
  buildQuickProposalPayload,
  buildQuickProposalSavePayload,
} from "../lib/build-quick-proposal-payload";
import {
  QUICK_SERVICE_FREQUENCY_OPTIONS,
  getQuickProposalDefaults,
} from "../schemas/quick-proposal";
import { getScopeTemplate } from "../constants/scope-templates";

describe("quick proposal payload adapter", () => {
  it("builds a draft payload that validates against proposalFormSchema", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalPayload(values);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(proposalFormSchema.safeParse(result.payload).success).toBe(true);
    expect(result.payload.global_inputs.client_email).toBe(
      "client@example.com",
    );
    expect(result.payload.global_inputs.contact_phone).toBe("(555) 123-4567");
    expect(result.payload.pricing_enabled).toBe(false);
    expect(result.payload.generated_content).toBe("");
    expect(result.payload.status).toBe("draft");
  });

  it("builds a save payload that includes generated_content", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalSavePayload(
      values,
      "## Generated Proposal\n\nReview-ready content.",
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.payload.generated_content).toBe(
      "## Generated Proposal\n\nReview-ready content.",
    );
    expect(proposalFormSchema.safeParse(result.payload).success).toBe(true);
  });

  it("does not use placeholder email or phone values in generate adapter output", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "real-client@example.com";

    const result = buildQuickProposalGenerateRequest(values);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.payload.client_email).toBe("real-client@example.com");
    expect(result.payload.client_email).not.toBe(
      "pending-client@example.com",
    );
    expect(result.payload.contact_phone).toBeUndefined();
    expect(result.payload.contact_phone).not.toBe("Not provided");
  });

  it("returns an explicit validation error when client email is missing", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });

    const result = buildQuickProposalGenerateRequest(values);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toContain("Client email");
    expect(result.fieldErrors?.clientEmail).toBeDefined();
  });

  it("returns an explicit existing-schema adapter error when phone is missing", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";

    const result = buildQuickProposalSavePayload(
      values,
      "## Generated Proposal",
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toContain("existing proposal form schema");
    expect(result.fieldErrors?.clientPhone).toBeDefined();
  });

  it("requires generated content before building a save payload", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalSavePayload(values, "");

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toContain("Generate a proposal preview");
  });

  it("builds a generate request without pricing or save fields", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";

    const result = buildQuickProposalGenerateRequest(values);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.payload.client_name).toBe("Evergreen Professional Offices");
    expect(result.payload.client_email).toBe("client@example.com");
    expect(result.payload.contact_phone).toBeUndefined();
    expect(result.payload.pricing_enabled).toBe(false);
    expect(result.payload).not.toHaveProperty("generated_content");
    expect(result.payload).not.toHaveProperty("status");
  });

  it("does not expose unsupported quick frequency values", () => {
    expect(
      QUICK_SERVICE_FREQUENCY_OPTIONS.some(
        (frequency) => (frequency as string) === "6x-week",
      ),
    ).toBe(false);
  });
});
