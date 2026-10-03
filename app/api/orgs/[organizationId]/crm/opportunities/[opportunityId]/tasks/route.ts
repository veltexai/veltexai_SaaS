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
  const { data, error } = await context.supabase.rpc('create_crm_opportunity_task', {
    p_organization: context.organizationId,
    p_opportunity: opportunityId,
    p_request_key: key,
    p_title: parsed.data.title,
    p_due_at: parsed.data.dueAt ?? null,
    p_timezone: parsed.data.timezone ?? null,
    p_assignee: parsed.data.assigneeUserId,
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    if (error?.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error?.code === '23514') {
      return NextResponse.json({ error: 'That retry does not match the original task.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to create task.' }, { status: 422 });
  }
  return NextResponse.json({
    data: {
      id: row.task_id,
      status: row.task_status,
      title: row.title,
      due_at: row.due_at,
      snoozed_until: row.snoozed_until,
    },
    replayed: row.replayed,
  }, { status: row.replayed ? 200 : 201 });
}
