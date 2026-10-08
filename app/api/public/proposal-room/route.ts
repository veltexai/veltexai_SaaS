import { NextRequest, NextResponse } from 'next/server';
import {
  C0_ACTION_TOKEN_HMAC_SECRET_NAME,
  C0_RESPONSE_HEADERS,
  C0_SESSION_COOKIE_NAME,
  customerActionTokenSchema,
  digestCustomerActionValue,
} from '@/lib/crm/customer-action-contract';
import { createServiceClient } from '@/lib/supabase/server';

const UNAVAILABLE = 'This proposal room is unavailable. Request a new link from the sender.';

export async function GET(request: NextRequest) {
  const rawSession = request.cookies.get(C0_SESSION_COOKIE_NAME)?.value;
  const secret = process.env[C0_ACTION_TOKEN_HMAC_SECRET_NAME];
  if (!secret || !customerActionTokenSchema.safeParse(rawSession).success) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: C0_RESPONSE_HEADERS });
  }
  try {
    const { data, error } = await (createServiceClient() as any).rpc(
      'read_crm_customer_proposal_room_internal', {
        p_session_hmac_sha256: digestCustomerActionValue(rawSession!, secret, 'session'),
      },
    );
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result) throw new Error('unavailable');
    return NextResponse.json({ data: result }, { headers: C0_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: C0_RESPONSE_HEADERS });
  }
}
