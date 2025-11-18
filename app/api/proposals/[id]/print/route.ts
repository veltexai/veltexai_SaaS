import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${base}/print/proposals/${id}`;

  let browser: any;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });

    try {
      await page.waitForSelector('[data-extras-ready="true"]', {
        timeout: 8000,
      });
    } catch {
      try {
        await page.waitForFunction('window.__EXTRAS_READY__ === true', {
          timeout: 8000,
        });
      } catch {}
    }
    try {
      await page.evaluate(
        () => (document as any).fonts && (document as any).fonts.ready
      );
    } catch {}

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
