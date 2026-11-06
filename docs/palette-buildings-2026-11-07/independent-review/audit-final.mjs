// MSH audit: measure the shipped interface at 390 / 1024 / 1440. Do not eyeball it.
//
// The law (Projects/_reference/MSH.md section 3) asks for five measurements per viewport:
// chrome cost, task visibility, geometry failures, hierarchy and preservation — and for a
// verdict. It also says "never self-review": this file produces the evidence, a different
// agent reads it. It must fail when the interface is wrong, so --planted injects a known
// defect and asserts the gate catches it.
//
//   node scripts/audit-msh.mjs            measure the local build, write the report
//   node scripts/audit-msh.mjs --planted  prove the gate fails on a planted defect
//   PLUB_URL=https://co.nonarkara.org node scripts/audit-msh.mjs   measure the live site
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const PLANTED = process.argv.includes('--planted');
const WIDTHS = [{ w: 390, h: 844 }, { w: 1024, h: 900 }, { w: 1440, h: 900 }];
const repo = new URL('../', import.meta.url);
const stamp = new Date().toISOString().slice(0, 10);
const outDir = new URL('file:///tmp/plub-palette-review-nov7/msh-final/');

// ---------------------------------------------------------------- plumbing
function loadPlaywright() {
  for (const c of [process.env.PLUB_PLAYWRIGHT, 'playwright', 'playwright-core',
    '/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright']) {
    try { return require(c); } catch { /* keep looking */ }
  }
  throw new Error('Playwright is required for the MSH audit: npm i -D playwright');
}
const CHROME = [process.env.PLUB_CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));

async function waitForServer(url, ms = 120000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { const r = await fetch(url, { redirect: 'follow' }); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 700));
  }
  throw new Error(`No server at ${url}`);
}
let child = null;
async function startServer() {
  if (process.env.PLUB_URL) return process.env.PLUB_URL;
  const port = 43991;
  child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local'], {
    cwd: repo.pathname, stdio: 'ignore', detached: false,
  });
  const url = `http://localhost:${port}`;
  await waitForServer(url);
  // The local D1 is empty on a fresh checkout: without the notebook schema the community
  // surfaces fail, and the audit would report a broken product instead of a missing step.
  await new Promise(res => {
    const seed = spawn('npx', ['wrangler', 'd1', 'execute', 'bkk-co', '--local', '--file=db/notebook.sql'],
      { cwd: repo.pathname, stdio: 'ignore' });
    seed.on('exit', res); seed.on('error', res);
  });
  await waitForServer(url);
  return url;
}

