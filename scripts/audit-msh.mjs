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
const outDir = new URL(`../docs/msh-audit/${stamp}/`, import.meta.url);

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
  for (const file of ['db/schema.sql', 'db/notebook.sql']) {
    await new Promise((resolve, reject) => {
      const seed = spawn('npx', ['wrangler', 'd1', 'execute', 'bkk-co', '--local', `--file=${file}`],
        { cwd: repo.pathname, stdio: 'ignore' });
      seed.on('exit', code => code === 0 ? resolve() : reject(new Error(`Could not seed ${file}`)));
      seed.on('error', reject);
    });
  }
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

  // 1b. What stands on the map's own surface. PLUB's own overlays — the key bar,
  // the atlas action row, the status line — are interface, not map. They are
  // taken off the map's share, and they are reported as chrome so a growing
  // overlay cannot hide behind the map's own furniture.
  const overlaySel = '.footprint-key-control, .atlas-tools, .atlas-state, .atlas-reset, .map-key';
  const mapOverlays = [];
  let overlayArea = 0;
  for (const el of document.querySelectorAll(overlaySel)) {
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !mapRect) continue;
    const ox = Math.max(0, Math.min(mapRect.right, r.right) - Math.max(mapRect.left, r.left));
    const oy = Math.max(0, Math.min(mapRect.bottom, r.bottom) - Math.max(mapRect.top, r.top));
    if (ox * oy <= 0) continue;
    overlayArea += ox * oy;
    mapOverlays.push({ cls: el.className || el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), area: Math.round(ox * oy) });
  }
  const mapShareNet = (vw * vh) ? Math.max(0, visibleMap - overlayArea) / (vw * vh) : 0;
  const mapOverlayShare = (vw * vh) ? overlayArea / (vw * vh) : 0;

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
    mapShareNet: +mapShareNet.toFixed(3),
    mapOverlayShare: +mapOverlayShare.toFixed(4),
    mapOverlays: mapOverlays.slice(0, 6),
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
  await page.waitForFunction(() => !!map.getLayer('place-icons'), {}, { timeout: 90000 }).catch(() => { });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return page.evaluate(() => !!map.getLayer('place-icons'));
}

// A Thai name must wear the Thai face. The browser only applies the Thai font
// stack and its leading when the text is marked as Thai, so a catalogue name
// that is Thai has to carry that mark or it falls back to a Latin stack.
async function checkThaiName(page, base) {
  await page.goto(new URL('/?p=n1199631258', base).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => {
    const h1 = document.querySelector('#sheet h1');
    return h1 && /[\u0E00-\u0E7F]/.test(h1.textContent || '');
  }, {}, { timeout: 90000 }).catch(() => { });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const h1 = document.querySelector('#sheet h1');
    if (!h1) return { pass: false, why: 'the place sheet did not open' };
    const span = h1.querySelector('[lang=th]') || h1;
    const cs = getComputedStyle(span);
    const thai = /Prompt/.test(cs.fontFamily);
    const leading = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    return {
      text: (span.textContent || '').trim().slice(0, 40),
      font: cs.fontFamily.split(',')[0], size: cs.fontSize, leading: +leading.toFixed(2),
      marked: !!h1.querySelector('[lang=th]'),
      pass: thai && leading > 1.5 && leading < 1.9,
    };
  });
}

