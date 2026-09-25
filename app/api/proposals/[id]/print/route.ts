import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canUsePaidProposalActions } from '@/lib/billing/proposal-entitlements';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await canUsePaidProposalActions(supabase, user.id))) {
    return NextResponse.json({ error: 'Paid plan required' }, { status: 403 });
  }
  const { data: ownedProposal } = await supabase
    .from('proposals').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!ownedProposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${base}/print/proposals/${id}`;

  let browser: any;
  try {
    if (process.env.NODE_ENV === 'production') {
      const chromium = await import('@sparticuz/chromium').then(
        (mod) => mod.default
      );
      const { chromium: playwrightChromium } = await import('playwright-core');

      browser = await playwrightChromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        executablePath:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      });
    }

    const page = await browser.newPage();
    const target = new URL(base);
    const sessionCookies = req.cookies.getAll().map(({ name, value }) => ({
      name,
      value,
      domain: target.hostname,
      path: '/',
      secure: target.protocol === 'https:',
      httpOnly: true,
      sameSite: 'Lax' as const,
    }));
    if (sessionCookies.length) await page.context().addCookies(sessionCookies);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });

    // Skip waiting for optional extras marker to avoid unnecessary delays
    // Avoid blocking on webfont downloads; rely on fallbacks

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      scale: 1,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposal-${id}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Headless print error:', err);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
