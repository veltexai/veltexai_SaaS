import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const OPPORTUNITY_ID = '44444444-4444-4444-8444-444444444444';
const ESTIMATOR_ID = '55555555-5555-4555-8555-555555555555';
function query(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'maybeSingle']) value[method] = jest.fn().mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}
function client(role: string | null, data?: unknown, error?: unknown) {
  const membership = query({ data: role ? { role } : null, error: null });
  const from = jest.fn().mockReturnValue(membership);
  const rpc = jest.fn().mockResolvedValue({ data: data ?? null, error: error ?? null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) }, from, rpc,
  });
  return { rpc };
}
function request(key = 'assignment-0001') {
  return new NextRequest('http://local/assignment', {
    method: 'PATCH', headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify({ ownerUserId: USER_ID, estimatorUserId: ESTIMATOR_ID, transferOpenTasks: true }),
  });
}
const context = { params: Promise.resolve({ organizationId: ORG_ID, opportunityId: OPPORTUNITY_ID }) };

describe('R3-1 assignment route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows managers and binds task transfer to the idempotent RPC', async () => {
    const state = client('admin', [{ opportunity_id: OPPORTUNITY_ID, transferred_task_count: 2, replayed: false }]);
    const { PATCH } = await import('../opportunities/[opportunityId]/assignment/route');
    const response = await PATCH(request(), context);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('assign_crm_opportunity', {
      p_organization: ORG_ID, p_opportunity: OPPORTUNITY_ID, p_request_key: 'assignment-0001',
      p_owner: USER_ID, p_estimator: ESTIMATOR_ID, p_transfer_open_tasks: true,
    });
  });

  it('denies estimator and viewer assignment before the RPC', async () => {
    const { PATCH } = await import('../opportunities/[opportunityId]/assignment/route');
    let state = client('estimator');
    expect((await PATCH(request(), context)).status).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
    state = client('viewer');
    expect((await PATCH(request(), context)).status).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it.each([['42501', 404], ['23514', 422], ['XX000', 503]])(
    'maps %s safely to %s', async (code, status) => {
      client('owner', null, { code, message: 'private detail' });
      const { PATCH } = await import('../opportunities/[opportunityId]/assignment/route');
      const response = await PATCH(request(), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    },
  );
});
