import { Database } from "@/types/database";
import { SubscriptionTier } from "@/types/subscription";

export enum ProposalStatus {
  DRAFT = "draft",
  SENT = "sent",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}
export enum ServiceType {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  CARPET = "carpet",
  WINDOW = "window",
  FLOOR = "floor",
}

export enum DeliveryMethod {
  PDF_ONLY = "pdf_only",
  ONLINE_ONLY = "online_only",
  BOTH = "both",
}

export interface Proposal {
  id: string;
  title: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  status: ProposalStatus;
  service_type: ServiceType;
  value: number;
  created_at: string;
  updated_at: string;
  template_id?: string | null;
}

export interface ProposalPermissions {
  canCreate: boolean;
  canSend: boolean;
  canDownload: boolean;
  isFreeTrial: boolean;
}

export type ProposalTemplate =
  Database["public"]["Tables"]["proposal_templates"]["Row"];

export interface TemplateWithTiers extends ProposalTemplate {
  tiers: SubscriptionTier[];
}

export interface TemplateItem {
  id: string;
  display_name: string;
  description?: string | null;
  preview_image_url?: string | null;
  preview_pdf_url?: string | null;
  sort_order?: number | null;
  tiers: SubscriptionTier[];
  template_data?:
    | Database["public"]["Tables"]["proposal_templates"]["Row"]["template_data"]
    | null;
}

// The shape returned from POST /api/proposals/:id/send
export interface SendProposalApiResponse {
  trackingId?: string;
}

// Structured error body the API returns on failure
export interface SendProposalApiError {
  message?: string;
  error?: string;
  code?: string;
  details?: string;
}