// ---------------------------------------------------------------- the measurement
// Runs in the page. Every number below is read from the rendered interface.
const MEASURE = () => {
  const vw = innerWidth, vh = innerHeight;
  const shown = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0;
  };
  const all = [...document.querySelectorAll('body *')].filter(shown);
  const text = el => (el.innerText || '').trim();

  // 1. chrome cost — the bands that hold the interface, not the content
  const pinned = all.filter(el => {
    const s = getComputedStyle(el);
    return s.position === 'fixed' || s.position === 'sticky';
  });
  const botEls = pinned.filter(el => el.getBoundingClientRect().bottom >= vh - 1 && el.getBoundingClientRect().top < vh);
  const bottomPx = botEls.length ? vh - Math.min(...botEls.map(el => el.getBoundingClientRect().top)) : 0;
  // The top band is the header and the filter strip. They sit in flow, so measure the
  // strip they occupy rather than hunting for a fixed element that is not there.
  let topPx = 0;
  for (const sel of ['nav.chips', 'header.bar']) {
    const el = document.querySelector(sel);
    if (!el || !shown(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top <= 2) topPx = Math.max(topPx, r.bottom);
  }
  if (!topPx) {
    const topEls = pinned.filter(el => el.getBoundingClientRect().top <= 1);
    if (topEls.length) topPx = Math.max(...topEls.map(el => el.getBoundingClientRect().bottom));
  }

  // 2. map share of the first screen — the map is the content, panels are instruments
  const mapEl = document.querySelector('#map') || document.querySelector('.maplibregl-map');
  const mapRect = mapEl ? mapEl.getBoundingClientRect() : null;
  let visibleMap = mapRect ? mapRect.width * mapRect.height : 0;
  for (const sel of ['#side', '#sheet', 'header.bar', 'nav.chips']) {
    const el = document.querySelector(sel);
    if (!el || !shown(el)) continue;
    const r = el.getBoundingClientRect();
    const ox = Math.max(0, Math.min(mapRect.right, r.right) - Math.max(mapRect.left, r.left));
    const oy = Math.max(0, Math.min(mapRect.bottom, r.bottom) - Math.max(mapRect.top, r.top));
    visibleMap = Math.max(0, visibleMap - ox * oy);
  }
  const mapShare = (vw * vh) ? visibleMap / (vw * vh) : 0;

  // 3. geometry failures
  // 3a. void: the largest empty area in the first screen that is not the map (a map is a named job).
  // Measured on a grid, because a void is a region, not a band.
  const COLS = 24, ROWS = 24, cw = vw / COLS, ch = vh / ROWS;
  const free = new Uint8Array(COLS * ROWS).fill(1);
  const overlaps = (r, cell) => cell.x * cw + cw > r.left && (cell.x + 1) * cw < r.right && cell.y * ch + ch > r.top && (cell.y + 1) * ch < r.bottom;
  const cellsOf = (r, keepFree) => {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const cell = { x, y };
      if (!overlaps(r, cell)) continue;
      if (keepFree) free[y * COLS + x] = 0;
    }
  };
  // The map's own surface is a named job: it is not a void.
  if (mapRect) cellsOf(mapRect, true);
  for (const el of all) { if (text(el)) cellsOf(el.getBoundingClientRect(), true); }
  let voidPx = 0, voidTop = 0, voidW = 0;
  for (let y = 0; y < ROWS; y++) {
    let run = 0, best = 0, bestX = 0;
    for (let x = 0; x < COLS; x++) {
      if (free[y * COLS + x]) { if (!run) bestX = x; run++; if (run > best) best = run; }
      else run = 0;
    }
    if (best * cw * ch > voidPx) { voidPx = best * cw * ch; voidW = best * cw; voidTop = y * ch; }
  }

  // 3a-ii. nothing covers the map on load: the largest overlay standing on the map's surface
  let obstruction = { area: 0, cls: '', tag: '' };
  if (mapRect) {
    for (const el of all) {
      if (el === mapEl || el.contains(mapEl) || el.closest('#map') || el.closest('.maplibregl-control-container')) continue;
      const r = el.getBoundingClientRect();
      const ox = Math.max(0, Math.min(mapRect.right, r.right) - Math.max(mapRect.left, r.left));
      const oy = Math.max(0, Math.min(mapRect.bottom, r.bottom) - Math.max(mapRect.top, r.top));
      const area = ox * oy;
      if (area > obstruction.area) obstruction = { area: Math.round(area), cls: el.className || '', tag: el.tagName.toLowerCase() };
    }
  }
  const obstructionShare = visibleMap ? obstruction.area / visibleMap : 0;

  // 3b. inflated box: a panel far taller than the text it holds
  const inflated = [];
  for (const el of all) {
    const t = text(el);
    if (!t) continue;
    const kids = [...el.children].some(k => text(k));
    if (kids) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 140) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const th = range.getBoundingClientRect().height;
    if (th > 0 && th / r.height < 0.35) inflated.push({ tag: el.tagName.toLowerCase(), cls: el.className, h: Math.round(r.height), textH: Math.round(th) });
  }

  // 3c. orphan column: a narrow content column floating on a wide screen
  const orphans = [];
  if (vw >= 1024) {
    for (const el of all) {
      if (!text(el)) continue;
      if (el.closest('#map') || el.closest('#side') || el.closest('#sheet')) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.width < Math.min(400, vw * 0.4) && r.height > 80) orphans.push({ tag: el.tagName.toLowerCase(), cls: el.className, w: Math.round(r.width) });
    }
  }

  // 3d. horizontal bleed
  const bleed = document.documentElement.scrollWidth > vw + 1;

  // 4. hierarchy — something must win
  const raw = all.map(el => {
    const r = el.getBoundingClientRect();
    return { el, a: Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) * r.width, top: r.top, bottom: r.bottom };
  }).filter(x => x.a > 0 && x.bottom > 0 && x.top < vh).sort((a, b) => b.a - a.a);
  // Only compare surfaces that are not nested inside one another: a map and its own canvas
  // are one thing, not a hierarchy.
  const areas = [];
  for (const x of raw) {
    if (areas.some(y => y.el.contains(x.el))) continue;
    areas.push(x);
    if (areas.length >= 4) break;
  }
  const top3 = areas.slice(0, 3).map(x => ({ id: x.el.id || x.el.className || x.el.tagName.toLowerCase(), area: Math.round(x.a) }));
  const ratio = top3.length >= 2 ? (top3[0].area / Math.max(1, top3[1].area)) : 99;
  const mapIsFirst = mapRect ? areas[0] && (areas[0].el === mapEl || areas[0].el.contains(mapEl)) : false;

  // 5. task visibility — the primary fact and the primary action, together, above the fold
  const q = document.querySelector('#q');
  const count = document.querySelector('#count');
  const inFold = el => { if (!el || !shown(el)) return false; const r = el.getBoundingClientRect(); return r.top >= -1 && r.top < vh && r.height > 0; };
  // The count lives in the list drawer on a phone. Absent is fine; below the fold is not.
  const countPlaced = (() => { if (!count || !shown(count)) return true; const r = count.getBoundingClientRect(); return r.top < vh && r.height > 0; })();
  const firstScreenElements = all.filter(el => {
    const r = el.getBoundingClientRect();
    return r.top < vh && r.bottom > 0 && r.width > 0 && text(el).length > 0;
  });
  const firstUseful = firstScreenElements.length ? (firstScreenElements[firstScreenElements.length - 1]?.id || 'text') : null;

  return {
    vw, vh,
    chrome: { topPx: Math.round(topPx), bottomPx: Math.round(bottomPx), share: +((topPx + bottomPx) / vh).toFixed(3) },
    mapShare: +mapShare.toFixed(3),
    mapIsFirst, hierarchyRatio: +ratio.toFixed(2), top3,
    voidPx: Math.round(voidPx), voidTop: Math.round(voidTop), voidW: Math.round(voidW),
    obstruction, obstructionShare: +obstructionShare.toFixed(3),
    inflated: inflated.slice(0, 6), orphans: orphans.slice(0, 6), bleed,
    task: { search: inFold(q), count: countPlaced, firstUseful },
    lang: document.documentElement.lang || '',
    title: document.title,
  };
};

