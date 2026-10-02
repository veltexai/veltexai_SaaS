import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ORG_ID = '11111111-1111-4111-8111-111111111111';
const LEAD_ID = '44444444-4444-4444-8444-444444444444';
const PIPELINE_ID = '55555555-5555-4555-8555-555555555555';

function membershipQuery(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'maybeSingle']) value[method] = jest.fn().mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}

function client(options: { user?: { id: string } | null; role?: string | null; data?: unknown; error?: unknown }) {
  const membership = membershipQuery({ data: options.role ? { role: options.role } : null, error: null });
  const from = jest.fn().mockReturnValue(membership);
  const rpc = jest.fn().mockResolvedValue({ data: options.data ?? null, error: options.error ?? null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({
      data: { user: options.user === undefined ? { id: USER_ID } : options.user }, error: null,
    }) },
    from,
    rpc,
  });
  return { from, rpc };
}

function request(body: unknown, key = 'convert-lead-0001') {
  return new NextRequest('http://local/convert', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(body),
  });
}

const body = { pipelineId: PIPELINE_ID, opportunityName: 'North campus', segment: 'commercial' };
const routeContext = { params: Promise.resolve({ organizationId: ORG_ID, leadId: LEAD_ID }) };

describe('R3-1 lead conversion route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates before CRM access', async () => {
    const state = client({ user: null });
    const { POST } = await import('../leads/[leadId]/convert/route');
    expect((await POST(request(body), routeContext)).status).toBe(401);
    expect(state.from).not.toHaveBeenCalled();
  });

  it('denies viewers and non-members uniformly', async () => {
    const { POST } = await import('../leads/[leadId]/convert/route');
    client({ role: null });
    expect((await POST(request(body), routeContext)).status).toBe(404);
    client({ role: 'viewer' });
    expect((await POST(request(body), routeContext)).status).toBe(404);
  });

  it('requires an idempotency key before conversion', async () => {
    const state = client({ role: 'estimator' });
    const { POST } = await import('../leads/[leadId]/convert/route');
    expect((await POST(request(body, ''), routeContext)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('passes explicit selected records into one atomic RPC', async () => {
    const selectedCustomer = '66666666-6666-4666-8666-666666666666';
    const state = client({
      role: 'estimator',
      data: [{ lead_id: LEAD_ID, customer_id: selectedCustomer, opportunity_id: '77777777-7777-4777-8777-777777777777', replayed: false }],
    });
    const { POST } = await import('../leads/[leadId]/convert/route');
    const response = await POST(request({ ...body, existingCustomerId: selectedCustomer }), routeContext);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('convert_crm_lead', expect.objectContaining({
      p_organization: ORG_ID,
      p_lead: LEAD_ID,
      p_request_key: 'convert-lead-0001',
      p_pipeline: PIPELINE_ID,
      p_existing_customer: selectedCustomer,
    }));
    await expect(response.json()).resolves.toEqual({ data: expect.any(Object), replayed: false });
  });

  it('returns replay state from the database receipt', async () => {
    client({ role: 'owner', data: [{ lead_id: LEAD_ID, replayed: true }] });
    const { POST } = await import('../leads/[leadId]/convert/route');
    const response = await POST(request(body), routeContext);
    await expect(response.json()).resolves.toEqual({ data: expect.any(Object), replayed: true });
  });

  it.each([['42501', 404], ['23514', 422], ['XX000', 503]])(
    'maps database error %s to safe status %s', async (code, status) => {
      client({ role: 'admin', error: { code, message: 'private detail' } });
      const { POST } = await import('../leads/[leadId]/convert/route');
      const response = await POST(request(body), routeContext);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    },
  );
});
