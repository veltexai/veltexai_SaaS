import { estimateJob as legacyEstimate } from './versions/v1/pricing';
import { jobSchema as legacySchema } from './versions/v1/schema';
import { estimateJob as currentEstimate } from './versions/v2/pricing';
import { jobSchema } from './schema';
export { money } from './versions/v2/pricing';
export function estimateJob(input: unknown) {
  const job = jobSchema.parse(input);
  if (job.catalogVersion !== '2026-09-22.1') return currentEstimate(job);
  const { scheduling, scopeOmissions, scopeAdditions, coverLetter, companyName, demo, ...legacy } = job;
  return legacyEstimate(legacySchema.parse(legacy));
}
