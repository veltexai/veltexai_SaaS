import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type Section = {
  id: string;
  title?: string | null;
  content: string;
};

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

  // Fallback: if no sections with titles, return a single section
  if (sections.length === 0) {
    return [
      {
        id: '1',
        title: null,
        content: md,
      },
    ];
  }
  return sections;
}

function chunkSectionsIntoPages(sections: Section[], pageCount: number): string[] {
  // Simple heuristic: distribute sections into N pages by total content length
  const totalLength = sections.reduce((sum, s) => sum + s.content.length, 0);
  const targetPerPage = Math.max(1, Math.floor(totalLength / pageCount));

  const pages: string[] = [];
  let current = '';
  let currentLen = 0;

  const pushCurrent = () => {
    if (current.trim().length > 0) pages.push(current);
    current = '';
    currentLen = 0;
  };

  for (const s of sections) {
    const block = `${s.title ? `# ${s.title}\n\n` : ''}${s.content.trim()}\n\n`;
    if (currentLen + block.length > targetPerPage && pages.length < pageCount - 1) {
      pushCurrent();
    }
    current += block;
    currentLen += block.length;
  }
  pushCurrent();

  // Ensure we return exactly pageCount pages by padding or trimming
  if (pages.length < pageCount) {
    while (pages.length < pageCount) pages.push('');
  } else if (pages.length > pageCount) {
    pages.length = pageCount;
  }

  return pages;
}

function detectTemplateType(name?: string | null, templateType?: string | null): 'basic' | 'executive_premium' | 'modern_corporate' | 'luxury_elite' {
  const n = (name ?? '').toLowerCase();
  if (n.includes('executive') || n.includes('premium')) return 'executive_premium';
  if (n.includes('modern') || n.includes('corporate')) return 'modern_corporate';
  if (n.includes('luxury') || n.includes('elite')) return 'luxury_elite';
  if ((templateType ?? '') === 'basic') return 'basic';
  return 'executive_premium';
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: proposal, error: pErr } = await supabase
      .from('proposals')
      .select('id, user_id, generated_content, template_id')
      .eq('id', id)
      .single();

    if (pErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (proposal.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!proposal.generated_content || proposal.generated_content.trim().length === 0) {
      return NextResponse.json({ sections: [], pages: [], templateType: 'basic' });
    }

    let templateRow: { name?: string | null; template_type?: string | null } | null = null;
    if (proposal.template_id) {
      const { data: t, error: tErr } = await supabase
        .from('proposal_templates')
        .select('name, template_type')
        .eq('id', proposal.template_id)
        .single();
      if (!tErr) templateRow = t as any;
    }

    const templateType = detectTemplateType(templateRow?.name ?? null, templateRow?.template_type ?? null);

    // Split and chunk into three internal pages for templates that use 5 total pages
    const sections = splitMarkdownIntoSections(proposal.generated_content);
    const pages = chunkSectionsIntoPages(sections, 3);

    return NextResponse.json({ sections, pages, templateType });
  } catch (error: any) {
    console.error('Error in split API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}