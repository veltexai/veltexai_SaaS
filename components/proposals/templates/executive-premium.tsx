'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';

export function ExecutivePremiumTemplate({ proposal }: TemplateProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white">
        <div className="text-sm uppercase tracking-wide opacity-90">Executive Proposal</div>
        <h1 className="text-3xl font-extrabold mt-2">{proposal.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1">
            Client: <span className="ml-1 font-semibold">{proposal.client_name}</span>
          </span>
          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1">
            Type: <span className="ml-1 font-semibold capitalize">{proposal.service_type}</span>
          </span>
          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1">
            Frequency: <span className="ml-1 font-semibold capitalize">{proposal.service_frequency}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
          {proposal.generated_content ? (
            <div className="prose max-w-none">
              <MarkdownRenderer content={proposal.generated_content} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No AI content yet.</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-6">
            <h3 className="text-sm font-semibold text-muted-foreground">Key Details</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div>Company: {proposal.client_company || '—'}</div>
              <div>Location: {proposal.service_location}</div>
              <div>Facility: {proposal.facility_size} sq ft</div>
            </div>
          </div>
          <div className="rounded-xl border p-6 bg-muted/40">
            <h3 className="text-sm font-semibold text-muted-foreground">Acceptance</h3>
            <div className="mt-4 text-sm">
              This proposal remains valid for 30 days from issue.
              Contact us to finalize scope and scheduling.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}