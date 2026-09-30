import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { CanonicalPrintDocument } from '@/features/templates/components/canonical-print-document';
import { getPrintPages } from '@/features/templates/services/print-data-service';
import { TRACKED_PRINT_COOKIE } from '@/features/proposals/services/pdf/playwright-generator';
import {
  normalizeTrackedColor,
  normalizeTrackedExtras,
} from '@/features/templates/utils/tracked-print';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_COLORS = {
  primary: '#1e3a8a',
  secondary: '#0ea5e9',
  accent: '#1f2937',
};

export default async function TrackedPrintProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = (await cookies()).get(TRACKED_PRINT_COOKIE)?.value;
  if (!token || token.length < 20) return <div>Not authorized</div>;

  const supabase = await createClient();
  const [{ data, error }, { data: hasPaidAccess }] = await Promise.all([
    supabase.rpc('read_tracked_proposal_print', { token }),
    supabase.rpc('tracked_proposal_has_paid_access', { token }),
  ]);
  const payload = data as {
    proposal?: any;
    tracking?: { proposal_id?: string };
  } | null;

  if (
    error ||
    !hasPaidAccess ||
    payload?.tracking?.proposal_id !== id ||
    !payload.proposal
  ) {
    return <div>Proposal not found</div>;
  }

  const proposal = payload.proposal;
  const company = proposal.company_profiles ?? {};
  const extrasRows = normalizeTrackedExtras(proposal.additional_services);
  const projectedColors = company.colors ?? {};
  const colors = {
    primary: normalizeTrackedColor(projectedColors.primary, DEFAULT_COLORS.primary),
    secondary: normalizeTrackedColor(
      projectedColors.secondary,
      DEFAULT_COLORS.secondary
    ),
    accent: normalizeTrackedColor(projectedColors.accent, DEFAULT_COLORS.accent),
  };
  const branding = {
    name: company.company_name || 'Cleaning company',
    logo_url: company.logo_url || null,
    phone: company.phone || null,
    website: company.website || null,
    email: company.email || null,
  };

  return (
    <CanonicalPrintDocument
      proposal={proposal}
      branding={branding}
      colors={colors}
      pages={getPrintPages(proposal)}
      extrasRows={extrasRows}
      showPoweredBy={company.show_powered_by ?? true}
    />
  );
}
