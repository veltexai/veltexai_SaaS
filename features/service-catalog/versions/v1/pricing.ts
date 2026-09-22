import { getService } from './catalog';
import { jobSchema } from './schema';
import { ZodError } from 'zod';

export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function estimateJob(input: unknown) {
  const job = jobSchema.parse(input);
  const service = getService(job.jobType);
  const c = job.costs;
  const condition = { light: 0.85, normal: 1, heavy: 1.5 }[job.condition];
  const recurrence = job.frequency === '1x-month' ? 1.15 : job.frequency === 'bi-weekly' ? 1.05 : 1;
  const extraHours = job.applianceInteriors * 0.5 + (job.pets ? 0.25 : 0) +
    (job.turnover ? job.turnover.laundryLoads * 0.35 + (job.turnover.restocking ? 0.25 : 0) + (job.turnover.inspection ? 0.25 : 0) + (job.turnover.damageDocumentation ? 0.15 : 0) : 0);
  const modeledHours = Math.max(job.squareFeet / service.production.base, job.bedrooms * 0.25 + job.bathrooms * 0.6) * condition * recurrence + extraHours;
  const hours = c.laborHours ?? modeledHours;
  const scenario = (factor: number) => {
    const laborHours = money(hours * factor);
    const labor = money(laborHours * c.wage * (1 + c.burdenPercent / 100));
    const supplies = job.suppliesProvided ? 0 : c.supplies;
    const directCost = money(labor + supplies + c.equipment + c.travel);
    const overhead = money(directCost * c.overheadPercent / 100);
    const cost = money(directCost + overhead);
    const beforeMinimum = money(cost / (1 - c.marginPercent / 100));
    const suggestedPrice = money(Math.max(c.minimumCharge, beforeMinimum));
    return { laborHours, elapsedCrewHours: money(laborHours / c.crewSize), labor, supplies, equipment: c.equipment, travel: c.travel, directCost, overhead, cost, marginAmount: money(suggestedPrice - cost), minimumAdjustment: money(suggestedPrice - beforeMinimum), suggestedPrice };
  };
  const low = scenario(1 - c.uncertaintyPercent / 100), base = scenario(1), high = scenario(1 + c.uncertaintyPercent / 100);
  const selectedPrice = job.override?.pricePerVisit ?? base.suggestedPrice;
  if (selectedPrice < 0.01) throw new ZodError([{ code: 'custom', path: ['costs'], message: 'The selected price must be at least one cent. Review costs and minimum charge.' }]);
  const visitsPerMonth = { 'one-time': 1, weekly: 52 / 12, 'bi-weekly': 26 / 12, '1x-month': 1 }[job.frequency];
  const warnings = ['Planning assumptions have not been validated by a cleaning operator. Confirm after a walkthrough.'];
  if (c.wage === 0) warnings.push('Labor wage is zero; confirm the actual labor cost.');
  if (selectedPrice < base.cost) warnings.push('Operator price is below modeled cost.');
  if (c.laborHours !== undefined) warnings.push('Operator labor hours replace the room/area model.');
  if (job.condition === 'heavy') warnings.push('Heavy condition needs a walkthrough and explicit scope confirmation.');
  if (job.turnover) {
    const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
    const windowHours = (minutes(job.turnover.checkin) - minutes(job.turnover.checkout)) / 60;
    if (high.elapsedCrewHours > windowHours) warnings.push('High scenario exceeds the turnover window. Adjust crew, scope or check-in agreement.');
    if (job.turnover.laundryLoads) warnings.push('Laundry adds hands-on labor only. Confirm machine capacity and cycle time fit the window.');
    if (job.turnover.restocking) warnings.push('Restocking assumes customer inventory; purchased inventory is excluded.');
  }
  return { version: job.catalogVersion, strategy: service.strategy, unit: 'per_visit' as const, low, base, high, selectedPrice,
    drivers: { squareFeetPerPersonHour: service.production.base, roomMinimumHours: money(job.bedrooms * 0.25 + job.bathrooms * 0.6), conditionMultiplier: condition, recurrenceMultiplier: recurrence, additionalHours: money(extraHours) },
    modeledHours: money(modeledHours), visitsPerMonth, periodPrice: money(selectedPrice * visitsPerMonth),
    effectiveMarginPercent: selectedPrice > 0 ? money((selectedPrice - base.cost) / selectedPrice * 100) : 0, warnings };
}
