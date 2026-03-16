import { Database } from "@/types/database";
import { SubscriptionTier } from "@/types/subscription";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

export interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  status: ProposalStatus;
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
