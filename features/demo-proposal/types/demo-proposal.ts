export type DemoType = "commercial" | "residential";

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
  sections: DemoSection[];
}

export interface DemoCardConfig {
  type: DemoType;
  title: string;
  subtitle: string;
  badge: string;
}
