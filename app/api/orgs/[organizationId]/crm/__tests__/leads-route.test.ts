import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ORG_ID = '11111111-1111-4111-8111-111111111111';

function query(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'insert', 'maybeSingle', 'single']) {
    value[method] = jest.fn().mockReturnValue(value);
  }
  value.maybeSingle.mockResolvedValue(result);
  value.single.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}

function client(options: {
  user?: { id: string } | null;
  role?: string | null;
  existing?: unknown;
  duplicates?: unknown[];
  inserted?: unknown;
  insertError?: unknown;
}) {
  const membership = query({
    data: options.role ? { role: options.role } : null,
    error: null,
  });
  const existing = query({ data: options.existing ?? null, error: null });
  const from = jest.fn()
    .mockReturnValueOnce(membership)
    .mockReturnValueOnce(existing);
  const rpc = jest.fn((name: string) => name === 'find_crm_duplicate_candidates'
    ? Promise.resolve({ data: options.duplicates ?? [], error: null })
    : Promise.resolve({
        data: options.inserted ? [{
          lead_id: (options.inserted as { id: string }).id,
          lead_status: (options.inserted as { status: string }).status,
          created_at: (options.inserted as { created_at?: string }).created_at ?? '2026-10-01T00:00:00Z',
          replayed: Boolean(options.existing),
        }] : null,
        error: options.insertError ?? null,
      }));
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
  return { membership, existing, from, rpc };
}

function request(body: unknown, idempotencyKey = 'quick-add-0001') {
  return new NextRequest(`http://local/api/orgs/${ORG_ID}/crm/leads`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

const routeContext = { params: Promise.resolve({ organizationId: ORG_ID }) };

describe('R3-1 quick-add lead route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates before any CRM query', async () => {
    const state = client({ user: null, role: null });
    const { POST } = await import('../leads/route');
    const response = await POST(request({ email: 'person@example.test' }), routeContext);
    expect(response.status).toBe(401);
    expect(state.from).not.toHaveBeenCalled();
  });

  it('returns the same 404 for a non-member and a viewer write attempt', async () => {
    const { POST } = await import('../leads/route');
    client({ role: null });
    expect((await POST(request({ email: 'person@example.test' }), routeContext)).status).toBe(404);
    client({ role: 'viewer' });
    expect((await POST(request({ email: 'person@example.test' }), routeContext)).status).toBe(404);
  });

  it('requires an idempotency key before duplicate or insert work', async () => {
    const state = client({ role: 'owner' });
    const { POST } = await import('../leads/route');
    const response = await POST(request({ email: 'person@example.test' }, ''), routeContext);
    expect(response.status).toBe(400);
    expect(state.from).toHaveBeenCalledTimes(1);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('replays an existing idempotent result without creating another lead', async () => {
    const state = client({
      role: 'estimator',
      existing: { id: '44444444-4444-4444-8444-444444444444', status: 'new' },
      inserted: { id: '44444444-4444-4444-8444-444444444444', status: 'new' },
    });
    const { POST } = await import('../leads/route');
    const response = await POST(request({ email: 'person@example.test' }), routeContext);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({ id: '44444444-4444-4444-8444-444444444444' }),
      replayed: true,
    });
    expect(state.rpc).toHaveBeenCalledWith('create_crm_manual_lead', expect.any(Object));
  });

  it('prompts for duplicate review and never auto-merges', async () => {
    const candidate = {
      entity_type: 'contact',
      entity_id: '55555555-5555-4555-8555-555555555555',
      matched_on: 'email',
    };
    const state = client({ role: 'owner', duplicates: [candidate] });
    const { POST } = await import('../leads/route');
    const response = await POST(request({ email: 'person@example.test' }), routeContext);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      duplicateCandidates: [candidate],
    }));
    expect(state.rpc).not.toHaveBeenCalledWith('create_crm_manual_lead', expect.any(Object));
  });

  it('creates a manual lead only after validation and explicit duplicate choice', async () => {
    const state = client({
      role: 'estimator',
      duplicates: [{
        entity_type: 'contact',
        entity_id: '55555555-5555-4555-8555-555555555555',
        matched_on: 'phone',
      }],
      inserted: {
        id: '66666666-6666-4666-8666-666666666666',
        status: 'new',
        created_at: '2026-10-01T00:00:00Z',
      },
    });
    const { POST } = await import('../leads/route');
    const response = await POST(request({
      contactName: 'Jordan Test',
      phone: '+12065550100',
      duplicateDecision: 'create_new',
    }), routeContext);
    expect(response.status).toBe(201);
    expect(state.rpc).toHaveBeenCalledWith('create_crm_manual_lead', expect.objectContaining({
      p_organization: ORG_ID,
      p_request_key: 'quick-add-0001',
      p_assigned_to: USER_ID,
    }));
  });
});
