import { globalServiceFrequencyToAreaFrequency } from "@/features/proposals/constants/area-frequency";
import {
  proposalFormSchema,
  type ProposalFormData,
  type ServiceType,
} from "@/features/proposals/schemas/proposal";
import {
  getScopeTemplate,
  type ScopeTemplate,
} from "../constants/scope-templates";
import {
  getQuickProposalFieldErrors,
  type QuickProposalFormData,
} from "../schemas/quick-proposal";
import { buildPropertyAssumptionsLite } from "./property-assumptions-lite";

export type QuickProposalPayloadResult =
  | {
      success: true;
      payload: ProposalFormData;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<keyof QuickProposalFormData, string>>;
    };

export type QuickProposalGenerateRequestResult =
  | {
      success: true;
      payload: QuickProposalGenerateRequest;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<keyof QuickProposalFormData, string>>;
    };

export type QuickProposalSavePayloadResult =
  | {
      success: true;
      payload: ProposalFormData;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<keyof QuickProposalFormData, string>>;
    };

export interface QuickProposalGenerateRequest {
  client_name: string;
  client_email: string;
  client_company?: string;
  contact_phone?: string;
  service_location: string;
  regional_location?: string;
  city?: string;
  title: string;
  service_type: ProposalFormData["service_type"];
  service_frequency: ProposalFormData["global_inputs"]["service_frequency"];
  facility_size: number;
  service_specific_data: ProposalFormData["service_specific_data"];
  pricing_data?: ProposalFormData["pricing_data"];
  pricing_enabled: true;
  facility_details: ProposalFormData["facility_details"];
  traffic_analysis: ProposalFormData["traffic_analysis"];
  service_scope: ProposalFormData["service_scope"];
  special_requirements: ProposalFormData["special_requirements"];
  ai_tone: ProposalFormData["ai_tone"];
  /** Real proposal_templates UUID (design template), never the scope slug. */
  template_id?: string;
}

/**
 * Per-area scope rows for the generated table. Sending per-area frequencies is
 * what makes the generate route emit one row per area (instead of a single
 * joined row), and the scope template task lists become the row notes.
 */
function buildQuickServiceScope(
  values: QuickProposalFormData,
  template: ScopeTemplate | null,
): ProposalFormData["service_scope"] {
  const sections = template?.scopeSections ?? [];
  const areaFrequency = globalServiceFrequencyToAreaFrequency(
    values.serviceFrequency,
  );

  return {
    areas_included: sections.map((section) => section.title),
    areas_excluded: [],
    special_services: values.addOns,
    frequency_details: Object.fromEntries(
      sections.map((section) => [section.title, areaFrequency]),
    ),
    area_notes: Object.fromEntries(
      sections.map((section) => [section.title, section.tasks.join(" ")]),
    ),
    special_notes: values.notes || "",
  };
}

function getServiceTypeFromQuickInputs(
  values: QuickProposalFormData,
): ServiceType {
  if (values.scopeTemplateId === "window_cleaning_add_on") {
    return "window";
  }

  if (values.scopeTemplateId === "floor_care_add_on") {
    return "floor";
  }

  if (values.scopeTemplateId === "move_out_turnover") {
    return "residential";
  }

  return "commercial";
}

/**
 * Deliberately excludes the client name: the title is a document heading, not a
 * record label. Shared by the save payload and the generate request so the
 * "Prepared title" shown in the flow is the title that actually gets persisted.
 */
function buildProposalTitle(values: QuickProposalFormData): string {
  return `${values.propertyType} Cleaning Proposal`;
}

function getBuildingType(
  values: QuickProposalFormData,
): NonNullable<ProposalFormData["facility_details"]["building_type"]> {
  const normalized = values.propertyType.toLowerCase();

  if (normalized.includes("medical")) return "medical";
  if (normalized.includes("retail")) return "retail";
  if (normalized.includes("school")) return "educational";
  if (normalized.includes("daycare")) return "daycare";
  if (normalized.includes("apartment")) return "apartment";
  if (normalized.includes("house") || normalized.includes("residential")) {
    return "house";
  }
  if (normalized.includes("move") || normalized.includes("turnover")) {
    return "residential";
  }

  return "office";
}

