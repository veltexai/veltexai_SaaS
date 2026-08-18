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
    expect(result.payload.pricing_enabled).toBe(true);
    expect(result.payload.generated_content).toBe("");
    expect(result.payload.status).toBe("draft");
  });

  it("keeps the client name out of the saved title", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientName = "Zorbelda Quintwhistle";
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const saved = buildQuickProposalSavePayload(values, "## Content");
    expect(saved.success).toBe(true);
    if (!saved.success) return;

    expect(saved.payload.title).toBe(`${values.propertyType} Cleaning Proposal`);
    expect(saved.payload.title).not.toContain("Zorbelda");
    // The name still belongs on the record itself, just not in the heading.
    expect(saved.payload.global_inputs.client_name).toBe(
      "Zorbelda Quintwhistle",
    );
  });

  it("saves the same title the flow previewed before generating", () => {
    const values = getQuickProposalDefaults({
      demoType: "residential",
      template: getScopeTemplate("move_out_turnover")!,
    });
    values.clientName = "Zorbelda Quintwhistle";
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const generate = buildQuickProposalGenerateRequest(values);
    const saved = buildQuickProposalSavePayload(values, "## Content");

    expect(generate.success).toBe(true);
    expect(saved.success).toBe(true);
    if (!generate.success || !saved.success) return;

    expect(saved.payload.title).toBe(generate.payload.title);
  });

  it("sends per-area frequencies and scope-template task notes", () => {
    const template = getScopeTemplate("commercial_office")!;
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalSavePayload(values, "## Content");

    expect(result.success).toBe(true);
    if (!result.success) return;

    const areas = template.scopeSections.map((section) => section.title);
    const { areas_included, frequency_details, area_notes } =
      result.payload.service_scope;

    expect(areas_included).toEqual(areas);

    // 5x-week maps to the per-area frequency value the generate route expects.
    for (const area of areas) {
      expect(frequency_details[area]).toBe("5x_weekly");
      expect(area_notes[area]).toBe(
        template.scopeSections
          .find((section) => section.title === area)!
          .tasks.join(" "),
      );
    }
  });

  it("never sends the scope template slug as template_id (UUID FK column)", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const saveResult = buildQuickProposalSavePayload(values, "## Content");
    const generateResult = buildQuickProposalGenerateRequest(values);

    expect(saveResult.success).toBe(true);
    if (!saveResult.success) return;
    expect(saveResult.payload.template_id).toBeUndefined();
    expect(saveResult.payload.service_specific_data.scope_template_id).toBe(
      "commercial_office",
    );

    expect(generateResult.success).toBe(true);
    if (!generateResult.success) return;
    expect(generateResult.payload).not.toHaveProperty("template_id");
    expect(
      generateResult.payload.service_specific_data.scope_template_id,
    ).toBe("commercial_office");
  });

  it("uses a provided design template UUID as template_id in both payloads", () => {
    const designTemplateId = "3f2b6c1a-9d4e-4b7a-8c5d-1e2f3a4b5c6d";
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const saveResult = buildQuickProposalSavePayload(
      values,
      "## Content",
      designTemplateId,
    );
    const generateResult = buildQuickProposalGenerateRequest(
      values,
      designTemplateId,
    );

    expect(saveResult.success).toBe(true);
    if (!saveResult.success) return;
    expect(saveResult.payload.template_id).toBe(designTemplateId);
    expect(saveResult.payload.service_specific_data.scope_template_id).toBe(
      "commercial_office",
    );

    expect(generateResult.success).toBe(true);
    if (!generateResult.success) return;
    expect(generateResult.payload.template_id).toBe(designTemplateId);
  });

  it("does not send selected_addons in the save payload (catalog-only table)", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalSavePayload(values, "## Content");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.payload.selected_addons).toBeUndefined();
    expect(result.payload.service_scope.special_services).toEqual(
      values.addOns,
    );
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
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalGenerateRequest(values);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.payload.client_email).toBe("real-client@example.com");
    expect(result.payload.client_email).not.toBe(
      "pending-client@example.com",
    );
    expect(result.payload.contact_phone).toBe("(555) 123-4567");
    expect(result.payload.contact_phone).not.toBe("Not provided");
  });

  it("fails generation when client phone is missing", () => {
    const values = getQuickProposalDefaults({
      demoType: "commercial",
      template: getScopeTemplate("commercial_office")!,
    });
    values.clientEmail = "client@example.com";

    const result = buildQuickProposalGenerateRequest(values);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toContain("Client phone is required");
    expect(result.fieldErrors?.clientPhone).toBeDefined();
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

  it("returns an explicit phone error when phone is missing at save", () => {
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

    expect(result.error).toContain("Client phone is required");
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
    values.clientPhone = "(555) 123-4567";

    const result = buildQuickProposalGenerateRequest(values);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.payload.client_name).toBe("Evergreen Professional Offices");
    expect(result.payload.client_email).toBe("client@example.com");
    expect(result.payload.pricing_enabled).toBe(true);
    expect(result.payload).not.toHaveProperty("generated_content");
    expect(result.payload).not.toHaveProperty("status");
    // Quick add-ons have no catalog sku/rate/qty, so they must stay out of the
    // generated pricing table.
    expect(result.payload).not.toHaveProperty("selected_addons");
    expect(result.payload.service_scope.special_services).toEqual(
      values.addOns,
    );
  });

  it("does not expose unsupported quick frequency values", () => {
    expect(
      QUICK_SERVICE_FREQUENCY_OPTIONS.some(
        (frequency) => (frequency as string) === "6x-week",
      ),
    ).toBe(false);
  });
});
