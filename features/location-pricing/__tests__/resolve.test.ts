import { PRICING_DATASET_VERSION } from '../schema';
import { resolveLocationPricing, type MarketBenchmark } from '../resolve';
import { OFFICIAL_SOURCES } from '../benchmarks';

const source = (agency: 'BLS' | 'BEA' | 'DOL' | 'IRS') => ({ agency, title: 'Synthetic test fixture referencing official source', url: OFFICIAL_SOURCES[agency.toLowerCase() as 'bls' | 'bea' | 'dol' | 'irs'], vintage: 'test-only', retrievedAt: '2026-09-25T12:00:00.000Z' });
const market = (overrides: Partial<MarketBenchmark>): MarketBenchmark => ({
  datasetVersion: PRICING_DATASET_VERSION, countryCode: 'US', stateCode: 'WA', marketCode: 'WA-STATE', marketName: 'Washington state test fixture',
  resolution: 'state', occupationCode: '37-2012', occupationLabel: 'Maids and housekeeping cleaners', wageBenchmark: 20,
  wageStatistic: 'median', legalWageFloor: 17.13, regionalPriceParity: 105, mileageRate: 0.76, confidence: 'C',
  sources: [source('BLS'), source('BEA'), source('DOL'), source('IRS')], ...overrides,
});

it('prefers a matching metro over state and national fallback', () => {
  const result = resolveLocationPricing({ stateCode: 'WA', occupationCode: '37-2012', metroCode: 'SEA', markets: [market({}), market({ marketCode: 'SEA', marketName: 'Seattle test fixture', resolution: 'metro', wageBenchmark: 24, confidence: 'B' })] });
  expect(result.marketCode).toBe('SEA');
  expect(result.wageBenchmark).toBe(24);
});

it('uses state when no requested metro row exists', () => {
  const result = resolveLocationPricing({ stateCode: 'WA', occupationCode: '37-2012', metroCode: 'MISSING', markets: [market({})] });
  expect(result.resolution).toBe('state');
  expect(result.confidence).toBe('C');
});

it('fails visibly to a national grade-D snapshot rather than inventing local precision', () => {
  const result = resolveLocationPricing({ stateCode: 'KS', occupationCode: '37-2012', markets: [], now: '2026-09-25T12:00:00.000Z' });
  expect(result.resolution).toBe('national');
  expect(result.confidence).toBe('D');
  expect(result.marketName).toMatch(/fallback/);
});

