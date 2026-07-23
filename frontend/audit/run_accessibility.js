// audit/run_accessibility.js
/**
 * Runs axe-core accessibility scans for each discovered route using Playwright.
 * Results are saved as JSON files under audit/axe_*.json.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AxeBuilder } from '@axe-core/playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json')));

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const route of routes) {
    const url = `https://myriver.onrender.com${route}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).analyze();
    const safe = route.replace(/[^a-zA-Z0-9]/g, '_') || 'home';
    fs.writeFileSync(path.join(__dirname, `axe_${safe}.json`), JSON.stringify(results, null, 2));
    console.log(`Accessibility scan completed for ${url}`);
  }
  await browser.close();
})();
