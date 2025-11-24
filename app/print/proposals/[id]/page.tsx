import { createServiceClient } from '@/lib/supabase/server';
import { BasicTemplate } from '@/features/templates/components/basic';
import { formatCurrencySafe } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PrintProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createServiceClient();

  const { data: proposal } = await supabase
    .from('proposals')
    .select(`*`)
    .eq('id', id)
    .single();

  let company: { company_name: string; logo_url: string | null } | null = null;
  if (proposal) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, logo_url')
      .eq('id', (proposal as any).user_id)
      .limit(1)
      .single();
    company = profile || null;
  }

  const branding = company
    ? { name: company.company_name, logo_url: company.logo_url }
    : undefined;

  let primary = '#1e3a8a';
  let secondary = '#0ea5e9';
  let accent = '#1f2937';
  if (proposal) {
    const { data: userBranding } = await supabase
      .from('user_branding_settings')
      .select('primary_color, secondary_color, accent_color')
      .eq('user_id', (proposal as any).user_id)
      .single();
    if (userBranding) {
      primary = userBranding.primary_color || primary;
      secondary = userBranding.secondary_color || secondary;
      accent = userBranding.accent_color || accent;
    } else {
      const { data: sys } = await supabase
        .from('system_settings')
        .select('primary_color, secondary_color, accent_color')
        .limit(1)
        .single();
      if (sys) {
        primary = sys.primary_color || primary;
        secondary = sys.secondary_color || secondary;
        accent = sys.accent_color || accent;
      }
    }
  }

  let pages: string[] | undefined = undefined;
  function splitMarkdownIntoSections(
    md: string
  ): { id: string; title?: string | null; content: string }[] {
    const lines = md.split(/\r?\n/);
    const sections: { id: string; title?: string | null; content: string }[] =
      [];
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
    if (sections.length === 0) return [{ id: '1', title: null, content: md }];
    return sections;
  }
  function normalizeTitle(t?: string | null): string {
    return (t || '').trim().toLowerCase();
  }
  if (
    proposal?.generated_content &&
    typeof proposal.generated_content === 'string'
  ) {
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
    let page2 = '';
    if (scope) page2 += `# ${scope.title}\n\n${scope.content.trim()}\n\n`;
    if (legal) page2 += `# ${legal.title}\n\n${legal.content.trim()}\n\n`;
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
      if (rendered) page2 += `# ${pricing.title}\n\n${rendered}\n\n`;
    }
    result.push(page2);
    if (additional) {
      result.push(`# ${additional.title}\n\n${additional.content.trim()}\n`);
    } else {
      result.push('');
    }
    while (result.length < 3) result.push('');
    if (result.length > 3) result.length = 3;
    pages = result;
  }

  let extrasRows:
    | Array<{
        service: string;
        pricePerTime: string | null;
        pricePerMonth: string | null;
      }>
    | undefined = undefined;
  if (proposal) {
    const { data: pas } = await supabase
      .from('proposal_additional_services')
      .select('label, frequency, subtotal, monthly_amount')
      .eq('proposal_id', (proposal as any).id)
      .order('created_at', { ascending: true });
    if (pas && pas.length) {
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
      extrasRows = pas.map((r: any) => ({
        service: r.label,
        pricePerTime: formatCurrencySafe(r.subtotal),
        pricePerMonth:
          r.monthly_amount != null
            ? formatCurrencySafe(r.monthly_amount)
            : computeMonthly(r.subtotal, r.frequency),
      }));
    }
  }

  return (
    <div className="bg-white print-root">
      <style>{`
        @page { size: A4; margin: 0; }
        html, body, .print-root { width: 210mm; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { .no-print { display: none !important; } }
        [id^="page-"] { width: 210mm !important; height: 297mm !important; break-inside: avoid; page-break-after: auto; overflow: hidden; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #page-five { page-break-after: auto; }
        .text-5xl { font-size: 54px !important; line-height: 1.15 !important; }
        [id^="page-"] * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        :root { --color-primary: ${primary}; --color-secondary: ${secondary}; --color-accent: ${accent}; }
      `}</style>
      {proposal ? (
        <BasicTemplate
          proposal={proposal as any}
          branding={branding as any}
          pages={pages}
          print
          extrasRows={extrasRows}
        />
      ) : null}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function check(){var el=document.querySelector('[data-extras-ready="true"]'); if(el){ window.__EXTRAS_READY__=true; } else { setTimeout(check,100);} } check();})();`,
        }}
      />
    </div>
  );
}
