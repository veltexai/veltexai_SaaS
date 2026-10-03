import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { walkthroughEvidenceSchema } from '@/features/crm/schemas/walkthrough-evidence';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../../../_shared';

type Context = { params: Promise<{
  organizationId: string; opportunityId: string; walkthroughId: string;
}> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId, walkthroughId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned')
      || !UUID.test(opportunityId) || !UUID.test(walkthroughId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = walkthroughEvidenceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid walkthrough evidence.', issues: parsed.error.flatten() }, { status: 400 });
  }
  const { data, error } = await context.supabase.rpc('command_crm_walkthrough_evidence', {
    p_organization: context.organizationId,
    p_opportunity: opportunityId,
    p_walkthrough: walkthroughId,
    p_request_key: key,
    p_expected_updated_at: parsed.data.expectedUpdatedAt,
    p_evidence_notes: parsed.data.notes,
    p_mark_complete: parsed.data.markComplete,
  });
  if (error?.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  if (error?.code === '40001') return NextResponse.json({ error: 'This walkthrough changed. Reload and try again.' }, { status: 409 });
  if (error?.code === '23514') return NextResponse.json({ error: 'That walkthrough evidence change is unavailable.' }, { status: 422 });
  if (error) return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: result, replayed: result.replayed === true });
}

