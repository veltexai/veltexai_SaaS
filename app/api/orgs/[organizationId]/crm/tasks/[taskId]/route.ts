import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { taskCommandSchema } from '@/features/crm/schemas/task';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; taskId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { organizationId, taskId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(taskId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = taskCommandSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json(
    { error: 'Invalid task command.', issues: parsed.error.flatten() }, { status: 400 },
  );
  const { data, error } = await context.supabase.rpc('command_crm_task', {
    p_organization: context.organizationId,
    p_task: taskId,
    p_request_key: key,
    p_action: parsed.data.action,
    p_snoozed_until: parsed.data.action === 'snooze' ? parsed.data.snoozedUntil : null,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '23514') return NextResponse.json({ error: 'The task cannot accept that command.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: result, replayed: result.replayed === true });
}
