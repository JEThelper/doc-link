import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import * as fs from 'fs';

// Breakpoints for responsive testing
const breakpoints = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

// Pages to audit – paths relative to the Vite dev server (http://localhost:5173)
const pages = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'forgot', path: '/forgot' },
  { name: 'reset', path: '/reset' },
  { name: 'verify', path: '/verify' },
  { name: 'dashboard', path: '/account/pads' },
  { name: 'pad', path: '/pad/example' },
  { name: 'help', path: '/help' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
];

pages.forEach(page => {
  test.describe(`${page.name} page`, () => {
    // Capture screenshots for each breakpoint
    Object.entries(breakpoints).forEach(([bpName, size]) => {
      test(`screenshot @ ${bpName}`, async ({ page: p }) => {
        await p.setViewportSize(size);
        await p.goto(`http://localhost:5173${page.path}`);
        await p.waitForLoadState('networkidle');
        const dir = 'audit/screenshots';
        fs.mkdirSync(dir, { recursive: true });
        await p.screenshot({ path: `${dir}/${page.name}-${bpName}.png`, fullPage: true });
      });
    });

    // Accessibility audit using axe-core
    test('accessibility audit', async ({ page: p }) => {
      await p.goto(`http://localhost:5173${page.path}`);
      await p.waitForLoadState('networkidle');
      const { results, error } = await new AxeBuilder({ page: p }).analyze();
      const dir = 'audit/a11y';
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(`${dir}/${page.name}-a11y.json`, JSON.stringify({ results, error }, null, 2));
    });
  });
});
