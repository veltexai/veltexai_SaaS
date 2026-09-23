import { z } from 'zod';
import { jobSchema as legacySchema } from './versions/v1/schema';
import { jobSchema as currentSchema, jobInputSchema, type CatalogJob as CurrentJob } from './versions/v2/schema';
export * from './versions/v2/schema';
export type CatalogJob = Omit<CurrentJob, 'catalogVersion'> & { catalogVersion: '2026-09-22.1' | '2026-09-22.2' };
// These additions affect presentation only. V1 pricing and business validation stay frozen.
const presentation = jobInputSchema.pick({ scheduling: true, scopeOmissions: true, scopeAdditions: true, coverLetter: true, companyName: true, demo: true });
export const jobSchema = z.unknown().transform((input, ctx): CatalogJob => {
  if (input && typeof input === 'object' && 'catalogVersion' in input && input.catalogVersion === '2026-09-22.1') {
    const raw = input as Record<string, unknown>;
    const extras = presentation.strip().safeParse(raw);
    const legacy = { ...raw };
    for (const key of Object.keys(presentation.shape)) delete legacy[key];
    const parsed = legacySchema.safeParse(legacy);
    if (!extras.success || !parsed.success) {
      if (!extras.success) extras.error.issues.forEach(issue => ctx.addIssue(issue));
      if (!parsed.success) parsed.error.issues.forEach(issue => ctx.addIssue(issue));
      return z.NEVER;
    }
    return { ...parsed.data, ...extras.data };
  }
  const parsed = currentSchema.safeParse(input);
  if (!parsed.success) { parsed.error.issues.forEach(issue => ctx.addIssue(issue)); return z.NEVER; }
  return parsed.data;
});
