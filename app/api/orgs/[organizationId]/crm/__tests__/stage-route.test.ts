import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ORG_ID = '11111111-1111-4111-8111-111111111111';
const OPPORTUNITY_ID = '44444444-4444-4444-8444-444444444444';
const STAGE_ID = '55555555-5555-4555-8555-555555555555';

function membershipQuery(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'maybeSingle']) {
    value[method] = jest.fn().mockReturnValue(value);
  }
  value.maybeSingle.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}

function client(options: {
  user?: { id: string } | null;
  role?: string | null;
  data?: unknown;
  error?: unknown;
}) {
  const membership = membershipQuery({
    data: options.role ? { role: options.role } : null,
    error: null,
  });
  const from = jest.fn().mockReturnValue(membership);
  const rpc = jest.fn().mockResolvedValue({ data: options.data ?? null, error: options.error ?? null });
  createClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: options.user === undefined ? { id: USER_ID } : options.user },
        error: null,
      }),
    },
    from,
    rpc,
  });
  return { from, rpc };
}

function request(body: unknown, idempotencyKey = 'stage-command-0001') {
  return new NextRequest('http://local/stage', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

const routeContext = {
  params: Promise.resolve({ organizationId: ORG_ID, opportunityId: OPPORTUNITY_ID }),
};

describe('R3-1 stage transition route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates before any CRM query', async () => {
    const state = client({ user: null });
    const { POST } = await import('../opportunities/[opportunityId]/stage/route');
    const response = await POST(request({ stageId: STAGE_ID }), routeContext);
    expect(response.status).toBe(401);
    expect(state.from).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('hides the command from viewers and non-members', async () => {
    const { POST } = await import('../opportunities/[opportunityId]/stage/route');
    client({ role: null });
    expect((await POST(request({ stageId: STAGE_ID }), routeContext)).status).toBe(404);
    client({ role: 'viewer' });
    expect((await POST(request({ stageId: STAGE_ID }), routeContext)).status).toBe(404);
  });

  it('requires a bounded idempotency key before the RPC', async () => {
    const state = client({ role: 'estimator' });
    const { POST } = await import('../opportunities/[opportunityId]/stage/route');
    const response = await POST(request({ stageId: STAGE_ID }, ''), routeContext);
    expect(response.status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('sends the explicit organization, opportunity and command key to the atomic RPC', async () => {
    const state = client({
      role: 'estimator',
      data: [{ opportunity_id: OPPORTUNITY_ID, stage_id: STAGE_ID, replayed: false }],
    });
    const { POST } = await import('../opportunities/[opportunityId]/stage/route');
    const response = await POST(request({ stageId: STAGE_ID }), routeContext);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('move_crm_opportunity_stage', {
      target_organization: ORG_ID,
      target_opportunity: OPPORTUNITY_ID,
      target_stage: STAGE_ID,
      request_key: 'stage-command-0001',
      selected_loss_reason: null,
      selected_manual_win_reason: null,
    });
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({ opportunity_id: OPPORTUNITY_ID }),
      replayed: false,
    });
  });

  it('reports an idempotent replay without duplicating client behavior', async () => {
    client({
      role: 'owner',
      data: [{ opportunity_id: OPPORTUNITY_ID, stage_id: STAGE_ID, replayed: true }],
    });
    const { POST } = await import('../opportunities/[opportunityId]/stage/route');
    const response = await POST(request({ stageId: STAGE_ID }), routeContext);
    await expect(response.json()).resolves.toEqual({
      data: expect.any(Object),
      replayed: true,
    });
  });

  it.each([
    ['42501', 404],
    ['23514', 422],
    ['XX000', 503],
  ])('maps database error %s to safe status %s', async (code, status) => {
    client({ role: 'admin', error: { code, message: 'private database detail' } });
    const { POST } = await import('../opportunities/[opportunityId]/stage/route');
    const response = await POST(request({ stageId: STAGE_ID }), routeContext);
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain('private database detail');
  });
});
