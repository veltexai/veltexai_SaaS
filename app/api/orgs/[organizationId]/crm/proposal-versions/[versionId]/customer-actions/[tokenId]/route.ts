import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { customerActionRevokeSchema } from '@/features/crm/schemas/customer-action';
import { createServiceClient } from '@/lib/supabase/server';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../../../../_shared';

type Context = {
  params: Promise<{ organizationId: string; versionId: string; tokenId: string }>;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOT_FOUND = 'CRM workspace not found.';
const UNAVAILABLE = 'Customer action links are unavailable. Please try again.';

export async function DELETE(request: NextRequest, { params }: Context) {
  const { organizationId, versionId, tokenId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned')
      || !UUID.test(versionId) || !UUID.test(tokenId)) {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = customerActionRevokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid revocation request.' }, { status: 400 });
  }
  const requestSha256 = createHash('sha256').update(JSON.stringify({
    versionId, tokenId, reason: parsed.data.reason,
  })).digest('hex');
  try {
    const serviceClient = createServiceClient() as any;
    const { data, error } = await serviceClient.rpc(
      'command_crm_revoke_customer_action_token_internal',
      {
        p_actor: context.user.id,
        p_organization: context.organizationId,
        p_proposal_version: versionId,
        p_token: tokenId,
        p_reason: parsed.data.reason,
        p_request_key: key,
        p_request_sha256: requestSha256,
      },
    );
    if (error?.code === '42501') return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That request key was already used differently.' }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || result.token_id !== tokenId) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }
    return NextResponse.json({ data: result, replayed: result.replayed === true });
  } catch {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
