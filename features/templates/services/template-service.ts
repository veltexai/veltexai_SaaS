import { createClient } from '@/lib/supabase/server';
import type {
  ProposalTemplateRow,
  Proposal,
  Branding,
} from '@/features/templates/types/templates';

export async function getTemplateById(
  templateId?: string | null
): Promise<ProposalTemplateRow | null> {
  if (!templateId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  if (error) throw new Error(error.message || 'Failed to fetch template');
  return (data as ProposalTemplateRow) ?? null;
}

export async function getBrandingByUserId(userId: string): Promise<Branding> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('company_name, full_name, logo_url, phone, website, email')
    .eq('id', userId)
    .single();
  if (error) {
    console.warn('Branding fetch failed:', error?.message ?? error);
    return {};
  }
  const name =
    (data?.company_name as string | undefined) ??
    (data?.full_name as string | undefined);
  return {
    name,
    logo_url: (data?.logo_url as string | null) ?? null,
    phone: (data?.phone as string | null) ?? null,
    website: (data?.website as string | null) ?? null,
    email: (data?.email as string | null) ?? null,
  };
}

export async function loadTemplateData(proposal: Proposal) {
  const [templateRow, branding] = await Promise.all([
    getTemplateById(proposal.template_id),
    getBrandingByUserId(proposal.user_id),
  ]);
  return { templateRow, branding } as const;
}