async function checkPlaceSheet(page, base) {
  await page.goto(new URL('/?p=o71358a621d50', base).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('.place-visit-report a').waitFor({ timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  const measure = () => {
    const sheet = document.querySelector('#sheet');
    const facts = sheet.querySelector('.facts');
    const address = facts.querySelector('[data-fact=address]');
    const value = address.querySelector('.fact-value') || address;
    const range = document.createRange();
    range.selectNodeContents(value);
    const lines = [...range.getClientRects()];
    const textWidth = Math.max(...lines.map(r => r.right)) - Math.min(...lines.map(r => r.left));
    const action = sheet.querySelector('.place-actions > a').getBoundingClientRect();
    const bounds = sheet.getBoundingClientRect();
    const factsHeight = facts.getBoundingClientRect().height;
    return { lines: lines.length, textWidth, factsHeight, directionsBottom: action.bottom - bounds.top,
      pass: lines.length <= 4 && textWidth >= facts.clientWidth * .55 && factsHeight <= 120 &&
        action.top >= bounds.top && action.bottom <= bounds.bottom && sheet.scrollWidth <= sheet.clientWidth + 1 };
  };
  const result = await page.evaluate(measure);
  if (PLANTED) {
    await page.evaluate(() => {
      const facts = document.querySelector('.facts');
      facts.style.cssText = 'display:grid; grid-template-columns:20px 1fr';
      for (const row of [...facts.children]) {
        const icon = document.createElement('li');
        icon.textContent = row.querySelector('.sym').textContent;
        row.before(icon);
        row.textContent = row.querySelector('.fact-value').textContent;
        row.style.gridTemplateColumns = '1.5em 1fr';
      }
    });
    result.plantedRejected = !(await page.evaluate(measure)).pass;
  }
  return result;
}

async function checkVisitReadingOrder(page, base) {
  await page.goto(new URL('/bridge-1958', base).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('.visit-photo img').evaluate(img => img.decode());
  await page.evaluate(() => document.fonts.ready);
  const measure = () => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const photo = rect('.visit-photo');
    const title = rect('#visit-title');
    const verdict = rect('.visit-verdict');
    const directions = rect('.visit-primary');
    const wifi = rect('.visit-wifi summary');
    const photoLeads = innerWidth < 760 ? photo.bottom <= title.top : photo.right <= title.left;
    const inlineOrder = document.querySelector('.visit-photo').compareDocumentPosition(document.querySelector('#visit-title')) & Node.DOCUMENT_POSITION_FOLLOWING;
    const width = document.documentElement.scrollWidth;
    return { photoLeads, titleTop: title.top, verdictBottom: verdict.bottom, directionsBottom: directions.bottom, wifiBottom: wifi.bottom, width,
      pass: photoLeads && Boolean(inlineOrder) && photo.top <= 90 && verdict.top >= title.bottom &&
        directions.top >= verdict.bottom && directions.bottom <= Math.min(560, innerHeight) &&
        wifi.bottom <= innerHeight && width <= innerWidth };
  };
  const result = await page.evaluate(measure);
  if (PLANTED) {
    await page.evaluate(() => {
      const photo = document.querySelector('.visit-photo');
      document.querySelector('.visit-intro').after(photo);
      photo.querySelector('img').style.aspectRatio = 'auto';
    });
    result.plantedRejected = !(await page.evaluate(measure)).pass;
  }
  return result;
}

async function checkDayPlanner(page, base) {
  const result = {};
  const actions = { live: '.day-comparison tbody a[href*="plan=nearby"]', today: '#day-show-area', work: '#day-find' };
  for (const [task, selector] of Object.entries(actions)) {
    await page.goto(new URL(`/day?task=${task}&lang=th`, base).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const action = page.locator(selector).first();
    await action.waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const measure = el => {
      const box = el.getBoundingClientRect();
      const width = document.documentElement.scrollWidth;
      return { actionBottom:box.bottom, width, pass: document.documentElement.lang === 'th' && width <= innerWidth &&
        box.top >= 0 && box.bottom <= Math.min(720, innerHeight) && box.left >= 0 && box.right <= innerWidth };
    };
    result[task] = await action.evaluate(measure);
    if (PLANTED && task === 'work') {
      await action.evaluate(el => { el.style.marginTop = '100vh'; });
      result.plantedRejected = !(await action.evaluate(measure)).pass;
    }
  }
  result.pass = Object.keys(actions).every(task => result[task].pass);
  return result;
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

  await step('places', async () => {
    const measure = () => {
      const list = document.querySelector('#list');
      const rail = document.querySelector('#list-wrap');
      const groups = [...list.querySelectorAll(':scope > .list-group')];
      const rows = [...list.querySelectorAll('.list-place')];
      const action = rail.querySelector('.list-find').getBoundingClientRect();
      const chrome = Math.round(list.getBoundingClientRect().top - rail.getBoundingClientRect().top);
      const grouped = rows.length > 0 && rows.every(row => row.closest('.list-group')?.querySelector('h3'));
      const compact = groups.every(group => group.querySelectorAll('.list-place').length <= 3);
      return { groups: groups.length, rows: rows.length, chrome, pass: grouped && compact &&
        chrome <= 128 && action.top >= 0 && action.bottom < innerHeight };
    };
    checks.places = await page.evaluate(measure);
    if (PLANTED) {
      const original = await page.locator('#list').innerHTML();
      await page.evaluate(() => {
        const list = document.querySelector('#list');
        list.replaceChildren(...list.querySelectorAll('li[data-id]'));
      });
      checks.ungroupedRejected = !(await page.evaluate(measure)).pass;
      await page.locator('#list').evaluate((el, html) => { el.innerHTML = html; }, original);
    }
  });

  await step('search', async () => {
    await page.locator('#q').fill('coffee');
    await page.waitForFunction(() => document.querySelectorAll('#hits li').length > 0, {}, { timeout: 60000 });
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
    await page.waitForFunction(() => document.querySelector('.hop-sheet') && document.querySelectorAll('.hop-sheet .hop li').length > 0, {}, { timeout: 60000 });
    checks.hopStops = await page.locator('.hop-sheet .hop li').count();
    checks.hopHasShared = await page.locator('.hop-sheet [data-shared-hops]').count();
  });

  await step('sharedHops', async () => {
    await page.evaluate(() => document.querySelector('.hop-sheet [data-shared-hops]')?.click());
    await page.waitForFunction(() => !!document.querySelector('.shared-hops-sheet'), {}, { timeout: 60000 });
    await page.waitForFunction(() => { const p = document.querySelector('.hop-feed'); return p && !/Loading shared hop notes/.test(p.textContent); }, {}, { timeout: 60000 });
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
    const switchedAt = Date.now();
    await page.locator('.manga-toggle').click({ timeout: 15000 });
    // Observe the actual completed handoff, not a Node timer racing the browser's
    // rendering/event queue. A broken handoff still fails within this bound.
    await page.waitForFunction(() => !MangaLens.active && map.getLayoutProperty('manga-ground','visibility') === 'none' && map.getLayoutProperty('background','visibility') === 'visible', null, { timeout: 3000 });
    checks.lensOff = await page.evaluate(() => ({
      pressed: document.querySelector('.manga-toggle').getAttribute('aria-pressed'),
      ground: map.getLayoutProperty('manga-ground', 'visibility'),
      base: map.getLayoutProperty('background', 'visibility'),
    }));
    checks.lensOff.observedHandoffMs = Date.now() - switchedAt;
    await page.locator('.manga-toggle').click({ timeout: 15000 });
    await page.waitForFunction(() => MangaLens.active && map.getLayoutProperty('manga-ground','visibility') === 'visible' && map.getLayoutProperty('background','visibility') === 'none', null, { timeout: 3000 });
  });

  await step('notebook', async () => {
    await page.locator('#passport').click({ timeout: 15000 });
    await page.waitForFunction(() => !!document.querySelector('.notebook-sheet'), {}, { timeout: 60000 });
    checks.notebook = await page.locator('.notebook-sheet').count();
    await page.keyboard.press('Escape');
  });

  await step('walkthrough', async () => {
    await page.evaluate(() => map.jumpTo({ center: [100.64228, 13.76848], zoom: 16 }));
    await page.locator('.list-walkthrough').click({ timeout: 15000 });
    const stage = page.locator('#walkthrough-stage[open][data-ready="true"]');
    await stage.waitFor({ timeout: 60000 });
    checks.walkthrough = await stage.evaluate(el => {
      const back = el.querySelector('.model-close');
      const r = back.getBoundingClientRect();
      return {
        area: el.dataset.area,
        streets: Number(el.dataset.streets),
        volumes: Number(el.dataset.volumes),
        options: el.querySelector('.model-area select').options.length,
        reachable: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.model-close') === back
      };
    });
    if (shot) await page.screenshot({ path: new URL(`walkthrough-${shot}.png`, outDir).pathname });
    await stage.getByRole('combobox', { name: 'Neighbourhood' }).selectOption('bangkapi');
    await page.locator('#walkthrough-stage[data-area=bangkapi][data-volumes="0"]').waitFor({ timeout: 60000 });
    const relief = stage.getByRole('button', { name: 'See 3D in Sam Yan' });
    checks.walkthrough.flat = /No mapped building heights/.test(await stage.getByRole('status').innerText()) && await relief.isVisible();
    await relief.click();
    await page.locator('#walkthrough-stage[data-area=samyan]').waitFor({ timeout: 60000 });
    checks.walkthrough.relief = Number(await stage.getAttribute('data-volumes')) > 0;
    await page.keyboard.press('Escape');
    checks.walkthrough.closed = !await page.locator('#walkthrough-stage').evaluate(el => el.open);
  });

  checks.pinsLayer = await page.evaluate(() => !!map.getLayer('place-icons'));
  checks.errors = errors;
  checks.writes = writes;
  return checks;
};

// A 390px phone at 150% text is a 260px layout. The search is the first-screen
// task, so it must stay usable there and the page must never scroll sideways.
async function checkEnlargedText(browser, base) {
  const context = await browser.newContext({ viewport: { width: 260, height: 844 }, timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await ready(page);
    return await page.evaluate(() => {
      const search = document.querySelector('.search');
      const bar = document.querySelector('.bar');
      const input = search?.querySelector('input');
      const w = search ? search.getBoundingClientRect().width : 0;
      const overflow = bar ? Math.max(0, bar.scrollWidth - bar.clientWidth) : 0;
      const bleed = document.documentElement.scrollWidth > innerWidth + 1;
      return {
        viewport: 260, searchWidth: Math.round(w), barOverflow: overflow, bleed,
        inputPresent: !!input,
        pass: w >= 120 && overflow <= 1 && !bleed && !!input,
      };
    });
  } finally { await context.close(); }
}

// ---------------------------------------------------------------- verdict
function verdictFor(view, journey) {
  const fails = [];
  const F = (id, detail) => fails.push({ id, detail });
  if (view.chrome.share > 0.34) F('B2 chrome cost', `top+bottom bands take ${(view.chrome.share * 100).toFixed(0)}% of the viewport`);
  if (view.mapShare < 0.6) F('B9 map share', `the map holds ${(view.mapShare * 100).toFixed(0)}% of the first screen`);
  // The map's own share, once PLUB's own overlays are taken off it.
  if (view.mapShareNet < 0.6) F('B9 map share', `the map holds ${(view.mapShareNet * 100).toFixed(0)}% of the first screen once PLUB's own overlays are taken off it`);
  if (view.mapOverlayShare > 0.06) F('B9 map overlay chrome', `PLUB's own overlays stand on ${(view.mapOverlayShare * 100).toFixed(1)}% of the first screen: ${(view.mapOverlays || []).map(o => `${o.cls} ${o.w}x${o.h}`).join('; ')}`);
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
  if (view.placeSheet && (!view.placeSheet.pass || (PLANTED && view.placeSheet.plantedRejected !== true))) F('B1 place sheet', `Bridge facts or Directions failed the reading budget: ${JSON.stringify(view.placeSheet)}`);
  if (view.thaiName && !view.thaiName.pass) F('B12 Thai typography', `a Thai place name does not wear the Thai face: ${JSON.stringify(view.thaiName)}`);
  if (view.visitReading && (!view.visitReading.pass || (PLANTED && view.visitReading.plantedRejected !== true))) F('B1 visit reading order', `Bridge photo, facts and actions failed the reading budget: ${JSON.stringify(view.visitReading)}`);
  if (view.dayPlanner && (!view.dayPlanner.pass || (PLANTED && view.dayPlanner.plantedRejected !== true))) F('B1 day planner', `A planner action failed the first-screen budget: ${JSON.stringify(view.dayPlanner)}`);
  if (journey) {
    if (!journey.places?.pass) F('B14 grouped places', 'the sidebar needs short category previews and a first-screen work action');
    if (PLANTED && journey.ungroupedRejected !== true) F('B14 grouped places', 'the grouped-places gate accepted an ungrouped list');
    const walk = journey.walkthrough;
    if (!walk?.streets || walk.volumes < 10 || !walk.flat || !walk.relief || walk.options !== 12 || !walk.reachable || !walk.closed) F('B14 walkthrough', '3D must open with mapped relief, preserve the flat area and return to the map');
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
    if (!journey.lens?.installed) F('B14 preservation', 'the manga lens never installed');
    if (journey.lensOn?.ground !== 'visible' || journey.lensOn?.base !== 'none') F('B14 preservation', 'the manga lens does not replace the basemap');
    if (journey.lensOff?.ground !== 'none' || journey.lensOff?.base !== 'visible') F('B14 preservation', 'the manga lens does not hand the basemap back');
    if (journey.errors.length) F('B13 runtime', journey.errors.join(' | '));
    if (journey.writes.length) F('read-only', `the audit wrote to the API: ${journey.writes.join(', ')}`);
  }
  return { fails, verdict: fails.length ? (fails.some(f => /map share|void|bleed|runtime/.test(f.id)) ? 'BLOCK' : 'REVISE') : 'PASS' };
}

// ---------------------------------------------------------------- run
const { chromium } = loadPlaywright();
const base = await startServer();
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(CHROME ? { executablePath: CHROME } : {}) });
const report = { stamp, base, planted: PLANTED, viewports: [], journey: null, verdict: 'PASS', fails: [] };
try {
  for (const { w, h } of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const pins = await ready(page);
    if (PLANTED) {
      // A known defect: a big empty panel over the map. The gate must catch it.
      // Plant BEFORE measuring, or the instrument never sees what it is meant to judge.
      await page.evaluate(() => {
        const d = document.createElement('div');
        d.id = 'planted-defect';
        d.style.cssText = 'position:fixed;left:0;top:120px;width:100%;height:430px;background:#ffffff;z-index:5';
        document.body.append(d);
        // A second known defect, in PLUB's own name: an overlay panel standing on the
        // map. The map's own furniture must not be a hiding place for chrome.
        const o = document.createElement('div');
        o.className = 'atlas-tools';
        o.style.cssText = 'position:absolute;left:0;top:200px;width:72%;height:520px;background:#ffffff;z-index:6';
        (document.querySelector('#map') || document.body).append(o);
      });
      await page.waitForTimeout(400);
    }
    const view = await page.evaluate(MEASURE);
    view.pinsLayer = pins;
    await page.screenshot({ path: new URL(`${PLANTED ? 'planted' : 'view'}-${w}.png`, outDir).pathname });
    try { view.placeSheet = await checkPlaceSheet(page, base); }
    catch (error) { view.placeSheet = { pass: false, error: String(error.message).split('\n')[0] }; }
    await page.screenshot({ path: new URL(`${PLANTED ? 'place-planted' : 'place'}-${w}.png`, outDir).pathname });
    try { view.visitReading = await checkVisitReadingOrder(page, base); }
    catch (error) { view.visitReading = { pass: false, error: String(error.message).split('\n')[0] }; }
    await page.screenshot({ path: new URL(`${PLANTED ? 'visit-planted' : 'visit'}-${w}.png`, outDir).pathname });
    try { view.dayPlanner = await checkDayPlanner(page, base); }
    catch (error) { view.dayPlanner = { pass: false, error: String(error.message).split('\n')[0] }; }
    // Last, because it opens a different place: the shots above must keep the page
    // they were taken on.
    try { view.thaiName = await checkThaiName(page, base); }
    catch (error) { view.thaiName = { pass: false, error: String(error.message).split('\n')[0] }; }
    report.viewports.push({ width: w, height: h, ...view });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await ready(page);
  report.journey = await PRESERVE(page, base, 'live');
  await context.close();
  report.enlargedText = await checkEnlargedText(browser, base);
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
  const r = verdictFor({ vw: 1440, vh: 900, chrome: { share: 0 }, mapShare: 1, mapShareNet: 1, mapOverlayShare: 0, mapOverlays: [], voidPx: 0, obstructionShare: 0, inflated: [], orphans: [], bleed: false, mapIsFirst: true, hierarchyRatio: 9, task: { search: true, count: true }, lang: 'en' }, report.journey);
  report.fails.push(...r.fails.map(f => ({ ...f, width: 'journey' })));
}
// A reader who enlarges text gets a narrower layout. The search must survive it.
if (report.enlargedText && !report.enlargedText.pass) {
  report.fails.push({ id: 'B15 enlarged text', detail: `at 260px (a 390px phone at 150% text) the search is ${report.enlargedText.searchWidth}px wide, the bar overflows by ${report.enlargedText.barOverflow}px and the page scrolls sideways: ${report.enlargedText.bleed}`, width: '260' });
}
report.verdict = report.fails.length ? (report.fails.some(f => /map share|void|bleed|runtime/.test(f.id)) ? 'BLOCK' : 'REVISE') : 'PASS';

await writeFile(new URL(PLANTED ? 'msh-report-planted.json' : 'msh-report.json', outDir), JSON.stringify(report, null, 2) + '\n');

// The gate must be able to fail.
if (PLANTED) {
  const caught = report.fails.some(f => /void|obstruct|map/.test(f.id));
  console.log(`Planted defect: ${report.fails.length} failure(s) reported; the gate caught it: ${caught}.`);
  for (const f of report.fails) console.log(`  PLANTED FAIL [${f.width}] ${f.id}: ${f.detail}`);
  if (!caught || report.journey.ungroupedRejected !== true || report.fails.some(f => f.width === 'journey' || f.id === 'B1 place sheet' || f.id === 'B1 visit reading order' || f.id === 'B1 day planner')) { console.error('THE PLANTED OR PRESERVATION CHECK FAILED.'); process.exit(2); }
  console.log(`Report: ${new URL('msh-report-planted.json', outDir).pathname}`);
  process.exit(0);
}

const lines = [];
lines.push(`MSH audit ${stamp} · ${report.base} · planted=${PLANTED}`);
for (const v of report.viewports) {
  lines.push(`  ${String(v.width).padStart(4)}px  chrome ${v.chrome.topPx}+${v.chrome.bottomPx}px (${(v.chrome.share * 100).toFixed(0)}%)  map ${(v.mapShare * 100).toFixed(0)}% (net ${(v.mapShareNet * 100).toFixed(0)}%, overlays ${(v.mapOverlayShare * 100).toFixed(1)}%)  void ${v.voidPx}px  hierarchy ${v.hierarchyRatio}x  ${v.verdict}`);
}
lines.push(`  journey: search ${report.journey.search} hits · chip ${report.journey.chipChanged ? 'works' : 'NO CHANGE'} · hop ${report.journey.hopStops} stops · shared feed "${String(report.journey.hopFeed).slice(0, 40)}" · lens ${report.journey.lensOn?.ground}/${report.journey.lensOff?.ground} · writes ${report.journey.writes.length}`);
if (report.enlargedText) lines.push(`  260px  enlarged text (390px phone at 150%): search ${report.enlargedText.searchWidth}px · bar overflow ${report.enlargedText.barOverflow}px · sideways ${report.enlargedText.bleed ? 'yes' : 'no'}  ${report.enlargedText.pass ? 'PASS' : 'FAIL'}`);
for (const f of report.fails) lines.push(`  FAIL [${f.width}] ${f.id}: ${f.detail}`);
lines.push(`Verdict: ${report.verdict}`);
console.log(lines.join('\n'));
console.log(`Report: ${new URL('msh-report.json', outDir).pathname}`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
