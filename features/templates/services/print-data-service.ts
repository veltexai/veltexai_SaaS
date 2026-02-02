import { createServiceClient } from '@/lib/supabase/server';
import { formatCurrencySafe } from '@/lib/utils';
import {
  normalizeTitle,
  splitMarkdownIntoSections,
} from '@/features/templates/utils/splitters';

async function getProposalData(id: string) {
  const supabase = createServiceClient();
  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, template:proposal_templates(*)')
    .eq('id', id)
    .single();
  return proposal;
}

async function getBranding(proposal: any) {
  if (!proposal) return undefined;
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, full_name, logo_url, phone, website, email')
    .eq('id', proposal.user_id)
    .limit(1)
    .single();
  return profile
    ? {
        name: profile.company_name || profile.full_name || 'Company',
        logo_url: profile.logo_url,
        phone: profile.phone || null,
        website: profile.website || null,
        email: profile.email || null,
      }
    : undefined;
}

async function getColors(proposal: any) {
  if (!proposal)
    return { primary: '#1e3a8a', secondary: '#0ea5e9', accent: '#1f2937' };
  const supabase = createServiceClient();
  const { data: userBranding } = await supabase
    .from('user_branding_settings')
    .select('primary_color, secondary_color, accent_color')
    .eq('user_id', proposal.user_id)
    .single();
  if (userBranding) {
    return {
      primary: userBranding.primary_color || '#1e3a8a',
      secondary: userBranding.secondary_color || '#0ea5e9',
      accent: userBranding.accent_color || '#1f2937',
    };
  }
  const { data: sys } = await supabase
    .from('system_settings')
    .select('primary_color, secondary_color, accent_color')
    .limit(1)
    .single();
  return {
    primary: sys?.primary_color || '#1e3a8a',
    secondary: sys?.secondary_color || '#0ea5e9',
    accent: sys?.accent_color || '#1f2937',
  };
}

