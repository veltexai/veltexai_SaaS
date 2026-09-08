// Isolated PostgreSQL regression test. No live database or application dependency.
// node supabase/tests/design-entitlements.mjs /absolute/path/to/pglite/dist/index.js
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const basic = '22222222-2222-4222-8222-222222222222';
const executive = '33333333-3333-4333-8333-333333333333';
const luxury = '44444444-4444-4444-8444-444444444444';
let checks = 0;
try {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT '${user}'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
    CREATE TABLE profiles (
      id uuid PRIMARY KEY, role text DEFAULT 'user', full_name text,
      subscription_plan text DEFAULT 'starter', subscription_status text DEFAULT 'trial',
      stripe_customer_id text, trial_end_at timestamptz DEFAULT NOW() + INTERVAL '14 days'
    );
    CREATE TABLE proposal_templates (id uuid PRIMARY KEY, is_active boolean DEFAULT true);
    CREATE TABLE template_tier_access (template_id uuid, subscription_tier text);
    CREATE TABLE proposals (id int PRIMARY KEY, user_id uuid, template_id uuid, title text);
    CREATE TABLE user_template_preferences (user_id uuid PRIMARY KEY, preferred_template_id uuid);
    CREATE TABLE subscriptions (id int PRIMARY KEY, user_id uuid, plan text, status text,
      stripe_customer_id text, stripe_subscription_id text, canceled_at timestamptz);
    CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS
      $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') $$;
    CREATE FUNCTION start_user_trial(user_uuid uuid, plan_name text) RETURNS boolean
      LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
        UPDATE profiles SET subscription_plan = plan_name WHERE id = user_uuid;
        RETURN true;
      END $$;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    INSERT INTO profiles (id, subscription_status) VALUES ('${user}', 'free_trial');
    INSERT INTO proposal_templates (id) VALUES ('${basic}'), ('${executive}'), ('${luxury}');
    INSERT INTO template_tier_access VALUES
      ('${basic}', 'starter'), ('${basic}', 'professional'), ('${basic}', 'enterprise'),
      ('${executive}', 'professional'), ('${executive}', 'enterprise'), ('${luxury}', 'enterprise');
    INSERT INTO subscriptions VALUES (1, '${user}', 'starter', 'active', 'customer', 'subscription', null);
  `);
  await db.exec(await readFile(new URL('../migrations/20260908000000_enforce_proposal_design_entitlements.sql', import.meta.url), 'utf8'));
  await db.exec('SET ROLE authenticated');
  async function allowed(sql) { await db.exec(sql); checks++; }
  async function denied(sql) {
    await assert.rejects(db.exec(sql), error => error.code === '42501'); checks++;
  }
  await allowed(`INSERT INTO proposals VALUES (1, '${user}', '${basic}', 'Basic'), (2, '${user}', '${executive}', 'Trial executive')`);
  await denied(`INSERT INTO proposals VALUES (3, '${user}', '${luxury}', 'Locked')`);
  await denied(`UPDATE proposals SET template_id = '${luxury}' WHERE id = 1`);
  await denied(`INSERT INTO user_template_preferences VALUES ('${user}', '${luxury}')`);
  await allowed(`INSERT INTO user_template_preferences VALUES ('${user}', '${executive}')`);
  await denied(`UPDATE profiles SET subscription_plan = 'enterprise' WHERE id = '${user}'`);
  await denied(`UPDATE profiles SET subscription_status = 'active' WHERE id = '${user}'`);
  await denied(`UPDATE profiles SET role = 'admin' WHERE id = '${user}'`);
  await denied(`UPDATE profiles SET stripe_customer_id = 'someone-else' WHERE id = '${user}'`);
  await denied(`UPDATE subscriptions SET plan = 'enterprise' WHERE id = 1`);
  await denied(`INSERT INTO subscriptions (id,user_id,plan,status) VALUES (2, '${user}', 'enterprise', 'active')`);
  await denied(`SELECT start_user_trial('${user}', 'enterprise')`);
  await allowed(`UPDATE profiles SET full_name = 'Ordinary edit' WHERE id = '${user}'`);
  await allowed(`UPDATE subscriptions SET canceled_at = NOW() WHERE id = 1`);
  await allowed(`INSERT INTO proposals VALUES (4, '${user}', NULL, 'Legacy Basic')`);
  await db.exec('SET ROLE service_role');
  await allowed(`UPDATE profiles SET subscription_plan = 'enterprise', subscription_status = 'active' WHERE id = '${user}'`);
  await allowed(`UPDATE subscriptions SET plan = 'enterprise' WHERE id = 1`);
  await db.exec('SET ROLE authenticated');
  await allowed(`INSERT INTO proposals VALUES (5, '${user}', '${luxury}', 'Paid design')`);
  await db.exec(`RESET ROLE; UPDATE proposal_templates SET is_active = false WHERE id = '${luxury}'; SET ROLE authenticated;`);
  await denied(`UPDATE proposals SET template_id = '${luxury}' WHERE id = 1`);
  await db.exec(`RESET ROLE; UPDATE profiles SET subscription_plan = 'starter', subscription_status = 'active' WHERE id = '${user}'; SET ROLE authenticated;`);
  await denied(`INSERT INTO proposals VALUES (6, '${user}', '${executive}', 'Starter locked')`);
  await allowed(`UPDATE proposals SET title = 'Historical title edit' WHERE id = 2`);
  console.log(`PASS: ${checks} PostgreSQL entitlement checks (isolated database).`);
} finally {
  await db.close();
}
