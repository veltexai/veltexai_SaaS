'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';

export function ModernCorporateTemplate({ proposal }: TemplateProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1 space-y-6">
        <div className="rounded-lg border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Client</div>
          <div className="mt-2 font-medium">{proposal.client_name}</div>
          {proposal.client_company && <div className="text-sm">{proposal.client_company}</div>}
          {proposal.client_email && <div className="text-sm">{proposal.client_email}</div>}
        </div>
        <div className="rounded-lg border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Service</div>
          <div className="mt-2 text-sm capitalize">{proposal.service_type}</div>
          <div className="text-sm capitalize">{proposal.service_frequency}</div>
          <div className="text-sm">{proposal.service_location}</div>
        </div>
        <div className="rounded-lg border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Facility</div>
          <div className="mt-2 text-sm">{proposal.facility_size} sq ft</div>
        </div>
      </aside>

      <main className="lg:col-span-3">
        <div className="rounded-xl border p-8">
          <h1 className="text-2xl font-bold">{proposal.title}</h1>
          <div className="mt-6">
            {proposal.generated_content ? (
              <div className="prose max-w-none">
                <MarkdownRenderer content={proposal.generated_content} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No AI content yet.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}