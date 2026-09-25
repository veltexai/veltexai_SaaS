import { DEFAULT_COSTS } from '@/features/service-catalog/versions/v2/schema';
import { applyLocationPricing } from '../apply';
import { nationalFallback } from '../benchmarks';

const now = '2026-09-25T12:00:00.000Z';

it('never lowers an operator wage and adds explicit travel costs', () => {
  const snapshot = nationalFallback({ stateCode: 'WA', occupationCode: '37-2012', routeMiles: 20, paidTravelHours: 1, now });
  const result = applyLocationPricing({ ...DEFAULT_COSTS, wage: 25, burdenPercent: 25, travel: 10 }, snapshot);
  expect(result.costs.wage).toBe(25);
  expect(result.costs.travel).toBeCloseTo(56.45);
  expect(result.explanation?.selectedWage).toBe(25);
});

it('raises a planning wage to the higher official occupational benchmark or legal floor', () => {
  const snapshot = nationalFallback({ stateCode: 'DC', occupationCode: '37-2012', now });
  const result = applyLocationPricing({ ...DEFAULT_COSTS, wage: 12 }, snapshot);
  expect(result.costs.wage).toBe(18.4);
  expect(result.explanation?.confidence).toBe('D');
});

it('does not adjust nonlabor actuals unless explicitly enabled', () => {
  const snapshot = { ...nationalFallback({ stateCode: 'CA', occupationCode: '37-2012', now }), regionalPriceParity: 110.7 };
  expect(applyLocationPricing(DEFAULT_COSTS, snapshot).costs.supplies).toBe(12);
  expect(applyLocationPricing(DEFAULT_COSTS, { ...snapshot, applyNonLaborIndex: true }).costs.supplies).toBeCloseTo(13.284);
});

it('preserves the existing pricing contract when location pricing is absent', () => {
  const result = applyLocationPricing(DEFAULT_COSTS);
  expect(result.applied).toBe(false);
  expect(result.costs).toBe(DEFAULT_COSTS);
});

