'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';

export function LuxuryEliteTemplate({ proposal }: TemplateProps) {
  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-neutral-900 text-neutral-100 p-10">
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">Luxury Elite</div>
        <h1 className="text-3xl font-extrabold mt-3">{proposal.title}</h1>
        <div className="mt-5 flex flex-wrap gap-4 text-sm text-neutral-300">
          <span>Client: {proposal.client_name}</span>
          <span>Type: {proposal.service_type}</span>
          <span>Frequency: {proposal.service_frequency}</span>
          <span>Facility: {proposal.facility_size} sq ft</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl border p-8">
          <h2 className="text-xl font-semibold mb-4">Overview</h2>
          {proposal.generated_content ? (
            <div className="prose prose-invert max-w-none">
              <MarkdownRenderer content={proposal.generated_content} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No AI content yet.</div>
          )}
        </div>
        <div className="rounded-2xl border p-8 bg-muted/30">
          <h3 className="text-sm font-semibold text-muted-foreground">Highlights</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Premium service standards</li>
            <li>Discreet scheduling</li>
            <li>Quality assurance checkpoints</li>
          </ul>
        </div>
      </div>
    </div>
  );
}