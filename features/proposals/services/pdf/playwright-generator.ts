export const TRACKED_PRINT_COOKIE = 'veltex_tracked_print_token';

type PrintCookie = {
  name: string;
  value: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

async function generatePdfAtPath(
  path: string,
  cookies: PrintCookie[],
): Promise<Buffer> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${base}${path}`;

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
    if (cookies.length) await page.context().addCookies(cookies.map(cookie => ({
      ...cookie,
      domain: target.hostname,
      path: cookie.path ?? '/',
      secure: cookie.secure ?? target.protocol === 'https:',
      httpOnly: cookie.httpOnly ?? true,
      sameSite: cookie.sameSite ?? 'Lax' as const,
    })));
    await page.goto(url, { waitUntil: 'networkidle' });
    if (
      await page.getByText('Not authorized', { exact: true }).count() ||
      await page.getByText('Proposal not found', { exact: true }).count()
    ) {
      throw new Error('Print session could not access the proposal');
    }

    await page.emulateMedia({ media: 'print' });
    // Skip waiting for optional extras marker to avoid unnecessary delays
    // Avoid blocking on webfont downloads; rely on fallbacks

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      scale: 1,
    });
    console.log('PDF Generated');

    return pdfBuffer;
  } catch (err) {
    console.error('Headless print error:', err);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) await browser.close();
  }
}

export async function generateProposalPDFWithPlaywright(
  id: string,
  sessionCookies: Array<{ name: string; value: string }> = [],
): Promise<Buffer> {
  return generatePdfAtPath(`/print/proposals/${id}`, sessionCookies);
}

export async function generateTrackedProposalPDFWithPlaywright(
  id: string,
  trackingToken: string,
): Promise<Buffer> {
  return generatePdfAtPath(`/print/tracked/${id}`, [
    {
      name: TRACKED_PRINT_COOKIE,
      value: trackingToken,
      path: `/print/tracked/${id}`,
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
}
