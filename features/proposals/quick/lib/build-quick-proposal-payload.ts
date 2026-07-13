import {
  proposalFormSchema,
  type ProposalFormData,
  type ServiceType,
} from "@/features/proposals/schemas/proposal";
import { getScopeTemplate } from "../constants/scope-templates";
import {
  quickProposalSchema,
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
  pricing_enabled: false;
  facility_details: ProposalFormData["facility_details"];
  traffic_analysis: ProposalFormData["traffic_analysis"];
  service_scope: ProposalFormData["service_scope"];
  special_requirements: ProposalFormData["special_requirements"];
  ai_tone: ProposalFormData["ai_tone"];
  template_id?: string;
  selected_addons?: ProposalFormData["selected_addons"];
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

  return "office";
}

export function buildQuickProposalPayload(
  values: QuickProposalFormData,
  generatedContent = "",
): QuickProposalPayloadResult {
  const quickValidation = quickProposalSchema.safeParse(values);

  if (!quickValidation.success) {
    const fieldErrors: Partial<Record<keyof QuickProposalFormData, string>> = {};

    for (const issue of quickValidation.error.issues) {
      const field = issue.path[0] as keyof QuickProposalFormData | undefined;

      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }

    return {
      success: false,
      error:
        fieldErrors.clientEmail ??
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
  const title = `${clientName || "Client"} ${values.propertyType} Cleaning Proposal`;

  if (!clientPhone) {
    return {
      success: false,
      error:
        "Client phone is required before this draft can match the existing proposal form schema.",
      fieldErrors: {
        clientPhone:
          "Enter the client's phone before saving with the existing proposal form.",
      },
    };
  }

  const payload: ProposalFormData = {
    title,
    service_type: serviceType,
    template_id: values.scopeTemplateId,
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
      property_type: values.propertyType,
      restroom_count: assumptions.restroomCount,
      breakroom_count: assumptions.breakroomCount,
      cleaning_goals: values.cleaningGoals || "",
      notes: values.notes || "",
    },
    pricing_enabled: false,
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
    service_scope: {
      areas_included:
        template?.scopeSections.map((section) => section.title) ?? [],
      areas_excluded: [],
      special_services: values.addOns,
      frequency_details: {},
      area_notes: {},
      special_notes: values.notes || "",
    },
    selected_addons: values.addOns.map((addOn) => ({
      label: addOn,
      frequency: values.serviceFrequency,
    })),
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
        "The draft proposal inputs are incomplete. Please review the form before generation.",
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
): QuickProposalSavePayloadResult {
  if (!generatedContent.trim()) {
    return {
      success: false,
      error: "Generate a proposal preview before saving.",
    };
  }

  return buildQuickProposalPayload(values, generatedContent);
}

export function buildQuickProposalGenerateRequest(
  values: QuickProposalFormData,
): QuickProposalGenerateRequestResult {
  const quickValidation = quickProposalSchema.safeParse(values);

  if (!quickValidation.success) {
    const fieldErrors: Partial<Record<keyof QuickProposalFormData, string>> = {};

    for (const issue of quickValidation.error.issues) {
      const field = issue.path[0] as keyof QuickProposalFormData | undefined;

      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }

    return {
      success: false,
      error:
        fieldErrors.clientEmail ??
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
  const title = `${clientName || "Client"} ${values.propertyType} Cleaning Proposal`;

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
        property_type: values.propertyType,
        restroom_count: assumptions.restroomCount,
        breakroom_count: assumptions.breakroomCount,
        cleaning_goals: values.cleaningGoals || "",
        notes: values.notes || "",
      },
      pricing_enabled: false,
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
      service_scope: {
        areas_included:
          template?.scopeSections.map((section) => section.title) ?? [],
        areas_excluded: [],
        special_services: values.addOns,
        frequency_details: {},
        area_notes: {},
        special_notes: values.notes || "",
      },
      special_requirements: {
        security_clearance: false,
        after_hours_access: true,
        special_equipment: [],
        certifications_required: [],
        insurance_requirements: [],
      },
      ai_tone: "professional",
      template_id: values.scopeTemplateId,
      selected_addons: values.addOns.map((addOn) => ({
        label: addOn,
        frequency: values.serviceFrequency,
      })),
    },
  };
}
