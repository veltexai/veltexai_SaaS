import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const foundation = readFileSync(join(root, 'supabase/migrations/20260925000000_location_pricing_foundation.sql'), 'utf8');
const seed = readFileSync(join(root, 'supabase/migrations/20260925001000_location_pricing_reviewed_seed.sql'), 'utf8');

it('keeps benchmark data private from anonymous callers and protected by RLS', () => {
  expect(foundation.match(/enable row level security/g)).toHaveLength(6);
  expect(foundation).toContain('from anon');
  expect(foundation).toContain('to authenticated, service_role');
});

it('represents the national market without inventing a state', () => {
  expect(seed).toContain("resolution = 'national' and state_code is null");
  expect(seed).toContain("resolution <> 'national' and state_code ~ '^[A-Z]{2}$'");
  expect(seed).toContain("'US-NATIONAL', 'us-location-2026-09-25.1', 'United States national fallback', 'US', null, 'national', 'D'");
});

it('labels canonical payload hashes accurately and seeds only reviewed source categories', () => {
  expect(seed.match(/payload-sha256:/g)).toHaveLength(4);
  expect(seed).toContain("'bls_oews_national_cleaning'");
  expect(seed).toContain("'dol_state_minimum_wages'");
  expect(seed).toContain("'irs_business_mileage'");
  expect(seed).toContain("'bea_rpp_reviewed_states'");
});
