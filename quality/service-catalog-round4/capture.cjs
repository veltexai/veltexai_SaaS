const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const out = path.resolve('quality/service-catalog-round4/artifacts');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  for (const name of ['recurring_standard-workbench', 'airbnb_turnover-workbench', 'recurring_standard-proposal', 'airbnb_turnover-proposal']) {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      // Prevent font or other resource downloads; only local fixture HTML is read.
      await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
      await page.goto(`file://${out}/${name}.html`);
      await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      results.push({ name, width, horizontalOverflow: overflow });
      if (width === 1440 && name.endsWith('-proposal')) await page.pdf({ path: `${out}/${name}.pdf`, format: 'A4', printBackground: true });
      await page.close();
    }
  }
  fs.writeFileSync(`${out}/layout-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
  if (results.some(r => r.horizontalOverflow)) throw new Error('Horizontal overflow detected');
  console.log(JSON.stringify(results));
})().catch(error => { console.error(error); process.exitCode = 1; });
