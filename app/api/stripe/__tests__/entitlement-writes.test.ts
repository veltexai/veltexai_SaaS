import { NextRequest } from 'next/server';
import { POST as upgrade } from '../upgrade-subscription/route';
import { POST as sync } from '../sync-subscription/route';

const stripeUpdate = jest.fn();
const sessionRetrieve = jest.fn();
const serviceWrite = jest.fn();
const userWrite = jest.fn();
let subscriptionExists = true;
jest.mock('@/lib/stripe/stripe', () => ({ stripe: {
  subscriptions: { retrieve: async () => ({ items: { data: [{ id: 'item' }] } }), update: (...args: unknown[]) => stripeUpdate(...args) },
  checkout: { sessions: { retrieve: (...args: unknown[]) => sessionRetrieve(...args) } },
} }));
const userClient = () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
  from(table: string) {
    let name = '';
    const chain = { select: () => chain, in: () => chain, limit: () => chain,
      eq: (key: string, value: string) => { if (key === 'name') name = value; return chain; },
      single: async () => ({ data: table === 'subscriptions'
        ? { id: 'sub', user_id: 'user', status: 'trialing', plan: 'starter', stripe_subscription_id: 'stripe-sub' }
        : { name, price_monthly: name === 'starter' ? 20 : 60, stripe_price_id_monthly: `price-${name}` } }),
      maybeSingle: async () => ({ data: subscriptionExists ? { id: 'sub' } : null }),
      update: userWrite, insert: userWrite,
    };
    return chain;
  },
});
jest.mock('@/lib/auth/auth-helpers', () => ({ getUser: async () => ({ id: 'user' }), createServerSupabaseClient: async () => userClient() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => userClient(), createServiceClient: () => ({ from: (table: string) => ({
  update: (values: unknown) => { serviceWrite(table, values); return { eq: async () => ({ error: null }) }; },
  insert: async (values: unknown) => { serviceWrite(table, values); return { error: null }; },
}) }) }));
const request = (body: unknown) => new NextRequest('http://localhost/api/stripe', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { jest.clearAllMocks(); subscriptionExists = true; stripeUpdate.mockResolvedValue({}); });
it('rejects a cheap price paired with an enterprise plan label', async () => {
  expect((await upgrade(request({ newPriceId: 'price-starter', newPlan: 'enterprise' }))).status).toBe(400);
  expect(stripeUpdate).not.toHaveBeenCalled();
  expect(serviceWrite).not.toHaveBeenCalled();
});
it('retains legitimate Stripe-backed plan changes through trusted writes', async () => {
  expect((await upgrade(request({ newPriceId: 'price-enterprise', newPlan: 'enterprise' }))).status).toBe(200);
  expect(stripeUpdate).toHaveBeenCalled();
  expect(serviceWrite).toHaveBeenCalledWith('profiles', expect.objectContaining({ subscription_plan: 'enterprise' }));
  expect(serviceWrite).toHaveBeenCalledWith('subscriptions', expect.objectContaining({ plan: 'enterprise' }));
  expect(userWrite).not.toHaveBeenCalled();
});
it('rejects checkout sessions belonging to another user', async () => {
  subscriptionExists = false;
  sessionRetrieve.mockResolvedValue({ metadata: { userId: 'other' }, subscription: { status: 'active' } });
  expect((await sync(request({ sessionId: 'session' }))).status).toBe(403);
  expect(serviceWrite).not.toHaveBeenCalled();
});
it('preserves checkout sync for a verified active subscription', async () => {
  subscriptionExists = false;
  sessionRetrieve.mockResolvedValue({ status: 'complete', metadata: { userId: 'user', plan: 'enterprise' }, subscription: {
    id: 'stripe-sub', customer: 'customer', status: 'active', metadata: {}, current_period_start: 1700000000, current_period_end: 1702592000,
  } });
  expect((await sync(request({ sessionId: 'session' }))).status).toBe(200);
  expect(serviceWrite).toHaveBeenCalledWith('profiles', expect.objectContaining({ subscription_plan: 'enterprise' }));
  expect(serviceWrite).toHaveBeenCalledWith('subscriptions', expect.objectContaining({ user_id: 'user', plan: 'enterprise' }));
  expect(userWrite).not.toHaveBeenCalled();
});
