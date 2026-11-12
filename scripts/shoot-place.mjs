#!/usr/bin/env node
// Photograph one named place sheet, and the Guide, at one width.
//   node scripts/shoot-place.mjs http://127.0.0.1:43827 /tmp/place 1440 o71358a621d50
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const c of [process.env.PLUB_PLAYWRIGHT, 'playwright', 'playwright-core',
    '/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright']) {
    try { return require(c); } catch { /* keep looking */ }
  }
  throw new Error('Playwright is required');
}
const { chromium } = loadPlaywright();
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));

const base = process.argv[2] || 'http://127.0.0.1:43827';
const outDir = resolve(process.argv[3] || '/tmp/place');
const width = Number(process.argv[4] || 1440);
const placeId = process.argv[5] || 'o71358a621d50';
const height = width < 500 ? 844 : 900;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(CHROME ? { executablePath: CHROME } : {}),
});
const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'Asia/Bangkok' });
const page = await context.newPage();
await page.goto(`${base}/?p=${encodeURIComponent(placeId)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(11000);

// Scroll the sheet to the Working here panel and read what it says.
const text = await page.evaluate(() => {
  const el = document.querySelector('.work-atmosphere');
  if (!el) return { missing: true, sheet: document.querySelector('#sheet')?.textContent?.slice(0, 400) };
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect();
  return {
    verdict: document.querySelector('.wa-verdict')?.textContent?.trim(),
    rows: [...document.querySelectorAll('.wa-row')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    rules: [...document.querySelectorAll('.wa-rule')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
    top: Math.round(r.top), height: Math.round(r.height),
  };
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/place-${placeId}-${width}.png`, timeout: 120000 });
console.log(JSON.stringify(text, null, 1));

// The Guide, with the tiers it teaches.
await page.evaluate(() => document.querySelector('#sheet .close')?.click());
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('#guide')?.click());
await page.waitForTimeout(3500);
await page.evaluate(() => document.querySelector('.guide-tiers')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/guide-${width}.png`, timeout: 120000 });
console.log(`screens → ${outDir}/place-${placeId}-${width}.png and guide-${width}.png`);
await browser.close();
