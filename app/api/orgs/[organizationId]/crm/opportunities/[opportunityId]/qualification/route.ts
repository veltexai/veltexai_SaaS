import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { qualificationSchema } from '@/features/crm/schemas/qualification';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../_shared';
type Context = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId } = await params; const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  const key = requireIdempotencyKey(request); if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let json: unknown; try { json = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = qualificationSchema.safeParse(json); if (!parsed.success) return NextResponse.json({ error: 'Invalid qualification.', issues: parsed.error.flatten() }, { status: 400 });
  const v = parsed.data; const { data, error } = await context.supabase.rpc('qualify_crm_opportunity', {
    p_organization: context.organizationId, p_opportunity: opportunityId, p_response: v.responseId,
    p_request_key: key, p_checklist_version: 'operator_v1_unvalidated',
    p_answers: { operator_notes: v.operatorNotes }, p_outcome: v.outcome,
    p_specialist_review_flag: v.specialistReview, p_loss_reason: v.lossReasonId ?? null,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '23514') return NextResponse.json({ error: 'The qualification could not be recorded.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ data: result, replayed: result?.replayed === true }, { status: result?.replayed ? 200 : 201 });
}
