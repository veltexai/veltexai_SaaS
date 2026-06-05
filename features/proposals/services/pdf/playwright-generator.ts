export async function generateProposalPDFWithPlaywright(
  id: string
): Promise<Buffer> {
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
      browser = await chromium.launch();
    }

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

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
