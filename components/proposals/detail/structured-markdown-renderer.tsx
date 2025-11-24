'use client';

import React from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

type Section = { id: string; title?: string | null; content: string };
type TemplateType =
  | 'basic'
  | 'executive_premium'
  | 'modern_corporate'
  | 'luxury_elite';

interface StructuredMarkdownRendererProps {
  proposalId: string;
  content: string;
}

export default function StructuredMarkdownRenderer({
  proposalId,
  content,
}: StructuredMarkdownRendererProps) {
  const [templateType, setTemplateType] = React.useState<TemplateType>('basic');
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function detect() {
      try {
        const res = await fetch(`/api/proposals/${proposalId}/split`, {
          cache: 'no-store',
        });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setTemplateType((json?.templateType ?? 'basic') as TemplateType);
        }
      } catch {}
      if (mounted) setReady(true);
    }
    detect();
    return () => {
      mounted = false;
    };
  }, [proposalId]);

  if (!ready) {
    return <div className="prose max-w-none">Loading content…</div>;
  }

  if (templateType === 'basic') {
    return <MarkdownRenderer content={content} proposalId={proposalId} />;
  }

  const sections = splitMarkdownIntoSections(content);
  const pages = assemblePremiumPages(sections);

  return (
    <div className="space-y-12">
      {pages.map((page, i) => (
        <div key={`page-${i}`} className="prose max-w-none">
          <MarkdownRenderer content={page} proposalId={proposalId} />
        </div>
      ))}
    </div>
  );
}

function splitMarkdownIntoSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const sections: Section[] = [];
  let currentTitle: string | null = null;
  let currentContent: string[] = [];
  const flush = () => {
    const content = currentContent.join('\n').trim();
    if (content.length > 0 || (currentTitle && currentTitle.length > 0)) {
      sections.push({
        id: `${sections.length + 1}`,
        title: currentTitle,
        content,
      });
    }
    currentTitle = null;
    currentContent = [];
  };
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      currentTitle = heading[1].trim();
    } else {
      currentContent.push(line);
    }
  }
  flush();
  if (sections.length === 0) {
    return [{ id: '1', title: null, content: md }];
  }
  return sections;
}

function normalizeTitle(t?: string | null): string {
  return (t || '').trim().toLowerCase();
}

function assemblePremiumPages(sections: Section[]): string[] {
  const byTitle = new Map<string, Section>();
  sections.forEach((s) => byTitle.set(normalizeTitle(s.title ?? ''), s));

  const get = (key: string) => byTitle.get(normalizeTitle(key));
  const getAny = (keys: string[]) => {
    for (const k of keys) {
      const v = get(k);
      if (v) return v;
    }
    return undefined;
  };

  const about = getAny(['About Our Company', 'About our company']);
  const commitment = getAny(['Our Commitment', 'Commitment']);
  const whyUs = getAny(['Why Choose Us', 'Why choose us']);
  const scope = getAny(['Scope of service', 'Scope']);
  const addons = getAny([
    'Add-ons',
    'Additional services',
    'Additional services to be invoiced (Optional)',
  ]);
  const pricing = getAny(['Service Quote & Pricing', 'Pricing']);
  const notes = get('Notes');

  const pages: string[] = [];
  // Page 1: About Our Company
  pages.push(about ? `# ${about.title}\n\n${about.content.trim()}\n` : '');
  // Page 2: Our Commitment + Why Choose Us
  let page2 = '';
  if (commitment)
    page2 += `# ${commitment.title}\n\n${commitment.content.trim()}\n\n`;
  if (whyUs) page2 += `# ${whyUs.title}\n\n${whyUs.content.trim()}\n`;
  pages.push(page2);
  // Page 3: Scope of service + Add-ons
  let page3 = '';
  if (scope) page3 += `# ${scope.title}\n\n${scope.content.trim()}\n\n`;
  if (addons) page3 += `# ${addons.title}\n\n${addons.content.trim()}\n`;
  pages.push(page3);
  // Page 4: Service Quote & Pricing + Notes
  let page4 = '';
  if (pricing) page4 += `# ${pricing.title}\n\n${pricing.content.trim()}\n\n`;
  if (notes) page4 += `# ${notes.title}\n\n${notes.content.trim()}\n`;
  pages.push(page4);

  while (pages.length < 4) pages.push('');
  if (pages.length > 4) pages.length = 4;
  return pages;
}
