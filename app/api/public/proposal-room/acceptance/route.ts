import { NextRequest, NextResponse } from 'next/server';
import { customerProposalAcceptanceSchema } from '@/features/crm/schemas/customer-action';
import {
  C0_ACTION_TOKEN_HMAC_SECRET_NAME,
  C0_RESPONSE_HEADERS,
  C0_SESSION_COOKIE_NAME,
  customerActionTokenSchema,
  digestCustomerActionValue,
} from '@/lib/crm/customer-action-contract';
import { createServiceClient } from '@/lib/supabase/server';

const UNAVAILABLE = 'Proposal acceptance is unavailable. Request a new link from the sender.';
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/;

export async function POST(request: NextRequest) {
  const rawSession = request.cookies.get(C0_SESSION_COOKIE_NAME)?.value;
  const secret = process.env[C0_ACTION_TOKEN_HMAC_SECRET_NAME];
  const requestKey = request.headers.get('idempotency-key') ?? '';
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = customerProposalAcceptanceSchema.safeParse(body);
  if (!secret || !customerActionTokenSchema.safeParse(rawSession).success
      || !KEY.test(requestKey) || !parsed.success) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: C0_RESPONSE_HEADERS });
  }
  try {
    const value = parsed.data;
    const { data, error } = await (createServiceClient() as any).rpc(
      'command_crm_accept_proposal_version_internal', {
        p_session_hmac_sha256: digestCustomerActionValue(rawSession!, secret, 'session'),
        p_selected_association_ids: value.selectedAssociationIds,
        p_signer_entered_name: value.signerEnteredName,
        p_signer_entered_email: value.signerEnteredEmail,
        p_request_key: requestKey,
      },
    );
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result) throw new Error('unavailable');
    return NextResponse.json({ data: result }, { status: result.replayed ? 200 : 201,
      headers: C0_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: C0_RESPONSE_HEADERS });
  }
}
