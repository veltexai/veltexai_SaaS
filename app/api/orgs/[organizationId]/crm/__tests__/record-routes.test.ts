import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));
const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const RECORD = '33333333-3333-4333-8333-333333333333';
function client(role: string, data: unknown, error: unknown = null) {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq']) query[method] = jest.fn().mockReturnValue(query);
  query.maybeSingle = jest.fn().mockResolvedValue({ data: { role }, error: null });
  const rpc = jest.fn().mockResolvedValue({ data, error });
  createClient.mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) }, from: jest.fn().mockReturnValue(query), rpc });
  return rpc;
}
function request(body: unknown) { return new NextRequest('http://local/record', {
  method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}); }

describe('R3-1 manual record routes', () => {
  beforeEach(() => jest.clearAllMocks());
  it('creates a retry-safe customer record', async () => {
    const rpc = client('estimator', [{ customer_id: RECORD, updated_at: '2026-10-01T20:00:00Z', created: true }]);
    const { PUT } = await import('../records/customers/[customerId]/route');
    const response = await PUT(request({ customerType: 'commercial', name: 'North Campus' }),
      { params: Promise.resolve({ organizationId: ORG, customerId: RECORD }) });
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('save_crm_customer_record', expect.objectContaining({
      p_organization: ORG, p_customer: RECORD, p_expected_updated_at: null,
    }));
  });
  it('validates contact identity and do-not-contact provenance before RPC', async () => {
    const rpc = client('owner', null);
    const { PUT } = await import('../records/contacts/[contactId]/route');
    const response = await PUT(request({ doNotContact: true }),
      { params: Promise.resolve({ organizationId: ORG, contactId: RECORD }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('binds a property only to an explicit customer UUID', async () => {
    const rpc = client('admin', [{ property_id: RECORD, updated_at: '2026-10-01T20:00:00Z', created: true }]);
    const { PUT } = await import('../records/properties/[propertyId]/route');
    const response = await PUT(request({ name: 'Building A', customerId: USER, countryCode: 'US' }),
      { params: Promise.resolve({ organizationId: ORG, propertyId: RECORD }) });
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('save_crm_property_record', expect.objectContaining({ p_customer: USER }));
  });
  it('denies viewers before any record RPC', async () => {
    const rpc = client('viewer', null);
    const { PUT } = await import('../records/customers/[customerId]/route');
    expect((await PUT(request({ customerType: 'household', name: 'Home' }),
      { params: Promise.resolve({ organizationId: ORG, customerId: RECORD }) })).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('creates the customer/contact/property bundle through one atomic RPC', async () => {
    const CONTACT = '44444444-4444-4444-8444-444444444444';
    const PROPERTY = '55555555-5555-4555-8555-555555555555';
    const rpc = client('owner', [{ customer_id: RECORD, contact_id: CONTACT, property_id: PROPERTY }]);
    const { POST } = await import('../records/account/route');
    const response = await POST(request({ customerId: RECORD, contactId: CONTACT, propertyId: PROPERTY,
      customerType: 'commercial', customerName: 'North Campus', contactEmail: 'manager@example.test',
      propertyName: 'Building A' }), { params: Promise.resolve({ organizationId: ORG }) });
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('create_crm_account_bundle', expect.objectContaining({
      p_customer: RECORD, p_contact: CONTACT, p_property: PROPERTY,
    }));
  });
  it.each([['40001', 409], ['42501', 404], ['23514', 422]])('maps %s without exposing details', async (code, status) => {
    client('owner', null, { code, message: 'private database detail' });
    const { PUT } = await import('../records/customers/[customerId]/route');
    const response = await PUT(request({ customerType: 'commercial', name: 'Customer' }),
      { params: Promise.resolve({ organizationId: ORG, customerId: RECORD }) });
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain('private database detail');
  });
});
