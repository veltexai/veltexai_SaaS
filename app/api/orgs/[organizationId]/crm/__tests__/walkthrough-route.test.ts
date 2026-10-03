import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const OPPORTUNITY_ID = '44444444-4444-4444-8444-444444444444';
const PROPERTY_ID = '55555555-5555-4555-8555-555555555555';
const WALKTHROUGH_ID = '66666666-6666-4666-8666-666666666666';

function query(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'maybeSingle']) value[method] = jest.fn().mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}
function client(options: { user?: { id: string } | null; role?: string | null; data?: unknown; error?: unknown }) {
  const membership = query({ data: options.role ? { role: options.role } : null, error: null });
  const from = jest.fn().mockReturnValue(membership);
  const rpc = jest.fn().mockResolvedValue({ data: options.data ?? null, error: options.error ?? null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: options.user === undefined ? { id: USER_ID } : options.user }, error: null }) },
    from, rpc,
  });
  return { from, rpc };
}
const body = {
  propertyId: PROPERTY_ID,
  estimatorUserId: USER_ID,
  windowStart: '2026-10-02T17:00:00.000Z',
  windowEnd: '2026-10-02T18:00:00.000Z',
  timezone: 'America/Los_Angeles',
};
function request(payload: unknown = body, key = 'walkthrough-0001') {
  return new NextRequest('http://local/walkthroughs', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(payload),
  });
}
const context = { params: Promise.resolve({ organizationId: ORG_ID, opportunityId: OPPORTUNITY_ID }) };
const commandContext = { params: Promise.resolve({ organizationId: ORG_ID,
  opportunityId: OPPORTUNITY_ID, walkthroughId: WALKTHROUGH_ID }) };

describe('R3-1 walkthrough scheduling route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates before CRM access and denies viewers', async () => {
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/route');
    const state = client({ user: null });
    expect((await POST(request(), context)).status).toBe(401);
    expect(state.from).not.toHaveBeenCalled();
    client({ role: 'viewer' });
    expect((await POST(request(), context)).status).toBe(404);
  });

  it('validates the time window and idempotency key before the RPC', async () => {
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/route');
    let state = client({ role: 'estimator' });
    expect((await POST(request(body, ''), context)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
    state = client({ role: 'estimator' });
    expect((await POST(request({ ...body, windowEnd: body.windowStart }), context)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('binds all scheduling inputs to one database RPC', async () => {
    const state = client({ role: 'estimator', data: [{ walkthrough_id: '66666666-6666-4666-8666-666666666666', replayed: false }] });
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/route');
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('schedule_crm_walkthrough', expect.objectContaining({
      p_organization: ORG_ID, p_opportunity: OPPORTUNITY_ID, p_property: PROPERTY_ID,
      p_estimator: USER_ID, p_request_key: 'walkthrough-0001', p_timezone: 'America/Los_Angeles',
    }));
  });

  it.each([['42501', 404], ['23P01', 409], ['23514', 422], ['XX000', 503]])(
    'maps %s to a safe response %s', async (code, status) => {
      client({ role: 'admin', error: { code, message: 'private detail' } });
      const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/route');
      const response = await POST(request(), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    },
  );

  it('reschedules with optimistic concurrency and a retry key', async () => {
    const state = client({ role: 'estimator', data: [{ walkthrough_id: WALKTHROUGH_ID,
      walkthrough_status: 'rescheduled', updated_at: '2026-10-02T19:00:00Z', replayed: false }] });
    const { PATCH } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/route');
    const response = await PATCH(new NextRequest('http://local/walkthroughs/id', {
      method: 'PATCH', headers: { 'content-type': 'application/json', 'idempotency-key': 'reschedule-0001' },
      body: JSON.stringify({ windowStart: body.windowStart, windowEnd: body.windowEnd,
        timezone: body.timezone, expectedUpdatedAt: '2026-10-02T16:00:00.000Z' }),
    }), commandContext);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('command_crm_walkthrough', expect.objectContaining({
      p_walkthrough: WALKTHROUGH_ID, p_action: 'reschedule',
      p_expected_updated_at: '2026-10-02T16:00:00.000Z', p_request_key: 'reschedule-0001',
    }));
  });

  it('cancels without accepting a replacement window', async () => {
    const state = client({ role: 'admin', data: [{ walkthrough_id: WALKTHROUGH_ID,
      walkthrough_status: 'cancelled', updated_at: '2026-10-02T19:00:00Z', replayed: false }] });
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/cancel/route');
    const response = await POST(new NextRequest('http://local/walkthroughs/id/cancel', {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'cancel-walkthrough-1' },
      body: JSON.stringify({ expectedUpdatedAt: '2026-10-02T16:00:00.000Z' }),
    }), commandContext);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('command_crm_walkthrough', expect.objectContaining({
      p_walkthrough: WALKTHROUGH_ID, p_action: 'cancel', p_window_start: null,
      p_window_end: null, p_timezone: null,
    }));
  });
});