function getPages(proposal: any) {
  if (
    !proposal?.generated_content ||
    typeof proposal.generated_content !== 'string'
  ) {
    return undefined;
  }
  const sections = splitMarkdownIntoSections(
    proposal.generated_content as string
  );
  const byTitle = new Map<
    string,
    { id: string; title?: string | null; content: string }
  >();
  sections.forEach((s) => byTitle.set(normalizeTitle(s.title ?? ''), s));
  const get = (key: string) => byTitle.get(normalizeTitle(key));
  const getAny = (keys: string[]) => {
    for (const k of keys) {
      const v = get(k);
      if (v) return v;
    }
    return undefined;
  };

  const name = (proposal?.template?.name || '').toLowerCase();
  const isBasic =
    name.includes('basic') ||
    (proposal?.template?.template_type ?? '') === 'basic';

  if (isBasic) {
    const cover = get('Cover letter');
    const scope = get('Scope of service');
    const legal = get('Legal responsibility');
    const pricing = get('Pricing');
    const additional = getAny([
      'Additional services to be invoiced (Optional)',
      'Additional services to be invoiced',
    ]);
    const result: string[] = [];
    if (cover) {
      result.push(`# ${cover.title}\n\n${cover.content.trim()}\n`);
    } else {
      result.push('');
    }
    
    // Parse scope content to check if we need pagination
    let scopePages: string[] = [];
    const MAX_ROWS_PER_PAGE = 8;
    
    if (scope) {
      const scopeContent = scope.content.trim();
      const scopeLines = scopeContent.split('\n');
      
      // Find veliz_scope_table block and parse it
      let tableStartIdx = -1;
      let tableEndIdx = -1;
      let tableJson = '';
      
      for (let i = 0; i < scopeLines.length; i++) {
        const line = scopeLines[i].trim();
        if (line.startsWith('```') && line.toLowerCase().includes('veliz_scope_table')) {
          tableStartIdx = i;
          i++;
          const jsonLines: string[] = [];
          while (i < scopeLines.length && !scopeLines[i].trim().startsWith('```')) {
            jsonLines.push(scopeLines[i]);
            i++;
          }
          tableEndIdx = i;
          tableJson = jsonLines.join('\n');
          break;
        }
      }
      
      if (tableJson) {
        try {
          const data = JSON.parse(tableJson);
          let allRows = data?.rows ?? [];
          
          // Expand comma-separated areas into individual rows
          const expandedRows: any[] = [];
          for (const row of allRows) {
            if (typeof row.area === 'string' && row.area.includes(',')) {
              const splitAreas = row.area.split(',').map((s: string) => s.trim()).filter((s: string) => s);
              for (const areaName of splitAreas) {
                expandedRows.push({ ...row, area: areaName });
              }
            } else {
              expandedRows.push(row);
            }
          }
          
          if (expandedRows.length > MAX_ROWS_PER_PAGE) {
            // Need to paginate scope
            const beforeTable = scopeLines.slice(0, tableStartIdx).join('\n').trim();
            const afterTable = scopeLines.slice(tableEndIdx + 1).join('\n').trim();
            
            // Split rows into chunks
            const chunks: any[][] = [];
            for (let i = 0; i < expandedRows.length; i += MAX_ROWS_PER_PAGE) {
              chunks.push(expandedRows.slice(i, i + MAX_ROWS_PER_PAGE));
            }
            
            // First page: title + description + first chunk of rows
            const firstChunkJson = JSON.stringify({ rows: chunks[0] });
            scopePages.push(`# ${scope.title}\n\n${beforeTable}\n\n\`\`\`veliz_scope_table\n${firstChunkJson}\n\`\`\`\n`);
            
            // Continuation pages: just rows (no afterTable content yet)
            for (let c = 1; c < chunks.length; c++) {
              const chunkJson = JSON.stringify({ rows: chunks[c] });
              const isLast = c === chunks.length - 1;
              scopePages.push(`# ${scope.title} \n\n\`\`\`veliz_scope_table\n${chunkJson}\n\`\`\`\n${isLast ? '\n' + afterTable : ''}`);
            }
          } else {
            // No pagination needed
            scopePages.push(`# ${scope.title}\n\n${scopeContent}\n\n`);
          }
        } catch {
          // JSON parse failed, use original
          scopePages.push(`# ${scope.title}\n\n${scopeContent}\n\n`);
        }
      } else {
        // No table found, use original
        scopePages.push(`# ${scope.title}\n\n${scopeContent}\n\n`);
      }
    }
    
    // Build legal + pricing content
    let legalPricingContent = '';
    if (legal) legalPricingContent += `# ${legal.title}\n\n${legal.content.trim()}\n\n`;
    if (pricing) {
      const lines = pricing.content
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
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
      if (rendered) legalPricingContent += `# ${pricing.title}\n\n${rendered}\n\n`;
    }
    
    // If scope needed pagination, put legal+pricing on last scope page or separate page
    if (scopePages.length > 1) {
      // Append legal+pricing to the last scope page
      scopePages[scopePages.length - 1] += legalPricingContent;
      // Add all scope pages to result
      for (const sp of scopePages) {
        result.push(sp);
      }
    } else if (scopePages.length === 1) {
      // Single scope page - combine with legal+pricing as before
      result.push(scopePages[0] + legalPricingContent);
    } else {
      // No scope - just add legal+pricing
      result.push(legalPricingContent);
    }
    
    if (additional) {
      result.push(`# ${additional.title}\n\n${additional.content.trim()}\n`);
    } else {
      result.push('');
    }
    // Don't limit to 3 pages anymore since we may have overflow pages
    while (result.length < 3) result.push('');
    return result;
  }

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
        const contentText = [titleText, ...items.map((t) => `- ${t}`)].join(
          '\n'
        );
        addons = {
          id: 'synthetic-addons',
          title: titleText,
          content: contentText,
        } as any;
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
  }

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
      return /^#{1,3}\s*notes\s*$/i.test(t) || /^notes:?\s*$/i.test(t);
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
      notes = { id: 'synthetic-notes', title, content: notesContent } as any;
      const pricingHead = lines.slice(0, notesStartIdx);
      pricing = {
        ...(pricing as any),
        content: pricingHead.join('\n').trim(),
      } as any;
    }
  }

  const toBody = (s?: { content: string }) => (s?.content || '').trim();
  const result = [
    toBody(about),
    toBody(commitment),
    toBody(whyUs),
    toBody(scope),
    toBody(addons),
    toBody(pricing),
    toBody(notes),
  ];
  while (result.length < 7) result.push('');
  if (result.length > 7) result.length = 7;
  return result;
}

async function getExtrasRows(proposal: any) {
  if (!proposal) return undefined;
  const supabase = createServiceClient();
  const { data: pas } = await supabase
    .from('proposal_additional_services')
    .select('label, frequency, subtotal, monthly_amount')
    .eq('proposal_id', proposal.id)
    .order('created_at', { ascending: true });
  if (!pas || !pas.length) return undefined;

  const computeMonthly = (subtotal: any, frequency: string | null) => {
    const raw =
      typeof subtotal === 'number'
        ? subtotal
        : parseFloat(String(subtotal).replace(/[^0-9.-]/g, '')) || 0;
    if (!frequency) return null;
    const f = frequency.toLowerCase();
    if (f === 'monthly') return formatCurrencySafe(raw);
    if (f === 'quarterly') return formatCurrencySafe(raw / 3.0);
    if (f === 'annual') return formatCurrencySafe(raw / 12.0);
    return null;
  };

  return pas.map((r: any) => ({
    service: r.label,
    pricePerTime: formatCurrencySafe(r.subtotal),
    pricePerMonth:
      r.monthly_amount != null
        ? formatCurrencySafe(r.monthly_amount)
        : computeMonthly(r.subtotal, r.frequency),
  }));
}

export async function getPrintPageData(id: string) {
  const proposal = await getProposalData(id);
  const [branding, colors, pages, extrasRows] = await Promise.all([
    getBranding(proposal),
    getColors(proposal),
    getPages(proposal),
    getExtrasRows(proposal),
  ]);

  return {
    proposal,
    branding,
    colors,
    pages,
    extrasRows,
  };
}
