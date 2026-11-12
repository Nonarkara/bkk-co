#!/usr/bin/env node
// Screenshot the running PLUB at the widths that matter, into a folder you name.
//   node scripts/shoot.mjs http://127.0.0.1:43827 /tmp/shots [--full]
// Built for a loaded machine: every wait is generous and a failure is reported,
// never thrown, so one slow frame does not lose the whole set.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function loadPlaywright() {
  for (const c of [process.env.PLUB_PLAYWRIGHT, 'playwright', 'playwright-core',
    '/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright']) {
    try { return require(c); } catch { /* try the next one */ }
  }
  throw new Error('Playwright is required: npm i -D playwright');
}
const { chromium } = loadPlaywright();
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));

const url = process.argv[2] || 'http://127.0.0.1:43827';
const outDir = resolve(process.argv[3] || '/tmp/shots');
const full = process.argv.includes('--full');
mkdirSync(outDir, { recursive: true });

const WIDTHS = [[390, 844], [1024, 768], [1440, 900]];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(CHROME ? { executablePath: CHROME } : {}),
});
let failed = 0;
for (const [w, h] of WIDTHS) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#list, #sheet', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(6000); // let the map's first tiles and the fonts settle
    const path = `${outDir}/view-${w}.png`;
    await page.screenshot({ path, timeout: 120000, fullPage: full });
    console.log(`  ${String(w).padStart(4)}px  ${path}`);
  } catch (e) {
    failed++;
    console.error(`  ${String(w).padStart(4)}px  FAILED: ${e.message.split('\n')[0]}`);
  }
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
