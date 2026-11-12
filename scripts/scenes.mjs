#!/usr/bin/env node
// Walk PLUB's reading surfaces and photograph each one, at one width.
//   node scripts/scenes.mjs http://127.0.0.1:43827 /tmp/scenes [390|1440]
// Each scene is a real user action, not a synthetic DOM: open a place, open the
// guide, find a work spot, open the notebook. What it captures is what a reader sees.
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

const url = process.argv[2] || 'http://127.0.0.1:43827';
const outDir = resolve(process.argv[3] || '/tmp/scenes');
const width = Number(process.argv[4] || 1440);
const height = width < 500 ? 844 : 900;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(CHROME ? { executablePath: CHROME } : {}),
});
const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'Asia/Bangkok' });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(9000);

const shot = async (name) => {
  const path = `${outDir}/${name}-${width}.png`;
  try {
    await page.screenshot({ path, timeout: 120000 });
    console.log(`  ${name.padEnd(18)} ${path}`);
  } catch (e) { console.error(`  ${name.padEnd(18)} FAILED: ${e.message.split('\n')[0]}`); }
};

// Real mouse clicks: the app listens for pointer events, not synthetic .click().
const click = async (selector, settle = 3000) => {
  try {
    const el = await page.waitForSelector(selector, { timeout: 20000, state: 'visible' });
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.click({ timeout: 20000 });
    await page.waitForTimeout(settle);
    return true;
  } catch (e) {
    console.error(`  (no ${selector}: ${e.message.split('\n')[0]})`);
    return false;
  }
};

// 1. A place sheet — the densest reading surface there is.
await click('#list li[data-id] button.list-place', 4000);
await shot('place-sheet');

// 2. The work finder — the primary action.
await click('#sheet .close', 800);
await click('[data-act="work"]', 3500);
await shot('work-finder');

// 3. The guide — how the rules are taught.
await click('#sheet .close', 800);
await click('#guide', 3000);
await shot('guide');

// 4. A neighbourhood sheet — the numbers and story.
await click('#sheet .close', 800);
await click('.list-group h3', 3500);
await shot('hood-sheet');

// 5. The notebook.
await click('#sheet .close', 800);
await click('#passport', 3000);
await shot('notebook');

// 6. Map key — the bottom bar on the map.
await click('#sheet .close', 800);
await click('[data-proxy="atlas-key"]', 3000);
await shot('map-key');

await browser.close();
