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
  return NextResponse.json({ data });
}
