import type { JobType } from './schema';
export function catalogPath(job: JobType, context: { source?: string; demoType?: string; designTemplateType?: string; templateId?: string } = {}) {
  const query = new URLSearchParams({ job });
  for (const [key, value] of Object.entries(context)) if (value) query.set(key, value);
  return `/dashboard/proposals/category?${query}`;
}
