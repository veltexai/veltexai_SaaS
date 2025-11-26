export type Section = {
  id: string;
  title?: string | null;
  description?: string | null;
  content: string;
};

export function splitMarkdownIntoSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const sections: Section[] = [];
  let currentTitle: string | null = null;
  let currentContent: string[] = [];
  const flush = () => {
    const content = currentContent.join('\n').trim();
    if (content.length > 0 || (currentTitle && currentTitle.length > 0)) {
      sections.push({ id: `${sections.length + 1}`, title: currentTitle, content });
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
  if (sections.length === 0) return [{ id: '1', title: null, content: md }];
  return sections;
}

export function normalizeTitle(t?: string | null): string {
  return (t || '').trim().toLowerCase();
}

export function byTitleMap(sections: Section[]): Map<string, Section> {
  const map = new Map<string, Section>();
  sections.forEach((s) => map.set(normalizeTitle(s.title ?? ''), s));
  return map;
}

export function assembleBasicPages(sections: Section[]): string[] {
  const byTitle = byTitleMap(sections);
  const get = (k: string) => byTitle.get(normalizeTitle(k));
  const getAny = (keys: string[]) => {
    for (const k of keys) {
      const v = get(k);
      if (v) return v;
    }
    return undefined;
  };
  const cover = get('Cover letter');
  const scope = get('Scope of service');
  const legal = get('Legal responsibility');
  const pricing = get('Pricing');
  const additional = getAny([
    'Additional services to be invoiced (Optional)',
    'Additional services to be invoiced',
  ]);
  const pages: string[] = [];
  if (cover) pages.push(`# ${cover.title}\n\n${cover.content.trim()}\n`);
  else pages.push('');
  let page2 = '';
  if (scope) page2 += `# ${scope.title}\n\n${scope.content.trim()}\n\n`;
  if (legal) page2 += `# ${legal.title}\n\n${legal.content.trim()}\n\n`;
  if (pricing) {
    const lines = pricing.content.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] ?? '';
    let rendered = '';
    if (firstLine) {
      const m = firstLine.match(/^([A-Z]\s*[\.|\)])\s+(.*)$/);
      if (m) {
        const bullet = m[1].replace(/\s+/g, '');
        rendered = `**${bullet}** ${m[2].trim()}`;
      } else {
        rendered = firstLine;
      }
    }
    if (rendered) page2 += `# ${pricing.title}\n\n${rendered}\n\n`;
  }
  pages.push(page2);
  if (additional) pages.push(`# ${additional.title}\n\n${additional.content.trim()}\n`);
  else pages.push('');
  while (pages.length < 3) pages.push('');
  if (pages.length > 3) pages.length = 3;
  return pages;
}

export function extractNonBasicBodies(sections: Section[]): string[] {
  const byTitle = byTitleMap(sections);
  const get = (k: string) => byTitle.get(normalizeTitle(k));
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
  let pricing = getAny(['Service Quote & Pricing', 'Pricing']);
  let notes = get('notes') || get('Notes');

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
        const contentText = [titleText, ...items.map((t) => `- ${t}`)].join('\n');
        addons = { id: 'synthetic-addons', title: titleText, content: contentText } as any;
      }
    }
  }

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
        while (i < srcLines.length) {
          const nx = (srcLines[i] ?? '').trim();
          if (/^#{1,3}\s+/.test(nx) || /^```/.test(nx)) break;
          i += 1;
        }
        continue;
      }
      out.push(srcLines[i] ?? '');
      i += 1;
      if (isFence) {
        while (i < srcLines.length && !/^```/.test((srcLines[i] ?? '').trim())) {
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
    scope = { ...(scope as any), content: cleaned } as any;
  }

  if (pricing?.content && !notes) {
    const lines = pricing.content.split('\n');
    const fenceOpenIdx = lines.findIndex((l) => l.startsWith('```') && l.toLowerCase().includes('veliz_pricing_table'));
    let fenceCloseIdx = -1;
    if (fenceOpenIdx >= 0) {
      let i = fenceOpenIdx + 1;
      while (i < lines.length && !lines[i].startsWith('```')) i++;
      if (i < lines.length && lines[i].startsWith('```')) fenceCloseIdx = i;
    }
    const notesStartIdx = lines.findIndex((l, idx) => {
      const t = l.trim();
      if (idx <= (fenceCloseIdx >= 0 ? fenceCloseIdx : fenceOpenIdx >= 0 ? fenceOpenIdx : -1)) return false;
      return /^#{1,3}\s*notes\s*$/i.test(t) || /^notes:?\s*$/i.test(t);
    });
    if (notesStartIdx >= 0) {
      const titleLine = lines[notesStartIdx].trim();
      const title = titleLine.replace(/^#{1,3}\s+/i, '').replace(/:$/, '').trim() || 'Notes';
      const noteItems: string[] = [];
      for (let j = notesStartIdx + 1; j < lines.length; j++) {
        const cur = (lines[j] || '').trim();
        if (!cur) continue;
        if (/^#{1,3}\s+/.test(cur) || /^```/.test(cur)) break;
        if (/^[-*]\s+/.test(cur)) noteItems.push(cur.replace(/^[-*]\s+/, ''));
        else noteItems.push(cur);
      }
      const notesContent = [title, ...noteItems.map((t) => `- ${t}`)].join('\n');
      notes = { id: 'synthetic-notes', title, content: notesContent } as any;
      const pricingHead = lines.slice(0, notesStartIdx);
      pricing = { ...(pricing as any), content: pricingHead.join('\n').trim() } as any;
    }
  }

  const bodies = [
    (about?.content || '').trim(),
    (commitment?.content || '').trim(),
    (whyUs?.content || '').trim(),
    (scope?.content || '').trim(),
    (addons?.content || '').trim(),
    (pricing?.content || '').trim(),
    (notes?.content || '').trim(),
  ];
  while (bodies.length < 7) bodies.push('');
  if (bodies.length > 7) bodies.length = 7;
  return bodies;
}

