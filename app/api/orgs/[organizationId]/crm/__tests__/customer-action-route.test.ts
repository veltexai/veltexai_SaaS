import { NextRequest } from 'next/server';

const createClient = jest.fn();
const createServiceClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient, createServiceClient }));
jest.mock('@/features/crm/rollout', () => ({ isCrmWorkspaceEnabled: () => true }));

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const VERSION = '33333333-3333-4333-8333-333333333333';
const TOKEN = '44444444-4444-4444-8444-444444444444';
const SECRET_NAME = 'VELTEX_C0_ACTION_TOKEN_HMAC_KEY_V1';
const context = { params: Promise.resolve({ organizationId: ORG, versionId: VERSION }) };
const revokeContext = {
  params: Promise.resolve({ organizationId: ORG, versionId: VERSION, tokenId: TOKEN }),
};

function query(result: unknown) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: result, error: null });
  return chain;
}

function clients(role = 'owner', command: any = {
  data: [{
    token_id: TOKEN,
    proposal_version_id: VERSION,
    purpose: 'accept_proposal',
    key_version: 1,
    issued_at: '2026-10-07T08:00:00.000Z',
    expires_at: '2026-10-08T08:00:00.000Z',
    designated_approver_required: false,
    replayed: false,
    raw_token_recoverable: true,
  }],
  error: null,
}) {
  const statusRpc = jest.fn().mockResolvedValue({ data: [], error: null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({
      data: { user: { id: USER } }, error: null,
    }) },
    from: jest.fn().mockReturnValue(query({ role })),
    rpc: statusRpc,
  });
  const commandRpc = jest.fn().mockResolvedValue(command);
  createServiceClient.mockReturnValue({ rpc: commandRpc });
  return { statusRpc, commandRpc };
}

describe('R3-5 C0.1 operator customer-action routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env[SECRET_NAME] = '0123456789abcdef0123456789abcdef';
  });

  afterAll(() => { delete process.env[SECRET_NAME]; });

  it('issues one fragment token while sending only its digest to PostgreSQL', async () => {
    const { commandRpc } = clients();
    const { POST } = await import(
      '../proposal-versions/[versionId]/customer-actions/route'
    );
    const response = await POST(new NextRequest('http://local/customer-actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'issue-key-1' },
      body: JSON.stringify({ purpose: 'accept_proposal', expiresInDays: 1 }),
    }), context);
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.data.fragmentToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(payload.replayed).toBe(false);
    expect(commandRpc).toHaveBeenCalledWith(
      'command_crm_issue_customer_action_token_internal',
      expect.objectContaining({
        p_actor: USER,
        p_organization: ORG,
        p_proposal_version: VERSION,
        p_token_hmac_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_key_version: 1,
        p_expires_in_days: 1,
        p_request_key: 'issue-key-1',
      }),
    );
    expect(JSON.stringify(commandRpc.mock.calls)).not.toContain(payload.data.fragmentToken);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('does not fabricate a recoverable bearer value on exact replay', async () => {
    clients('owner', {
      data: [{ token_id: TOKEN, proposal_version_id: VERSION,
        purpose: 'accept_proposal', key_version: 1,
        issued_at: '2026-10-07T08:00:00.000Z', expires_at: '2026-10-08T08:00:00.000Z',
        designated_approver_required: false, replayed: true, raw_token_recoverable: false }],
      error: null,
    });
    const { POST } = await import(
      '../proposal-versions/[versionId]/customer-actions/route'
    );
    const response = await POST(new NextRequest('http://local/customer-actions', {
      method: 'POST', headers: {
        'content-type': 'application/json', 'idempotency-key': 'issue-key-1',
      }, body: JSON.stringify({ purpose: 'accept_proposal', expiresInDays: 1 }),
    }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      replayed: true,
      data: expect.objectContaining({ fragmentToken: null }),
    }));
  });

  it('rejects estimator attempts to enable designated-approver matching', async () => {
    const { commandRpc } = clients('estimator');
    const { POST } = await import(
      '../proposal-versions/[versionId]/customer-actions/route'
    );
    const response = await POST(new NextRequest('http://local/customer-actions', {
      method: 'POST', headers: {
        'content-type': 'application/json', 'idempotency-key': 'issue-key-2',
      }, body: JSON.stringify({ purpose: 'accept_proposal', expiresInDays: 3,
        designatedApproverEmail: 'approver@example.test' }),
    }), context);
    expect(response.status).toBe(404);
    expect(commandRpc).not.toHaveBeenCalled();
  });

  it('returns only scoped token metadata from the authenticated reader', async () => {
    const { statusRpc } = clients();
    statusRpc.mockResolvedValue({ data: [{ token_id: TOKEN, status: 'active' }], error: null });
    const { GET } = await import(
      '../proposal-versions/[versionId]/customer-actions/route'
    );
    const response = await GET(new NextRequest('http://local/customer-actions'), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ token_id: TOKEN, status: 'active' }] });
    expect(statusRpc).toHaveBeenCalledWith('read_crm_customer_action_token_status', {
      p_organization: ORG, p_proposal_version: VERSION,
    });
  });

  it('revokes through the private command with no token digest in the response', async () => {
    const { commandRpc } = clients('admin', {
      data: [{ token_id: TOKEN, revoked_at: '2026-10-07T08:30:00.000Z', replayed: false }],
      error: null,
    });
    const { DELETE } = await import(
      '../proposal-versions/[versionId]/customer-actions/[tokenId]/route'
    );
    const response = await DELETE(new NextRequest('http://local/customer-actions/token', {
      method: 'DELETE', headers: {
        'content-type': 'application/json', 'idempotency-key': 'revoke-key-1',
      }, body: JSON.stringify({ reason: 'Replaced by a newer link' }),
    }), revokeContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: {
      token_id: TOKEN, revoked_at: '2026-10-07T08:30:00.000Z', replayed: false,
    }, replayed: false });
    expect(commandRpc).toHaveBeenCalledWith(
      'command_crm_revoke_customer_action_token_internal',
      expect.objectContaining({
        p_proposal_version: VERSION,
        p_token: TOKEN,
        p_reason: 'Replaced by a newer link',
      }),
    );
  });
});
