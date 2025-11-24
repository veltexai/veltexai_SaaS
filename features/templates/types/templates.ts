import { Database } from '@/types/database';

export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalTemplateRow =
  Database['public']['Tables']['proposal_templates']['Row'];

export type TemplateType =
  | 'basic'
  | 'executive_premium'
  | 'modern_corporate'
  | 'luxury_elite';

export interface TemplateProps {
  proposal: Proposal;
  template?: ProposalTemplateRow | null;
  branding?: {
    name?: string;
    logo_url?: string | null;
    phone?: string | null;
    website?: string | null;
    email?: string | null;
  };
  pages?: string[];
  print?: boolean;
  extrasRows?: Array<{
    service: string;
    pricePerTime: string | null;
    pricePerMonth: string | null;
  }>;
}

export type Branding = {
  name?: string;
  logo_url?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
};

// Map global template types to acceptance UI variants
export const acceptanceVariantMap: Record<
  TemplateType,
  'modern' | 'classic' | 'minimal' | 'professional'
> = {
  basic: 'minimal',
  modern_corporate: 'modern',
  executive_premium: 'professional',
  luxury_elite: 'classic',
};
