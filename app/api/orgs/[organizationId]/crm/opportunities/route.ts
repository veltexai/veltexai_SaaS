import { NextResponse } from 'next/server';
import { authenticatedCrmContext, crmContextError } from '../_shared';

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { organizationId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);

  const { data, error } = await context.supabase.rpc('read_crm_pipeline_board', {
    target_organization: context.organizationId,
  });
  if (error) {
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  if (!data) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const links = await context.supabase.rpc('read_crm_lead_contact_links', {
    p_organization: context.organizationId,
  });
  if (links.error) {
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const walkthroughs = await context.supabase.rpc('read_crm_walkthroughs', {
    p_organization: context.organizationId,
  });
  if (walkthroughs.error) {
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const board = data as Record<string, unknown>;
  const contacts = new Map((links.data ?? []).map((link: { lead_id: string; contact_id: string }) =>
    [link.lead_id, link.contact_id]));
  const leads = Array.isArray(board.leads) ? board.leads.map((lead) => {
    if (!lead || typeof lead !== 'object') return lead;
    const row = lead as Record<string, unknown>;
    const linked = typeof row.id === 'string' ? contacts.get(row.id) : undefined;
    return linked ? { ...row, existing_contact_id: linked } : row;
  }) : board.leads;
  return NextResponse.json({ data: { ...board, leads, walkthroughs: walkthroughs.data ?? [] } });
}
