import { getPrintPageData } from '@/features/templates/services/print-data-service';
import { CanonicalPrintDocument } from '@/features/templates/components/canonical-print-document';
import { createClient } from '@/lib/supabase/server';
import { canUsePaidProposalActions } from '@/lib/billing/proposal-entitlements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PrintProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await canUsePaidProposalActions(supabase, user.id))) {
    return <div>Not authorized</div>;
  }
  const { proposal, branding, colors, pages, extrasRows, showPoweredBy } =
    await getPrintPageData(supabase, id);

  if (!proposal || proposal.user_id !== user.id) {
    return <div>Proposal not found</div>;
  }

  return (
    <CanonicalPrintDocument
      proposal={proposal}
      branding={branding}
      colors={colors}
      pages={pages}
      extrasRows={extrasRows}
      showPoweredBy={showPoweredBy}
    />
  );
}
