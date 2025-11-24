import { useEffect, useMemo, useState } from 'react';

type Section = {
  id: string;
  title?: string | null;
  description?: string | null;
  content: string;
};
type SplitResponse = {
  sections: Section[];
  pages: string[];
  templateType:
    | 'basic'
    | 'executive_premium'
    | 'modern_corporate'
    | 'luxury_elite';
  error?: string;
};

export function useSplitContent(proposalId?: string) {
  const [data, setData] = useState<SplitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!proposalId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/proposals/${proposalId}/split`);
        const json: SplitResponse = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to split');
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Failed to load pages');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [proposalId]);

  const byTitle = useMemo(() => {
    const map = new Map<string, Section>();
    (data?.sections ?? []).forEach((s) => {
      const key = (s.title || '').trim().toLowerCase();
      if (key) map.set(key, s);
    });
    return map;
  }, [data]);

  const get = (key: string) => byTitle.get(key.trim().toLowerCase());
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
  let scope = getAny(['Scope of service', 'Scope']);
  let addons = getAny([
    'Add-ons',
    'Additional services',
    'Additional services to be invoiced',
    'Add ons',
    'Addons',
  ]);
  if (!addons && scope?.content) {
    const lines = scope.content.split('\n').map((l) => l.trim());
    let startIdx = -1;
    let titleText = 'Add-ons';
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const norm = ln.toLowerCase();
      if (
        norm === 'add-ons' ||
        norm === 'addons' ||
        norm === 'add ons' ||
        norm.includes('additional services to be invoiced') ||
        norm === 'additional services' ||
        (/^#{1,3}\s+/.test(ln) && /add[-\s]?ons|additional services/i.test(ln))
      ) {
        startIdx = i;
        titleText = ln.replace(/^#{1,3}\s+/, '').trim() || 'Add-ons';
        break;
      }
    }
    if (startIdx >= 0) {
      const items: string[] = [];
      for (let j = startIdx + 1; j < lines.length; j++) {
        const cur = lines[j];
        if (!cur) continue;
        if (/^#{1,3}\s+/.test(cur) || /^```/.test(cur)) break;
        if (/^[-*]\s+/.test(cur)) items.push(cur.replace(/^[-*]\s+/, ''));
        else items.push(cur);
      }
      if (items.length) {
        const contentText = [titleText, ...items.map((t) => `- ${t}`)].join(
          '\n'
        );
        addons = {
          id: 'synthetic-addons',
          title: titleText,
          content: contentText,
        };
      }
    }
  }
  // Ensure scope content excludes embedded add-ons blocks
  if (scope?.content) {
    const srcLines = scope.content.split('\n');
    const out: string[] = [];
    let i = 0;
    while (i < srcLines.length) {
      const ln = (srcLines[i] ?? '').trim();
      const isHeader = /^#{1,3}\s+/.test(ln);
      const isFence = /^```/.test(ln);
      const isAddonsHeader =
        ln.toLowerCase() === 'add-ons' ||
        ln.toLowerCase() === 'addons' ||
        ln.toLowerCase() === 'add ons' ||
        ln.toLowerCase() === 'additional services' ||
        ln.toLowerCase().includes('additional services to be invoiced') ||
        (isHeader && /add[-\s]?ons|additional services/i.test(ln));
      if (isAddonsHeader) {
        i += 1;
        // Skip until next header or fenced block or end
        while (i < srcLines.length) {
          const nx = (srcLines[i] ?? '').trim();
          if (/^#{1,3}\s+/.test(nx) || /^```/.test(nx)) break;
          i += 1;
        }
        // Do not push the add-ons header or items
        continue;
      }
      out.push(srcLines[i] ?? '');
      i += 1;
      // Copy fenced blocks verbatim
      if (isFence) {
        while (
          i < srcLines.length &&
          !/^```/.test((srcLines[i] ?? '').trim())
        ) {
          out.push(srcLines[i] ?? '');
          i += 1;
        }
        if (i < srcLines.length) {
          out.push(srcLines[i] ?? '');
          i += 1;
        }
      }
    }
    const cleaned = out.join('\n').trim();
    scope = { ...(scope as any), content: cleaned } as typeof scope;

    // Extract scope description from lines before veliz_scope_table fenced block
    const lines = cleaned.split('\n');
    const isFenceOpen = (l: string) =>
      l.startsWith('```') && l.toLowerCase().includes('veliz_scope_table');
    let fenceStart = -1;
    let fenceEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (fenceStart < 0 && isFenceOpen(ln)) {
        fenceStart = i;
        for (let j = i + 1; j < lines.length; j++) {
          if ((lines[j] ?? '').startsWith('```')) {
            fenceEnd = j;
            break;
          }
        }
        break;
      }
    }
    if (fenceStart > 0) {
      const pre = lines
        .slice(0, fenceStart)
        .map((l) => l.trim())
        .filter((l) => l && !/^#{1,3}\s+/.test(l));
      const desc = pre.join(' ');
      if (desc) {
        scope = { ...(scope as any), description: desc } as typeof scope;
      }
    }

    if (!scope?.description) {
      const ln = lines.map((l) => l.trim());
      const isHeader = (l: string) => /^#{1,3}\s+/.test(l);
      const isBullet = (l: string) => /^[-*]\s+/.test(l);
      const insideFence = (idx: number) =>
        fenceStart >= 0 &&
        fenceEnd >= 0 &&
        idx >= fenceStart &&
        idx <= fenceEnd;
      const firstIdx = ln.findIndex(
        (l, idx) => l && !isHeader(l) && !isBullet(l) && !insideFence(idx)
      );
      if (firstIdx >= 0) {
        scope = {
          ...(scope as any),
          description: ln[firstIdx],
        } as typeof scope;
      }
    }

    // Explicit fallback: use standard scope description when only table is present
    if (
      (!scope?.description || !scope.description.trim()) &&
      scope?.content?.toLowerCase().includes('veliz_scope_table')
    ) {
      const DEFAULT_SCOPE_DESCRIPTION =
        'Below is a representative scope structured for automation. Adjust tasks and frequencies per site. This table should expand/collapse cleanly based on selected areas and add-ons.';
      scope = {
        ...(scope as any),
        description: DEFAULT_SCOPE_DESCRIPTION,
      } as typeof scope;
    }
  }
  let pricing = getAny(['Service Quote & Pricing', 'Pricing']);
  let notes = get('notes');

  // Extract Notes from pricing.content when backend bundled them together
  if (pricing?.content && !notes) {
    const lines = pricing.content.split('\n');
    const fenceOpenIdx = lines.findIndex(
      (l) =>
        l.startsWith('```') && l.toLowerCase().includes('veliz_pricing_table')
    );
    let fenceCloseIdx = -1;
    if (fenceOpenIdx >= 0) {
      let i = fenceOpenIdx + 1;
      while (i < lines.length && !lines[i].startsWith('```')) i++;
      if (i < lines.length && lines[i].startsWith('```')) fenceCloseIdx = i;
    }
    const notesStartIdx = lines.findIndex((l, idx) => {
      const t = l.trim();
      if (
        idx <=
        (fenceCloseIdx >= 0
          ? fenceCloseIdx
          : fenceOpenIdx >= 0
          ? fenceOpenIdx
          : -1)
      )
        return false;
      return /^#{1,3}\s+notes\s*$/i.test(t) || /^notes:?\s*$/i.test(t);
    });
    if (notesStartIdx >= 0) {
      const titleLine = lines[notesStartIdx].trim();
      const title =
        titleLine
          .replace(/^#{1,3}\s+/i, '')
          .replace(/:$/, '')
          .trim() || 'Notes';
      const noteItems: string[] = [];
      for (let j = notesStartIdx + 1; j < lines.length; j++) {
        const cur = (lines[j] || '').trim();
        if (!cur) continue;
        if (/^#{1,3}\s+/.test(cur) || /^```/.test(cur)) break;
        if (/^[-*]\s+/.test(cur)) noteItems.push(cur.replace(/^[-*]\s+/, ''));
        else noteItems.push(cur);
      }
      const notesContent = [title, ...noteItems.map((t) => `- ${t}`)].join(
        '\n'
      );
      notes = {
        id: 'synthetic-notes',
        title,
        content: notesContent,
      };
      const pricingHead = lines.slice(0, notesStartIdx);
      pricing = {
        ...(pricing as any),
        content: pricingHead.join('\n').trim(),
      } as typeof pricing;
    }

    // Also capture description before pricing table
    if (fenceOpenIdx > 0) {
      const pre = lines
        .slice(0, fenceOpenIdx)
        .map((l) => l.trim())
        .filter((l) => l && !/^#{1,3}\s+/.test(l));
      const desc = pre.join(' ');
      pricing = { ...(pricing as any), description: desc } as typeof pricing;
    }
  }

  return {
    data,
    pages: data?.pages ?? [],
    templateType: data?.templateType,
    loading,
    error,
    byTitle,
    get,
    getAny,
    about,
    commitment,
    whyUs,
    scope,
    addons,
    pricing,
    notes,
  } as const;
}