export function buildQuickProposalPayload(
  values: QuickProposalFormData,
  generatedContent = "",
  designTemplateId?: string,
): QuickProposalPayloadResult {
  const fieldErrors = getQuickProposalFieldErrors(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error:
        fieldErrors.clientEmail ??
        fieldErrors.clientPhone ??
        "Please review the required quick proposal fields before generation.",
      fieldErrors,
    };
  }

  const template = getScopeTemplate(values.scopeTemplateId);
  const assumptions = buildPropertyAssumptionsLite(values);
  const serviceType = getServiceTypeFromQuickInputs(values);
  const clientName = values.clientName.trim();
  const clientEmail = values.clientEmail.trim();
  const clientPhone = values.clientPhone?.trim() ?? "";
  const title = buildProposalTitle(values);

  if (!clientPhone) {
    return {
      success: false,
      error: "Client phone is required to save this proposal.",
      fieldErrors: {
        clientPhone: "Enter the client's phone number before saving.",
      },
    };
  }

  // proposals.template_id is a UUID FK to proposal_templates, so the scope
  // template slug must travel in service_specific_data instead. Only a real
  // design template UUID may be set as template_id.
  const payload: ProposalFormData = {
    title,
    service_type: serviceType,
    ...(designTemplateId ? { template_id: designTemplateId } : {}),
    global_inputs: {
      client_name: clientName || "Client",
      client_email: clientEmail,
      client_company: values.companyName?.trim() || undefined,
      contact_phone: clientPhone,
      service_location: values.serviceLocation,
      facility_size: Number(values.squareFootage),
      service_frequency: values.serviceFrequency,
      regional_location: `${values.city}, ${values.state}`,
      city: values.city,
    },
    service_specific_data: {
      scope_template_id: values.scopeTemplateId,
      property_type: values.propertyType,
      restroom_count: assumptions.restroomCount,
      breakroom_count: assumptions.breakroomCount,
      cleaning_goals: values.cleaningGoals || "",
      notes: values.notes || "",
    },
    // Pricing is enabled so the generated proposal includes the standard
    // "Service Quote & Pricing" section (which also anchors the Notes block).
    // pricing_data stays undefined: the API prices via PricingEngine.
    pricing_enabled: true,
    pricing_data: undefined,
    generated_content: generatedContent,
    status: "draft",
    facility_details: {
      building_type: getBuildingType(values),
      accessibility_requirements: [],
      special_areas: [],
      equipment_present: [],
      environmental_concerns: [],
    },
    traffic_analysis: {
      visitor_frequency:
        assumptions.trafficLevel === "heavy"
          ? "high"
          : assumptions.trafficLevel === "light"
            ? "low"
            : "medium",
      peak_hours: [],
      special_events: false,
      traffic_level: assumptions.trafficLevel,
    },
    service_scope: buildQuickServiceScope(values, template),
    // No selected_addons here: proposal_additional_services requires catalog
    // rows (sku/rate/qty) the quick flow doesn't collect. Add-ons persist in
    // service_scope.special_services instead.
    special_requirements: {
      security_clearance: false,
      after_hours_access: true,
      special_equipment: [],
      certifications_required: [],
      insurance_requirements: [],
    },
    ai_tone: "professional",
  };

  const payloadValidation = proposalFormSchema.safeParse(payload);

  if (!payloadValidation.success) {
    return {
      success: false,
      error:
        "Some proposal inputs are incomplete. Please review the form and try again.",
    };
  }

  return {
    success: true,
    payload,
  };
}

export function buildQuickProposalSavePayload(
  values: QuickProposalFormData,
  generatedContent: string,
  designTemplateId?: string,
): QuickProposalSavePayloadResult {
  if (!generatedContent.trim()) {
    return {
      success: false,
      error: "Generate a proposal preview before saving.",
    };
  }

  return buildQuickProposalPayload(values, generatedContent, designTemplateId);
}

export function buildQuickProposalGenerateRequest(
  values: QuickProposalFormData,
  designTemplateId?: string,
): QuickProposalGenerateRequestResult {
  const fieldErrors = getQuickProposalFieldErrors(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error:
        fieldErrors.clientEmail ??
        fieldErrors.clientPhone ??
        "Please review the required quick proposal fields before generation.",
      fieldErrors,
    };
  }

  const template = getScopeTemplate(values.scopeTemplateId);
  const assumptions = buildPropertyAssumptionsLite(values);
  const clientName = values.clientName.trim();
  const clientEmail = values.clientEmail.trim();
  const clientPhone = values.clientPhone?.trim();
  const serviceType = getServiceTypeFromQuickInputs(values);
  const title = buildProposalTitle(values);

  return {
    success: true,
    payload: {
      client_name: clientName || "Client",
      client_email: clientEmail,
      client_company: values.companyName?.trim() || undefined,
      contact_phone: clientPhone || undefined,
      service_location: values.serviceLocation,
      regional_location: `${values.city}, ${values.state}`,
      city: values.city,
      title,
      service_type: serviceType,
      service_frequency: values.serviceFrequency,
      facility_size: Number(values.squareFootage),
      service_specific_data: {
        scope_template_id: values.scopeTemplateId,
        property_type: values.propertyType,
        restroom_count: assumptions.restroomCount,
        breakroom_count: assumptions.breakroomCount,
        cleaning_goals: values.cleaningGoals || "",
        notes: values.notes || "",
      },
      pricing_enabled: true,
      facility_details: {
        building_type: getBuildingType(values),
        accessibility_requirements: [],
        special_areas: [],
        equipment_present: [],
        environmental_concerns: [],
      },
      traffic_analysis: {
        visitor_frequency:
          assumptions.trafficLevel === "heavy"
            ? "high"
            : assumptions.trafficLevel === "light"
              ? "low"
              : "medium",
        peak_hours: [],
        special_events: false,
        traffic_level: assumptions.trafficLevel,
      },
      service_scope: buildQuickServiceScope(values, template),
      special_requirements: {
        security_clearance: false,
        after_hours_access: true,
        special_equipment: [],
        certifications_required: [],
        insurance_requirements: [],
      },
      ai_tone: "professional",
      ...(designTemplateId ? { template_id: designTemplateId } : {}),
      // No selected_addons: quick add-ons carry no catalog sku/rate/qty, so
      // they would price at $0.00 in the generated pricing table. They reach
      // the prompt through service_scope.special_services instead.
    },
  };
}
