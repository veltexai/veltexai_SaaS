import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { quickAddLeadSchema } from '@/features/crm/schemas/lead';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../_shared';

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create')) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }

  const idempotencyKey = requireIdempotencyKey(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'A valid Idempotency-Key header is required.' },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = quickAddLeadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid lead.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: existingByKey, error: keyError } = await context.supabase
    .from('crm_leads')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (keyError) {
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }

  let duplicates: { entity_type: string; entity_id: string; matched_on: string }[] = [];
  if (!existingByKey) {
    const duplicateResult = await context.supabase.rpc('find_crm_duplicate_candidates', {
      target_organization: context.organizationId,
      candidate_email: parsed.data.email ?? null,
      candidate_phone: parsed.data.phone ?? null,
    });
    if (duplicateResult.error || !Array.isArray(duplicateResult.data)) {
      return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
    }
    duplicates = duplicateResult.data;
    if (duplicates.length > 0 && !parsed.data.duplicateDecision) {
      return NextResponse.json(
        {
          error: 'A possible existing contact or lead needs review.',
          duplicateCandidates: duplicates,
        },
        { status: 409 },
      );
    }
  }

  const dedupeHint = duplicates.length === 0
    ? {}
    : {
        decision: parsed.data.duplicateDecision,
        linked_entity_id: parsed.data.linkedEntityId ?? null,
        candidates: duplicates,
      };
  const { data, error } = await context.supabase.rpc('create_crm_manual_lead', {
    p_organization: context.organizationId,
    p_request_key: idempotencyKey,
    p_customer_name: parsed.data.customerName ?? null,
    p_contact_name: parsed.data.contactName ?? null,
    p_email: parsed.data.email ?? null,
    p_phone: parsed.data.phone ?? null,
    p_property_name: parsed.data.propertyName ?? null,
    p_service_location: parsed.data.serviceLocation ?? null,
    p_assigned_to: parsed.data.assignedToUserId ?? context.user.id,
    p_dedupe_hint: dedupeHint,
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    if (error?.code === '42501') {
      return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    }
    if (error?.code === '23514') {
      return NextResponse.json({ error: 'That retry does not match the original lead.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to create lead.' }, { status: 422 });
  }
  return NextResponse.json({
    data: { id: row.lead_id, status: row.lead_status, created_at: row.created_at },
    replayed: row.replayed,
  }, { status: row.replayed ? 200 : 201 });
}
