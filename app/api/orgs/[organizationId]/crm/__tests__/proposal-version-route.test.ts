import { NextRequest } from 'next/server';

const createClient = jest.fn();
const createServiceClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient, createServiceClient }));

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const OPP = '33333333-3333-4333-8333-333333333333';
const PROPOSAL = '44444444-4444-4444-8444-444444444444';
const CUSTOMER = '55555555-5555-4555-8555-555555555555';
const PROPERTY = '66666666-6666-4666-8666-666666666666';
const ESTIMATE = '77777777-7777-4777-8777-777777777777';
const PACKAGE = '88888888-8888-4888-8888-888888888888';

const rows: Record<string, unknown> = {
  proposals: {
    id: PROPOSAL, title: 'Residential proposal', client_name: 'Taylor',
    client_email: 'taylor@example.test', client_company: null, contact_phone: '555-0100',
    service_location: '10 Main St', service_type: 'residential', service_frequency: 'weekly',
    service_scope: { areas_included: ['Kitchen'], areas_excluded: ['Exterior'] },
    generated_content: '# Reviewed proposal', template_id: null,
    crm_opportunity_id: OPP, crm_customer_id: CUSTOMER, crm_property_id: PROPERTY,
  },
  crm_estimate_runs: {
    id: ESTIMATE, selected_amount_minor: 18000, currency: 'USD', pricing_basis: 'per_visit',
    opportunity_id: OPP, property_id: PROPERTY, work_package_id: PACKAGE,
  },
  crm_properties: {
    id: PROPERTY, customer_id: CUSTOMER, name: 'Main Street home', address_line_1: '10 Main St',
    address_line_2: null, city: 'Portland', region: 'OR', postal_code: '97201',
  },
  company_profiles: { company_name: 'Keystone Cleaning', contact_info: { phone: '555-0200' } },
  crm_customers: { id: CUSTOMER, name: 'Taylor' },
};

function chain(result: unknown) {
  const query: any = {};
  for (const method of ['select', 'eq']) query[method] = jest.fn().mockReturnValue(query);
  query.maybeSingle = jest.fn().mockResolvedValue({ data: result, error: null });
  return query;
}

function clients(role = 'estimator', command: any = {
  data: [{ proposal_version_id: '99999999-9999-4999-8999-999999999999', version_number: 1, replayed: false }],
  error: null,
}) {
  const commandRpc = jest.fn().mockResolvedValue(command);
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
    from: jest.fn().mockReturnValue(chain({ role })),
    rpc: jest.fn(),
  });
  createServiceClient.mockReturnValue({
    from: jest.fn((table: string) => chain(rows[table])),
    rpc: commandRpc,
  });
  return commandRpc;
}

function request(body: any = {
  proposalId: PROPOSAL,
  propertyId: PROPERTY,
  estimateRunId: ESTIMATE,
  workPackageId: PACKAGE,
  expectedPackageUpdatedAt: '2026-10-06T06:00:00.000Z',
}, key = 'proposal-version-key-1') {
  return new NextRequest('http://local/proposal-versions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ organizationId: ORG, opportunityId: OPP }) };

describe('R3-4 proposal-version route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('composes on the server and publishes through one caller-bound command', async () => {
    const rpc = clients();
    const { POST } = await import('../opportunities/[opportunityId]/proposal-versions/route');
    const response = await POST(request(), context);
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('command_crm_publish_proposal_version_internal', expect.objectContaining({
      p_actor: USER,
      p_organization: ORG,
      p_proposal: PROPOSAL,
      p_opportunity: OPP,
      p_package: PACKAGE,
      p_property: PROPERTY,
      p_estimate_run: ESTIMATE,
      p_request_key: 'proposal-version-key-1',
      p_content_snapshot: expect.objectContaining({
        pricing: expect.objectContaining({ amountMinor: 18000, currency: 'USD', basis: 'per_visit' }),
        scopeLines: ['Kitchen'],
      }),
      p_rendered_content: '# Reviewed proposal',
    }));
    expect(JSON.stringify(rpc.mock.calls[0][1].p_content_snapshot)).not.toMatch(/margin|labor|access/i);
  });

  it('returns only scoped proposal candidates and immutable history metadata', async () => {
    clients();
    const authRpc = jest.fn((name: string) => Promise.resolve(name === 'read_crm_proposal_candidates'
      ? { data: [{ id: PROPOSAL, title: 'Residential proposal', property_id: PROPERTY }], error: null }
      : { data: [{ id: '99999999-9999-4999-8999-999999999999', version_number: 1 }], error: null }));
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
      from: jest.fn().mockReturnValue(chain({ role: 'estimator' })),
      rpc: authRpc,
    });
    const { GET } = await import('../opportunities/[opportunityId]/proposal-versions/route');
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: {
      candidates: [{ id: PROPOSAL, title: 'Residential proposal', property_id: PROPERTY }],
      versions: [{ id: '99999999-9999-4999-8999-999999999999', version_number: 1 }],
    } });
    expect(authRpc).toHaveBeenCalledWith('read_crm_proposal_candidates', {
      p_organization: ORG, p_opportunity: OPP,
    });
  });

  it('does not accept browser-supplied content or prices', async () => {
    const rpc = clients();
    const { POST } = await import('../opportunities/[opportunityId]/proposal-versions/route');
    const body = JSON.parse(await request().text());
    const response = await POST(request({ ...body, renderedContent: 'forged', amountMinor: 1 }), context);
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('requires the package concurrency token and rejects mismatched source context', async () => {
    let rpc = clients();
    const { POST } = await import('../opportunities/[opportunityId]/proposal-versions/route');
    const body = JSON.parse(await request().text());
    expect((await POST(request({ ...body, expectedPackageUpdatedAt: null }), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();

    rpc = clients();
    rows.crm_estimate_runs = { ...(rows.crm_estimate_runs as object), property_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
    expect((await POST(request(), context)).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
    rows.crm_estimate_runs = { ...(rows.crm_estimate_runs as object), property_id: PROPERTY };
  });

  it('rejects viewers and missing retry keys before service access', async () => {
    let rpc = clients('viewer');
    const { POST } = await import('../opportunities/[opportunityId]/proposal-versions/route');
    expect((await POST(request(), context)).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
    rpc = clients();
    expect((await POST(request(undefined, ''), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['42501', 404], ['40001', 409], ['23514', 422], ['22P02', 422], ['55000', 422], ['XX000', 503],
  ])('maps %s without leaking database details', async (code, status) => {
    clients('admin', { data: null, error: { code, message: 'private database detail' } });
    const { POST } = await import('../opportunities/[opportunityId]/proposal-versions/route');
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain('private database detail');
  });
});
