import { Database } from "@/types/database";
import { SubscriptionTier } from "@/types/subscription";

export type ProposalTemplate =
Database['public']['Tables']['proposal_templates']['Row'];

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
      | Database['public']['Tables']['proposal_templates']['Row']['template_data']
      | null;
  }
