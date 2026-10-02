import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { siteWorkPackageSchema } from '@/features/crm/schemas/site-work-package';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../../_shared';

type Context = { params: Promise<{ organizationId: string; opportunityId: string; packageId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PUT(request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId, packageId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned')
      || !UUID.test(opportunityId) || !UUID.test(packageId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = siteWorkPackageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid site work package.', issues: parsed.error.flatten() }, { status: 400 });
  }
  const value = parsed.data;
  const { data, error } = await context.supabase.rpc('save_crm_site_work_package', {
    p_organization: context.organizationId, p_opportunity: opportunityId, p_package: packageId,
    p_property: value.propertyId, p_request_key: key, p_status: value.status,
    p_walkthrough: value.walkthroughId ?? null, p_proposal: value.proposalId ?? null,
    p_loss_reason: value.lossReasonId ?? null, p_expected_updated_at: value.expectedUpdatedAt ?? null,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '40001') return NextResponse.json({ error: 'This package changed. Reload and try again.' }, { status: 409 });
    if (error.code === '23514') return NextResponse.json({ error: 'That package state is unavailable.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ data: result, replayed: result?.replayed === true }, { status: result?.created ? 201 : 200 });
}
