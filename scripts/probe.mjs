#!/usr/bin/env node
// Probe the running PLUB for the real computed styles of the surfaces that matter.
//   node scripts/probe.mjs http://127.0.0.1:43827
import { existsSync } from 'node:fs';
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
const url = process.argv[2] || 'http://127.0.0.1:43827';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(CHROME ? { executablePath: CHROME } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Bangkok' });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(8000);

const out = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel,
      tag: el.tagName.toLowerCase(),
      cls: el.className?.toString?.().slice(0, 70),
      color: cs.color, bg: cs.backgroundColor, border: cs.borderTopColor,
      font: `${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}`,
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      text: (el.textContent || '').trim().slice(0, 42),
    };
  };
  const sel = [
    '.bar', '.mark', '.search input', '.bar-btn', '.chips button[data-kind="cafe"]',
    '.chips button[data-kind="coworking"]', '.chips button[data-kind="library"]',
    '.chips button[data-kind="restaurant"]', '.list-find', '.list-walkthrough',
    '.list-scope h2', '.count', '.list-group h3', '.list-place .nm', '.list-place .idx',
    '.list-place .place-symbol', '.list-place .place-badge', '.dot.cafe', '.dot.coworking',
    '.micro', '.list-options .flags button', '.atlas-dock', '.atlas-state', '.atlas-tools button',
    '.model-bar', '.th',
  ];
  return {
    chipsHTML: document.querySelector('.chips')?.innerHTML.slice(0, 700),
    listHTML: document.querySelector('#list')?.innerHTML.slice(0, 700),
    picked: sel.map(pick),
    fontsUsed: [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
