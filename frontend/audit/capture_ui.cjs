// audit/capture_ui.cjs
/**
 * Uses Playwright to visit each discovered route, capture a full‑page screenshot,
 * save the HTML snapshot, and export button metadata to JSON.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json')));

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  for (const route of routes) {
    const url = `https://myriver.onrender.com${route}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    const safe = route.replace(/[^a-zA-Z0-9]/g, '_') || 'home';
    // Screenshot
    await page.screenshot({ path: path.join(__dirname, `screenshots/${safe}.png`), fullPage: true });
    // HTML snapshot
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, `snapshots/${safe}.html`), html);
    // Button metadata
    const buttons = await page.$$eval('button, a[href]', els => els.map(el => ({
      tag: el.tagName.toLowerCase(),
      text: el.innerText.trim(),
      classes: el.className,
      href: el.getAttribute('href') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
    })));
    fs.writeFileSync(path.join(__dirname, `buttons/${safe}.json`), JSON.stringify(buttons, null, 2));
    console.log(`Captured ${url}`);
  }
  await browser.close();
})();
