import type {
  ScopeTemplateId,
} from "@/features/proposals/quick/constants/scope-templates";
import type { ServiceFrequency } from "@/features/proposals/schemas/proposal";

export type DemoType = "commercial" | "residential";

export type ResidentialPackageType =
  | "recurring"
  | "deep-clean"
  | "move-in-out"
  | "premium-detail";

export interface ResidentialPackageConfig {
  type: ResidentialPackageType;
  label: string;
  subtitle: string;
  badge: string;
  priceSummary: string;
}

export interface DemoQuickInputs {
  serviceType: "residential" | "commercial" | "carpet" | "window" | "floor";
  propertyType: string;
  squareFootage: number;
  frequency: ServiceFrequency;
  location: string;
  restrooms?: number;
  breakrooms?: number;
  bedrooms?: number;
  bathrooms?: number;
}

export interface DemoSection {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
  highlight?: string;
}

export interface DemoProposalData {
  type: DemoType;
  clientName: string;
  propertyType: string;
  city: string;
  estimatedSize: string;
  serviceType: string;
  cleaningFrequency: string;
  restrooms?: number;
  breakrooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  samplePriceRange: string;
  scopeTemplateName: string;
  scopeTemplateId?: ScopeTemplateId;
  defaultQuickInputs?: DemoQuickInputs;
  sections: DemoSection[];
}

export interface DemoCardConfig {
  type: DemoType;
  title: string;
  subtitle: string;
  badge: string;
}
