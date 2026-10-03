import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const OPPORTUNITY_ID = '44444444-4444-4444-8444-444444444444';
const TASK_ID = '55555555-5555-4555-8555-555555555555';

function query(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'insert', 'maybeSingle', 'single']) value[method] = jest.fn().mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  value.single.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}
function client(options: { role?: string | null; queries?: unknown[]; rpcData?: unknown; rpcError?: unknown }) {
  const membership = query({ data: options.role ? { role: options.role } : null, error: null });
  const builders = [membership, ...(options.queries ?? []).map(query)];
  const from = jest.fn();
  for (const builder of builders) from.mockReturnValueOnce(builder);
  const rpc = jest.fn().mockResolvedValue({ data: options.rpcData ?? null, error: options.rpcError ?? null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
    from, rpc,
  });
  return { from, rpc, builders };
}
const createContext = { params: Promise.resolve({ organizationId: ORG_ID, opportunityId: OPPORTUNITY_ID }) };
const commandContext = { params: Promise.resolve({ organizationId: ORG_ID, taskId: TASK_ID }) };

describe('R3-1 task routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates one assigned task through an explicit organization path', async () => {
    const state = client({
      role: 'estimator',
      rpcData: [{ task_id: TASK_ID, task_status: 'open', title: 'Call customer',
        due_at: null, snoozed_until: null, replayed: false }],
    });
    const { POST } = await import('../opportunities/[opportunityId]/tasks/route');
    const response = await POST(new NextRequest('http://local/tasks', {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'task-create-0001' },
      body: JSON.stringify({ title: 'Call customer', assigneeUserId: USER_ID }),
    }), createContext);
    expect(response.status).toBe(201);
    expect(state.rpc).toHaveBeenCalledWith('create_crm_opportunity_task', expect.objectContaining({
      p_organization: ORG_ID, p_opportunity: OPPORTUNITY_ID,
      p_request_key: 'task-create-0001', p_assignee: USER_ID,
    }));
  });

  it('replays task creation by organization and command key', async () => {
    client({ role: 'owner', rpcData: [{ task_id: TASK_ID, task_status: 'open',
      title: 'Call customer', due_at: null, snoozed_until: null, replayed: true }] });
    const { POST } = await import('../opportunities/[opportunityId]/tasks/route');
    const response = await POST(new NextRequest('http://local/tasks', {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'task-create-0001' },
      body: JSON.stringify({ title: 'Call customer', assigneeUserId: USER_ID }),
    }), createContext);
    await expect(response.json()).resolves.toEqual({ data: expect.any(Object), replayed: true });
  });

  it('completes or snoozes only through the receipt-backed RPC', async () => {
    const state = client({ role: 'estimator', rpcData: [{ task_id: TASK_ID, task_status: 'completed', replayed: false }] });
    const { PATCH } = await import('../tasks/[taskId]/route');
    const response = await PATCH(new NextRequest('http://local/task', {
      method: 'PATCH', headers: { 'content-type': 'application/json', 'idempotency-key': 'task-command-0001' },
      body: JSON.stringify({ action: 'complete' }),
    }), commandContext);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('command_crm_task', {
      p_organization: ORG_ID, p_task: TASK_ID, p_request_key: 'task-command-0001',
      p_action: 'complete', p_snoozed_until: null,
    });
  });

  it.each([['42501', 404], ['23514', 422], ['XX000', 503]])(
    'maps command error %s safely to %s', async (code, status) => {
      client({ role: 'admin', rpcError: { code, message: 'private detail' } });
      const { PATCH } = await import('../tasks/[taskId]/route');
      const response = await PATCH(new NextRequest('http://local/task', {
        method: 'PATCH', headers: { 'content-type': 'application/json', 'idempotency-key': 'task-command-0001' },
        body: JSON.stringify({ action: 'complete' }),
      }), commandContext);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    },
  );
});