async function ready(page) {
  // Gate on the app's own data, not on the map's load event: 'load' waits for external tiles
  // and a slow tile server must not be able to hide a layout failure.
  // `state` and `map` are top-level consts: global lexical bindings, not window properties.
  await page.waitForFunction(() => typeof state !== 'undefined' && state.foodLoaded && state.places.length > 0
    && !!document.querySelector('#map canvas'), {}, { timeout: 120000 });
  await page.waitForFunction(() => !!map.getLayer('place-icons'), {}, { timeout: 45000 }).catch(() => { });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page.evaluate(() => !!map.getLayer('place-icons'));
}
const PRESERVE = async (page, base, shot) => {
  const checks = {};
  const errors = [], writes = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().startsWith(base + '/api/') && !['GET', 'HEAD'].includes(r.method())) writes.push(r.method() + ' ' + r.url()); });
  // A gate reports; it never crashes. A step that cannot be performed is a finding.
  const step = async (name, fn) => {
    try { await fn(); } catch (e) { checks[name + 'Error'] = String(e.message || e).split('\n')[0].slice(0, 180); }
  };

  await step('search', async () => {
    await page.locator('#q').fill('coffee');
    await page.waitForFunction(() => document.querySelectorAll('#hits li').length > 0, {}, { timeout: 30000 });
    checks.search = await page.locator('#hits li').count();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    // Escape must dismiss the results, and the panel must not keep covering the filter chips.
    checks.hitsDismissed = await page.evaluate(() => document.querySelector('#hits').hidden);
    checks.chipReachable = await page.evaluate(() => {
      const b = document.querySelector('nav.chips button[data-kind="restaurant"]').getBoundingClientRect();
      const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return !!e && !!e.closest('nav.chips button[data-kind="restaurant"]');
    });
  });

  await step('chip', async () => {
    const before = await page.locator('#count').textContent();
    await page.locator('nav.chips button[data-kind="restaurant"]').click({ timeout: 15000 });
    await page.waitForTimeout(600);
    checks.chipChanged = (await page.locator('#count').textContent()) !== before;
    await page.locator('nav.chips button[data-kind="restaurant"]').click({ timeout: 15000 });
    await page.waitForTimeout(400);
  });

  await step('hop', async () => {
    await page.evaluate(() => window.openHop?.());
    await page.waitForFunction(() => document.querySelector('.hop-sheet') && document.querySelectorAll('.hop-sheet .hop li').length > 0, {}, { timeout: 30000 });
    checks.hopStops = await page.locator('.hop-sheet .hop li').count();
    checks.hopHasShared = await page.locator('.hop-sheet [data-shared-hops]').count();
  });

  await step('sharedHops', async () => {
    await page.evaluate(() => document.querySelector('.hop-sheet [data-shared-hops]')?.click());
    await page.waitForFunction(() => !!document.querySelector('.shared-hops-sheet'), {}, { timeout: 30000 });
    await page.waitForFunction(() => { const p = document.querySelector('.hop-feed'); return p && !/Loading shared hop notes/.test(p.textContent); }, {}, { timeout: 30000 });
    const feed = (await page.locator('.hop-feed').innerText()).trim();
    checks.hopFeed = feed.slice(0, 120);
    // A community surface that shows an error is not a community surface.
    checks.hopFeedOk = !/unavailable|timed out|failed|error/i.test(feed);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  });

  await step('lens', async () => {
    checks.lens = await page.evaluate(() => ({
      installed: !!window.MangaLens?.installed,
      layers: window.MangaLens?.layers().length || 0,
    }));
    checks.lensOn = await page.evaluate(() => ({
      pressed: document.querySelector('.manga-toggle').getAttribute('aria-pressed'),
      ground: map.getLayoutProperty('manga-ground', 'visibility'),
      base: map.getLayoutProperty('background', 'visibility'),
    }));
    if (shot) await page.screenshot({ path: new URL(`manga-lens-${shot}.png`, outDir).pathname });
    await page.locator('.manga-toggle').click({ timeout: 15000 });
    await page.waitForTimeout(400);
    checks.lensOff = await page.evaluate(() => ({
      pressed: document.querySelector('.manga-toggle').getAttribute('aria-pressed'),
      ground: map.getLayoutProperty('manga-ground', 'visibility'),
      base: map.getLayoutProperty('background', 'visibility'),
    }));
    await page.locator('.manga-toggle').click({ timeout: 15000 });
    await page.waitForTimeout(400);
  });

  await step('notebook', async () => {
    await page.locator('#passport').click({ timeout: 15000 });
    await page.waitForFunction(() => !!document.querySelector('.notebook-sheet'), {}, { timeout: 30000 });
    checks.notebook = await page.locator('.notebook-sheet').count();
    await page.keyboard.press('Escape');
  });

  checks.pinsLayer = await page.evaluate(() => !!map.getLayer('place-icons'));
  checks.errors = errors;
  checks.writes = writes;
  return checks;
};

