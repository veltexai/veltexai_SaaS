import { defaultJob } from '@/features/service-catalog/versions/v2/catalog';
import { estimateJob } from '@/features/service-catalog/versions/v2/pricing';

it('reproduces the anonymized Washington extreme-turnover comparison', () => {
  const job = defaultJob('move_in_out');
  const result = estimateJob({
    ...job,
    squareFeet: 1064,
    bedrooms: 3,
    bathrooms: 1.5,
    levels: 2,
    condition: 'heavy',
    clutter: 'heavy',
    monthsSinceClean: 12,
    pets: true,
    applianceInteriors: 2,
    costs: {
      ...job.costs,
      crewSize: 2,
      laborHours: 22,
      wage: 25,
      supplies: 35,
      equipment: 10,
      travel: 20,
      burdenPercent: 25,
      overheadPercent: 15,
      marginPercent: 25,
      uncertaintyPercent: 20,
    },
  });

  expect(result.low.suggestedPrice).toBe(945);
  expect(result.base.suggestedPrice).toBe(1155);
  expect(result.high.suggestedPrice).toBe(1365);
  expect(result.base.laborHours).toBe(22);
  expect(result.base.elapsedCrewHours).toBe(11);
});
