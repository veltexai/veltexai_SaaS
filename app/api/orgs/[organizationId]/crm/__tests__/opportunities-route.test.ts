const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ORG_ID = '11111111-1111-4111-8111-111111111111';

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
  board?: unknown;
  rpcError?: unknown;
}) {
  const membership = membershipQuery({
    data: options.role ? { role: options.role } : null,
    error: null,
  });
  const from = jest.fn().mockReturnValue(membership);
  const rpc = jest.fn().mockResolvedValue({
    data: options.board ?? null,
    error: options.rpcError ?? null,
  });
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

const routeContext = { params: Promise.resolve({ organizationId: ORG_ID }) };

describe('R3-1 pipeline board route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates before any CRM query', async () => {
    const state = client({ user: null });
    const { GET } = await import('../opportunities/route');
    const response = await GET(new Request('http://local'), routeContext);
    expect(response.status).toBe(401);
    expect(state.from).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('returns a uniform 404 for a non-member without calling the board RPC', async () => {
    const state = client({ role: null });
    const { GET } = await import('../opportunities/route');
    const response = await GET(new Request('http://local'), routeContext);
    expect(response.status).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('binds the board read to the route organization', async () => {
    const board = { organization_id: ORG_ID, pipelines: [], opportunities: [] };
    const state = client({ role: 'estimator', board });
    const { GET } = await import('../opportunities/route');
    const response = await GET(new Request('http://local'), routeContext);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('read_crm_pipeline_board', {
      target_organization: ORG_ID,
    });
    await expect(response.json()).resolves.toEqual({ data: board });
  });

  it('serves the already-redacted viewer projection without adding price fields', async () => {
    const board = {
      organization_id: ORG_ID,
      viewer_price_redacted: true,
      pipelines: [],
      opportunities: [{ id: '44444444-4444-4444-8444-444444444444', name: 'Safe lead' }],
    };
    client({ role: 'viewer', board });
    const { GET } = await import('../opportunities/route');
    const response = await GET(new Request('http://local'), routeContext);
    const payload = await response.json();
    expect(payload.data.opportunities[0]).not.toHaveProperty('value_amount_minor');
    expect(payload.data.opportunities[0]).not.toHaveProperty('value_basis');
    expect(payload.data.opportunities[0]).not.toHaveProperty('currency');
  });

  it('fails closed when the board projection is unavailable', async () => {
    client({ role: 'owner', rpcError: { message: 'database unavailable' } });
    const { GET } = await import('../opportunities/route');
    const response = await GET(new Request('http://local'), routeContext);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'CRM is unavailable. Please try again.',
    });
  });
});