// ---------------------------------------------------------------- verdict
function verdictFor(view, journey) {
  const fails = [];
  const F = (id, detail) => fails.push({ id, detail });
  if (view.chrome.share > 0.34) F('B2 chrome cost', `top+bottom bands take ${(view.chrome.share * 100).toFixed(0)}% of the viewport`);
  if (view.mapShare < 0.6) F('B9 map share', `the map holds ${(view.mapShare * 100).toFixed(0)}% of the first screen`);
  const voidShare = (view.vw * view.vh) ? view.voidPx / (view.vw * view.vh) : 0;
  if (voidShare > 0.18) F('B4 void', `${(voidShare * 100).toFixed(0)}% of the first screen carries nothing`);
  if (view.obstructionShare > 0.12) F('B9 map obstruction', `${view.obstruction.cls || view.obstruction.tag} covers ${(view.obstructionShare * 100).toFixed(0)}% of the map`);
  if (view.inflated.length) F('B3 box fit', view.inflated.map(i => `${i.cls || i.tag} ${i.h}px holds ${i.textH}px of text`).join('; '));
  if (view.orphans.length) F('B4 orphan column', view.orphans.map(o => `${o.cls || o.tag} ${o.w}px wide on ${view.vw}px`).join('; '));
  if (view.bleed) F('B11 horizontal bleed', 'the document scrolls sideways');
  if (!view.mapIsFirst) F('B7 hierarchy', 'the map is not the largest thing on the first screen');
  if (view.hierarchyRatio < 1.5) F('B7 hierarchy', `top two areas differ by only ${view.hierarchyRatio}x`);
  if (!view.task.search || !view.task.count) F('B1 first-screen task', 'the search or the count is below the fold');
  if (view.lang !== 'en') F('B12 language', `lang is "${view.lang}"`);
  if (journey) {
    if (!journey.pinsLayer) F('B14 preservation', 'the map never drew the place pins');
    if (!journey.search) F('B14 preservation', 'search returns nothing');
    if (!journey.hitsDismissed) F('B14 preservation', 'Escape does not dismiss the search results');
    if (!journey.chipReachable) F('B9 map instrument', 'the search results panel covers the filter chips');
    if (!journey.chipChanged) F('B14 preservation', 'a filter chip changes nothing');
    if (!journey.hopStops) F('B14 preservation', 'the café hop plans no stops');
    if (!journey.hopHasShared) F('B14 preservation', 'the hop sheet offers no shared hop notes');
    if (!journey.hopFeed) F('B14 preservation', 'the shared hop feed renders nothing');
    if (journey.hopFeedOk === false) F('B14 preservation', `the shared hop feed shows an error: ${journey.hopFeed}`);
    for (const [k, v] of Object.entries(journey)) if (k.endsWith('Error')) F('B14 preservation', `${k.slice(0, -5)} could not be exercised: ${v}`);
    if (!journey.lens.installed) F('B14 preservation', 'the manga lens never installed');
    if (journey.lensOn.ground !== 'visible' || journey.lensOn.base !== 'none') F('B14 preservation', 'the manga lens does not replace the basemap');
    if (journey.lensOff.ground !== 'none' || journey.lensOff.base !== 'visible') F('B14 preservation', 'the manga lens does not hand the basemap back');
    if (journey.errors.length) F('B13 runtime', journey.errors.join(' | '));
    if (journey.writes.length) F('read-only', `the audit wrote to the API: ${journey.writes.join(', ')}`);
  }
  return { fails, verdict: fails.length ? (fails.some(f => /map share|void|bleed|runtime/.test(f.id)) ? 'BLOCK' : 'REVISE') : 'PASS' };
}

