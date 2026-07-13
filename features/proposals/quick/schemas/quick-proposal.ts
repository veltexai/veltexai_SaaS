import { z } from "zod";
import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import {
  serviceFrequencySchema,
  type ServiceFrequency,
} from "@/features/proposals/schemas/proposal";
import {
  DEFAULT_SCOPE_TEMPLATE_ID,
  getScopeTemplate,
  isScopeTemplateId,
  type ScopeTemplate,
  type ScopeTemplateId,
} from "../constants/scope-templates";

export const QUICK_SERVICE_FREQUENCY_OPTIONS = [
  "one-time",
  "1x-month",
  "bi-weekly",
  "weekly",
  "2x-week",
  "3x-week",
  "5x-week",
  "daily",
] as const satisfies readonly ServiceFrequency[];

export const quickProposalSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z
    .string()
    .email("Client email is required before generation"),
  clientPhone: z.string().optional(),
  companyName: z.string().optional(),
  serviceLocation: z.string().min(1, "Service location is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2, "Use 2 letters"),
  propertyType: z.string().min(1, "Property type is required"),
  squareFootage: z.coerce.number().min(1, "Square footage is required"),
  serviceFrequency: serviceFrequencySchema,
  scopeTemplateId: z.custom<ScopeTemplateId>((value) =>
    typeof value === "string" ? isScopeTemplateId(value) : false,
  ),
  addOns: z.array(z.string()).default([]),
  notes: z.string().default(""),
  trafficLevel: z.enum(["light", "medium", "heavy"]).optional(),
  restroomCount: z.coerce.number().min(0).optional(),
  breakroomCount: z.coerce.number().min(0).optional(),
  cleaningGoals: z.string().optional(),
});

export type QuickProposalFormData = z.infer<typeof quickProposalSchema>;

export interface QuickProposalDefaultContext {
  demoType?: DemoType | string;
  scopeTemplateId?: string;
  template?: ScopeTemplate;
}

interface QuickDemoDefault {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName?: string;
  propertyType: string;
  squareFootage: number;
  serviceFrequency: ServiceFrequency;
  location: string;
  restroomCount?: number;
  breakroomCount?: number;
  notes: string;
}

const QUICK_DEMO_DEFAULTS: Partial<Record<DemoType, QuickDemoDefault>> = {
  commercial: {
    clientName: "Evergreen Professional Offices",
    clientEmail: "",
    clientPhone: "",
    companyName: "Evergreen Professional Offices",
    propertyType: "Commercial Office",
    squareFootage: 12000,
    serviceFrequency: "5x-week",
    location: "Seattle, WA",
    restroomCount: 4,
    breakroomCount: 1,
    notes:
      "Started from the commercial demo proposal. Confirm access, supplies, and final scope before generation.",
  },
  residential: {
    clientName: "Maple Ridge Residence",
    clientEmail: "",
    clientPhone: "",
    propertyType: "Move-Out/Turnover",
    squareFootage: 2800,
    serviceFrequency: "one-time",
    location: "Tacoma, WA",
    restroomCount: 3,
    notes:
      "Started from the residential demo proposal. Confirm access, supplies, and final scope before generation.",
  },
};

function splitDemoLocation(location?: string) {
  if (!location) {
    return { city: "", state: "" };
  }

  const [city = "", state = ""] = location
    .split(",")
    .map((part) => part.trim());

  return {
    city,
    state: state.slice(0, 2).toUpperCase(),
  };
}

function getDemoDefaults(demoType?: DemoType | string) {
  if (demoType === "commercial" || demoType === "residential") {
    return QUICK_DEMO_DEFAULTS[demoType];
  }

  return undefined;
}

export function getQuickProposalDefaults({
  demoType,
  scopeTemplateId,
  template,
}: QuickProposalDefaultContext): QuickProposalFormData {
  const selectedTemplate =
    template ??
    getScopeTemplate(scopeTemplateId) ??
    getScopeTemplate(DEFAULT_SCOPE_TEMPLATE_ID)!;
  const demoDefaults = getDemoDefaults(demoType);
  const location = splitDemoLocation(demoDefaults?.location);

  return {
    clientName: demoDefaults?.clientName ?? "",
    clientEmail: demoDefaults?.clientEmail ?? "",
    clientPhone: demoDefaults?.clientPhone ?? "",
    companyName: demoDefaults?.companyName ?? "",
    serviceLocation: demoDefaults?.location ?? "",
    city: location.city,
    state: location.state,
    propertyType: demoDefaults?.propertyType ?? selectedTemplate.propertyType,
    squareFootage: demoDefaults?.squareFootage ?? 5000,
    serviceFrequency:
      demoDefaults?.serviceFrequency ?? selectedTemplate.recommendedFrequency,
    scopeTemplateId: selectedTemplate.id,
    addOns: selectedTemplate.commonAddOns.slice(0, 2),
    notes: demoDefaults?.notes ?? "",
    trafficLevel:
      selectedTemplate.id === "gym_fitness" ||
      selectedTemplate.id === "retail" ||
      selectedTemplate.id === "school_daycare"
        ? "heavy"
        : "medium",
    restroomCount: demoDefaults?.restroomCount,
    breakroomCount: demoDefaults?.breakroomCount,
    cleaningGoals: "",
  };
}

export function isSupportedQuickFrequency(frequency: string) {
  return QUICK_SERVICE_FREQUENCY_OPTIONS.includes(
    frequency as (typeof QUICK_SERVICE_FREQUENCY_OPTIONS)[number],
  );
}
