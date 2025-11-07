'use client';

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
  branding?: { name?: string; logo_url?: string | null };
}