// ---------------------------------------------------------------- run
const { chromium } = loadPlaywright();
const base = await startServer();
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(CHROME ? { executablePath: CHROME } : {}) });
const report = { stamp, base, planted: PLANTED, viewports: [], journey: null, verdict: 'PASS', fails: [] };
try {
  for (const { w, h } of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const pins = await ready(page);
    if (PLANTED) {
      // A known defect: a big empty panel over the map. The gate must catch it.
      // Plant BEFORE measuring, or the instrument never sees what it is meant to judge.
      await page.evaluate(() => {
        const d = document.createElement('div');
        d.id = 'planted-defect';
        d.style.cssText = 'position:fixed;left:0;top:120px;width:100%;height:430px;background:#ffffff;z-index:5';
        document.body.append(d);
      });
      await page.waitForTimeout(400);
    }
    const view = await page.evaluate(MEASURE);
    view.pinsLayer = pins;
    await page.screenshot({ path: new URL(`${PLANTED ? 'planted' : 'view'}-${w}.png`, outDir).pathname });
    report.viewports.push({ width: w, height: h, ...view });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await ready(page);
  report.journey = await PRESERVE(page, base, 'live');
  await context.close();
} finally {
  await browser.close();
  if (child) child.kill();
}

for (const v of report.viewports) {
  const r = verdictFor(v, null);
  report.fails.push(...r.fails.map(f => ({ ...f, width: v.width })));
  v.verdict = r.verdict;
}
{
  const r = verdictFor({ vw: 1440, vh: 900, chrome: { share: 0 }, mapShare: 1, voidPx: 0, obstructionShare: 0, inflated: [], orphans: [], bleed: false, mapIsFirst: true, hierarchyRatio: 9, task: { search: true, count: true }, lang: 'en' }, report.journey);
  report.fails.push(...r.fails.map(f => ({ ...f, width: 'journey' })));
}
report.verdict = report.fails.length ? (report.fails.some(f => /map share|void|bleed|runtime/.test(f.id)) ? 'BLOCK' : 'REVISE') : 'PASS';

await writeFile(new URL(PLANTED ? 'msh-report-planted.json' : 'msh-report.json', outDir), JSON.stringify(report, null, 2) + '\n');

// The gate must be able to fail.
if (PLANTED) {
  const caught = report.fails.some(f => /void|obstruct|map/.test(f.id));
  console.log(`Planted defect: ${report.fails.length} failure(s) reported; the gate caught it: ${caught}.`);
  for (const f of report.fails) console.log(`  PLANTED FAIL [${f.width}] ${f.id}: ${f.detail}`);
  if (!caught) { console.error('THE GATE DID NOT CATCH THE PLANTED DEFECT.'); process.exit(2); }
  console.log(`Report: ${new URL('msh-report-planted.json', outDir).pathname}`);
  process.exit(0);
}

const lines = [];
lines.push(`MSH audit ${stamp} · ${report.base} · planted=${PLANTED}`);
for (const v of report.viewports) {
  lines.push(`  ${String(v.width).padStart(4)}px  chrome ${v.chrome.topPx}+${v.chrome.bottomPx}px (${(v.chrome.share * 100).toFixed(0)}%)  map ${(v.mapShare * 100).toFixed(0)}%  void ${v.voidPx}px  hierarchy ${v.hierarchyRatio}x  ${v.verdict}`);
}
lines.push(`  journey: search ${report.journey.search} hits · chip ${report.journey.chipChanged ? 'works' : 'NO CHANGE'} · hop ${report.journey.hopStops} stops · shared feed "${String(report.journey.hopFeed).slice(0, 40)}" · lens ${report.journey.lensOn.ground}/${report.journey.lensOff.ground} · writes ${report.journey.writes.length}`);
for (const f of report.fails) lines.push(`  FAIL [${f.width}] ${f.id}: ${f.detail}`);
lines.push(`Verdict: ${report.verdict}`);
console.log(lines.join('\n'));
console.log(`Report: ${new URL('msh-report.json', outDir).pathname}`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
