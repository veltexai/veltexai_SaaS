import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/features/auth/services/get-user';
import { createClient } from '@/lib/supabase/server';
import { userCanAccessTemplate } from '@/lib/templates/design-entitlement';
import { catalogAnalytics, catalogRequestSchema, composeCatalogProposal } from '@/features/service-catalog/proposal';
import { recordFunnelEvents } from '@/lib/analytics/funnel-server';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = await createClient();
    const input = catalogRequestSchema.parse(await request.json());
    if (input.proposalId) {
      const { data: owned, error: ownerError } = await db.from('proposals').select('id').eq('id', input.proposalId).eq('user_id', user.id).single();
      if (ownerError || !owned) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
    }
    const { data, error } = await db.rpc('get_user_usage_info', { user_uuid: user.id }).single();
    if (error) return NextResponse.json({ error: 'Unable to check proposal access.' }, { status: 503 });
    if (!input.proposalId && !(data as { can_create_proposal?: boolean })?.can_create_proposal)
      return NextResponse.json({ error: 'Proposal limit reached. Review your plan.' }, { status: 403 });
    const proposal = composeCatalogProposal(input);
    if (proposal.template_id && !(await userCanAccessTemplate(user.id, proposal.template_id)))
      return NextResponse.json({ error: 'Design not available on your plan.' }, { status: 403 });
    if (!input.job.demo) await recordFunnelEvents([{ eventId: `catalog_generated:${crypto.randomUUID()}`, userId: user.id,
      eventName: input.proposalId ? 'proposal_regenerated' : 'catalog_previewed', properties: catalogAnalytics(proposal) }]);
    return NextResponse.json(proposal);
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : 'Unable to prepare proposal.' }, { status: error instanceof ZodError ? 422 : 500 });
  }
}
