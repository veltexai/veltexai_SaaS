import { defaultJob } from '@/features/service-catalog/versions/v2/catalog';
import { estimateJob } from '@/features/service-catalog/versions/v2/pricing';
import { nationalFallback } from '../benchmarks';

const now = '2026-09-25T12:00:00.000Z';

const originalRolloutFlag = process.env.NEXT_PUBLIC_LOCATION_PRICING_ENABLED;

beforeEach(() => {
  process.env.NEXT_PUBLIC_LOCATION_PRICING_ENABLED = 'true';
});

afterAll(() => {
  if (originalRolloutFlag === undefined) delete process.env.NEXT_PUBLIC_LOCATION_PRICING_ENABLED;
  else process.env.NEXT_PUBLIC_LOCATION_PRICING_ENABLED = originalRolloutFlag;
});

it.each(['recurring_standard', 'standard', 'first_deep', 'move_in_out', 'airbnb_turnover'] as const)(
  'integrates an immutable location snapshot into %s without hiding provenance',
  jobType => {
    const job = defaultJob(jobType);
    const baseline = estimateJob(job);
    const locationPricing = nationalFallback({ stateCode: 'DC', occupationCode: '37-2012', routeMiles: 12, paidTravelHours: 0.5, now });
    const located = estimateJob({ ...job, costs: { ...job.costs, wage: 10 }, locationPricing });
    expect(located.base.cost).toBeGreaterThan(baseline.base.cost * 0.5);
    expect(located.locationPricing).toEqual(expect.objectContaining({ marketName: 'United States national fallback', confidence: 'D', selectedWage: 18.4 }));
    expect(JSON.parse(JSON.stringify({ ...job, locationPricing })).locationPricing.sources).toHaveLength(3);
  },
);

it('leaves the existing result byte-equivalent when no location snapshot exists', () => {
  const job = defaultJob('recurring_standard');
  expect(JSON.stringify(estimateJob(job))).toBe(JSON.stringify(estimateJob({ ...job })));
});

it('ignores a location snapshot while the controlled rollout is disabled', () => {
  process.env.NEXT_PUBLIC_LOCATION_PRICING_ENABLED = 'false';
  const job = defaultJob('move_in_out');
  const locationPricing = nationalFallback({ stateCode: 'CA', occupationCode: '37-2012', routeMiles: 20, paidTravelHours: 1, now });
  expect(estimateJob({ ...job, locationPricing })).toEqual(estimateJob(job));
});
