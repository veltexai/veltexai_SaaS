import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { createTaskSchema } from '@/features/crm/schemas/task';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = createTaskSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json(
    { error: 'Invalid task.', issues: parsed.error.flatten() }, { status: 400 },
  );
  const existingQuery = () => context.supabase.from('crm_tasks').select('id,status,title,due_at,snoozed_until')
    .eq('organization_id', context.organizationId).eq('idempotency_key', key).maybeSingle();
  const { data: existing, error: existingError } = await existingQuery();
  if (existingError) return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  if (existing) return NextResponse.json({ data: existing, replayed: true });
  const { data, error } = await context.supabase.from('crm_tasks').insert({
    organization_id: context.organizationId,
    opportunity_id: opportunityId,
    lead_id: null,
    idempotency_key: key,
    title: parsed.data.title,
    due_at: parsed.data.dueAt ?? null,
    timezone: parsed.data.timezone ?? null,
    assignee_user_id: parsed.data.assigneeUserId,
    status: 'open',
    created_from: 'manual',
    created_by: context.user.id,
    updated_by: context.user.id,
  }).select('id,status,title,due_at,snoozed_until').single();
  if (error || !data) {
    if (error?.code === '23505') {
      const replay = await existingQuery();
      if (replay.data) return NextResponse.json({ data: replay.data, replayed: true });
    }
    if (error?.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to create task.' }, { status: 422 });
  }
  return NextResponse.json({ data, replayed: false }, { status: 201 });
}
