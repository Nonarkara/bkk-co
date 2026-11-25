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
// Asia/Bangkok is UTC+7 and does not observe DST: file audit evidence under
// the local day it actually happened, not the UTC day.
const stamp = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false;
    // A closed <details> does not lay its content out, but Chrome still reports
    // a box for it — and that stray box was painting a band of the rail, hiding
    // the flat white the reader actually sees. checkVisibility() with no
    // arguments is the honest test.
    if (el.checkVisibility && !el.checkVisibility()) return false;
    return true;
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
  // The rail is an edge instrument, but its own header is chrome: a band the reader
  // passes before any list row. At desktop it sits inside a column, so the top-band
  // probe above never saw it and reported a screen with a 123px band as "6% chrome".
  let columnPx = 0;
  const railHead = document.querySelector('#side .rail-header');
  if (railHead && shown(railHead)) {
    const r = railHead.getBoundingClientRect();
    if (r.left < vw * 0.5 && r.width > 0 && r.width < vw * 0.5) columnPx = r.height;
  }

  // 2. map share of the first screen — the map is the content, panels are instruments
  const mapEl = document.querySelector('#map') || document.querySelector('.maplibregl-map');
  const mapRect = mapEl ? mapEl.getBoundingClientRect() : null;
  let visibleMap = mapRect ? mapRect.width * mapRect.height : 0;
  // The rail is a paper panel over the map's left edge, so what the reader
  // cannot see of the map is the PANEL, not the transparent column that holds
  // it. Subtracting the column took the map's share down by the height of an
  // empty container; subtracting the panel takes away exactly what is covered.
  for (const sel of ['.list-wrap', '#sheet', 'header.bar', 'nav.chips']) {
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
  // A cell overlaps a box when the two rectangles meet. The old test required
  // the cell to sit strictly inside the box, so the last cell column of the
  // map was never marked — leaving a free strip down the edge of the screen
  // that masked the dead band the band measure was looking for.
  const overlaps = (r, cell) => cell.x * cw < r.right && (cell.x + 1) * cw > r.left
    && cell.y * ch < r.bottom && (cell.y + 1) * ch > r.top;
  const cellsOf = (r, keepFree) => {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const cell = { x, y };
      if (!overlaps(r, cell)) continue;
      if (keepFree) free[y * COLS + x] = 0;
    }
  };
  // The map's own surface is a named job: it is not a void.
  if (mapRect) cellsOf(mapRect, true);
  // A void is flat emptiness. The page's ground — the paper behind everything —
  // is flat, and a region holding nothing but the ground is a void. An element
  // paints its box only when it paints something: its own background that
  // differs from the ground, a visible rule, or its own text. A container that
  // merely holds a descendant's text paints nothing around it, and marking such
  // a box as occupied is exactly how a rail carrying one short list looked like
  // a full screen of content: the list's own box was counted as occupied, and
  // the 360 x 392 px of flat white below it never appeared.
  const ground = getComputedStyle(document.body).backgroundColor;
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length);
  const paints = el => {
    const s = getComputedStyle(el);
    if (s.backgroundImage && s.backgroundImage !== 'none') return true;
    const bg = s.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== ground) return true;
    // A field paints its placeholder and its value. The reader sees "⌕ Search"
    // in the search box; a hairline-boxed field with a label in it is a control
    // waiting for text, not flat emptiness. Measuring it as a void made the
    // search box the largest empty rectangle on a phone screen.
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      && (((el.getAttribute('placeholder') || '') + (el.value || '')).trim().length)) return true;
    // A hairline rule paints its edge, not the box around it. Counting a 1px
    // border as if it filled its element marked the whole rail — 360 x 806 px —
    // as content, and the flat white below the last place vanished again.
    return ownText(el);
  };
  for (const el of all) { if (paints(el)) cellsOf(el.getBoundingClientRect(), true); }
  // A void is a region, not a band. The old probe took the longest free run in a
  // single row and multiplied it by one row's height, so a tall narrow dead band
  // in the rail — exactly the shape this defect takes — scored as one row's worth
  // and could never trip the threshold. Find the largest free rectangle instead.
  let voidPx = 0, voidTop = 0, voidW = 0, voidH = 0;
  {
    const heights = new Int32Array(COLS);
    let best = { area: 0, x: 0, y: 0, w: 0, h: 0 };
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) heights[x] = free[y * COLS + x] ? heights[x] + 1 : 0;
      for (let x = 0; x < COLS; x++) {
        let minH = Infinity;
        for (let x2 = x; x2 < COLS; x2++) {
          if (!heights[x2]) break;
          minH = Math.min(minH, heights[x2]);
          const area = minH * (x2 - x + 1);
          if (area > best.area) best = { area, x, y: y - minH + 1, w: x2 - x + 1, h: minH };
        }
      }
    }
    voidPx = best.area * cw * ch; voidW = best.w * cw; voidTop = best.y * ch; voidH = best.h * ch;
  }
  // The tallest dead band. The largest free rectangle is the biggest by area,
  // but a slab 43% of the screen's height is only 11% of its area — so the
  // area threshold alone let it through. A band that runs down a third of the
  // screen and is wide enough to be a column is a dead band whatever its area.
  let band = { h: 0, w: 0 };
  {
    // The longest CONTIGUOUS free run down each column. Counting free cells
    // instead of runs added up the gaps between list rows and reported a band
    // wider than the space that was actually empty.
    const run = new Int32Array(COLS);
    for (let x = 0; x < COLS; x++) {
      let cur = 0;
      for (let y = 0; y < ROWS; y++) {
        if (free[y * COLS + x]) { cur++; if (cur > run[x]) run[x] = cur; }
        else cur = 0;
      }
    }
    for (let x = 0; x < COLS; x++) {
      if (run[x] < band.h) continue;
      let x0 = x; while (x0 > 0 && run[x0 - 1] >= run[x]) x0--;
      let x1 = x; while (x1 < COLS - 1 && run[x1 + 1] >= run[x]) x1++;
      const cand = { h: run[x], w: (x1 - x0 + 1) * cw };
      if (cand.h > band.h || (cand.h === band.h && cand.w > band.w)) band = cand;
    }
  }

  // 3a-ii. nothing covers the map on load: the largest overlay standing on the map's surface
  let obstruction = { area: 0, cls: '', tag: '' };
  if (mapRect) {
    for (const el of all) {
      if (el === mapEl || el.contains(mapEl) || el.closest('#map') || el.closest('.maplibregl-control-container')) continue;
      // The rail's own panel and the category strip are the product's furniture
      // and they are already taken off the map's share. Counting them again as
      // obstructions would flag the rail itself; the rule is about what
      // *unexpectedly* stands on the map.
      if (el.closest('#side') || el.closest('nav.chips')) continue;
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

  // 3e. clipped controls. A control the layout pushes outside the viewport, or a
  // strip that hides its overflow behind a removed scrollbar, is not reachable.
  // At 320px "Food" sat at x=287-353 — outside the layout viewport — and at 260px
  // "Library" was sliced mid-word. The document did not scroll; the control was
  // simply gone, which the old probe could not see.
  const navChips = [...document.querySelectorAll('nav.chips button')].map(b => {
    const r = b.getBoundingClientRect();
    return { label: (b.innerText || '').trim().slice(0, 14), right: Math.round(r.right), w: Math.round(r.width) };
  });
  const navOutside = navChips.filter(c => c.w > 0 && c.right > vw + 1);
  // The filter strip lives inside the Explore disclosure. A closed disclosure
  // does not lay its content out, so scrollWidth/clientWidth on it is a layout
  // artefact of a box that was never rendered — not a hidden scroller. The real
  // question ("is any filter unreachable?") is asked in checkFilterStrip, with
  // the disclosure open. Here we only report a strip that is on screen.
  const strip = document.querySelector('.chip-scroll');
  // A closed <details> does not lay its content out. Chrome still reports a
  // box for the child, so the test cannot be "does it have a rect" — it is
  // "is this subtree being rendered at all". checkVisibility() with no
  // arguments answers exactly that; with an options object Chrome reports
  // false for anything it cannot prove visible.
  const stripRendered = !!(strip && strip.checkVisibility && strip.checkVisibility());
  const stripHidden = stripRendered ? Math.max(0, strip.scrollWidth - strip.clientWidth) : 0;

  // 3f. what the map actually draws. A share metric without a content floor always
  // prefers a bigger, emptier map: CL;UB once held 88.7% of the phone screen at
  // 4,259 m per pixel, carrying three cluster numbers and no street line-work.
  let mapContent = null, camera = null;
  try {
    const feats = map.queryRenderedFeatures();
    const om = feats.filter(f => f.source === 'openmaptiles');
    mapContent = {
      total: feats.length,
      omTotal: om.length,
      omLine: om.filter(f => f.layer.type === 'line').length,
      omFill: om.filter(f => f.layer.type === 'fill').length,
      omSymbol: om.filter(f => f.layer.type === 'symbol').length,
      places: feats.filter(f => f.source === 'places').length,
    };
    const z = map.getZoom(), c = map.getCenter();
    camera = { zoom: +z.toFixed(2), mpp: +(156543.03392 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, z)).toFixed(1) };
  } catch { /* the map is not ready yet */ }

  return {
    vw, vh,
    chrome: { topPx: Math.round(topPx), bottomPx: Math.round(bottomPx), columnPx: Math.round(columnPx),
      share: +((topPx + bottomPx + columnPx) / vh).toFixed(3) },
    mapShare: +mapShare.toFixed(3),
    mapShareNet: +mapShareNet.toFixed(3),
    mapOverlayShare: +mapOverlayShare.toFixed(4),
    mapOverlays: mapOverlays.slice(0, 6),
    mapIsFirst, hierarchyRatio: +ratio.toFixed(2), top3,
    voidPx: Math.round(voidPx), voidTop: Math.round(voidTop), voidW: Math.round(voidW), voidH: Math.round(voidH),
    band: { h: Math.round(band.h * ch), w: Math.round(band.w) },
    obstruction, obstructionShare: +obstructionShare.toFixed(3),
    inflated: inflated.slice(0, 6), orphans: orphans.slice(0, 6), bleed,
    clip: { navOutside, stripHidden: Math.round(stripHidden), stripRendered },
    mapContent, camera,
    task: { search: inFold(q), count: countPlaced, firstUseful },
    lang: document.documentElement.lang || '',
    title: document.title,
  };
};

// ---------------------------------------------------------------- the tap census
// MSH B13 asks for "≥44px taps" and STYLE.md draws the line: 44px belongs to
// isolated controls and full-width rows; a dense group of chips keeps its 32px.
//
// Nothing measured this until the fourth survey. Three audits found a 32x32
// drawer close button by hand and never looked at the header band, where the
// search, the wordmark and the three bar buttons sat at 36px on every screen
// of every page. So the rule is measured here, not remembered.
//
// A dense group is a row of small related chips or segments: the category
// chips, the moods and filters, the Explore action links, the walkthrough's
// mode segments, the hotspot pills, the sort options. An inline link inside a
// sentence is text, not a control (WCAG 2.5.8 exempts it), and a control whose
// hit area is expanded by a pseudo-element is 44px to the finger even when its
// box is smaller.
const TAPS = () => {
  // Inside the function: page.evaluate serialises it, so it cannot close over
  // anything in this module.
  const dense = ['.chips', '.moods', '.flags', '.chip-scroll', '.sorts', '.hotspots-row',
    '.explore-actions', '.model-seg', '.mood-bar', '.hits', '.street-controls']
    .map(s => document.querySelector(s)).filter(Boolean);
  const isDense = el => dense.some(d => d === el || d.contains(el));
  const out = [];
  for (const el of document.querySelectorAll('button, a[href], summary, select, input, [role="button"]')) {
    if (!el.checkVisibility()) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // A control that is not on the screen cannot be tapped. A screen-reader
    // only input is 1x1 and lives under a label that is the real control.
    if (r.width < 4 && r.height < 4) continue;
    // Prose is a link that flows inline with the sentence around it. A link
    // that is a block on its own — a card's action, a row's button — is a
    // control, however it is marked up.
    const inline = el.tagName === 'A' && cs.display.startsWith('inline')
      && !!el.closest('p, li, figcaption, td, th, blockquote, .src, dd, dt');
    if (isDense(el) || inline) continue;
    // A control whose hit area is expanded by a pseudo-element is 44px to the
    // finger even when its box is smaller — but the expansion has to be real.
    // Measure the pseudo-element's box and add it, so a token ::after cannot
    // pass as a 44px target.
    let effH = r.height, effW = r.width;
    const after = getComputedStyle(el, '::after');
    if (after && after.content !== 'none' && after.position === 'absolute') {
      const t = parseFloat(after.top), b = parseFloat(after.bottom);
      const l = parseFloat(after.left), ri = parseFloat(after.right);
      if (!Number.isNaN(t) || !Number.isNaN(b)) effH = r.height + (Number.isNaN(t) ? 0 : Math.max(0, -t)) + (Number.isNaN(b) ? 0 : Math.max(0, -b));
      if (!Number.isNaN(l) || !Number.isNaN(ri)) effW = r.width + (Number.isNaN(l) ? 0 : Math.max(0, -l)) + (Number.isNaN(ri) ? 0 : Math.max(0, -ri));
    }
    // Sub-pixel layout means a 44px target measures 43.94. Rounding to the
    // nearest pixel is the difference between measuring the interface and
    // measuring the browser's arithmetic.
    if (Math.round(effH) < 44 || Math.round(effW) < 44) {
      out.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
          + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''),
        w: Math.round(r.width), h: Math.round(r.height),
        effW: Math.round(effW), effH: Math.round(effH),
        text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30),
      });
    }
  }
  return out;
};

// The census in the state a reader actually meets it: the rail closed, and the
// rail open on a phone where the rail is a drawer.
async function censusTaps(page, open) {
  if (open) {
    await page.click('#list-toggle').catch(() => {});
    await page.waitForTimeout(700);
  }
  const found = await page.evaluate(TAPS);
  if (open) {
    await page.click('.list-close').catch(() => {});
    await page.waitForTimeout(400);
  }
  return found;
}

// The rail's one disclosure must keep its promise and must not cost the map.
// Both were broken once: on a phone "Show all 48 places" delivered eight,
// because opening the drawer covered the map and the count shrank under the
// reader's thumb; and one click at 1024 grew the paper panel to the full
// height of the screen, taking the map from 67% to 58%.
async function checkDisclosure(page, phone) {
  const btn = page.locator('#list [data-list-more]');
  if (!(await btn.count())) return { pass: true, skipped: 'no disclosure on this surface' };
  const label = (await btn.first().innerText()).trim();
  const capped = /^Show\s+[\d,]+\s+of\s/.test(label);
  const promised = Number(((label.match(capped ? /^Show\s+([\d,]+)\s+of/ : /^Show\s+all\s+([\d,]+)/) || [])[1] || '0').replace(/,/g, ''));
  const before = await page.evaluate(MEASURE);
  const beforeRows = await page.locator('#list .list-place').count();
  await btn.first().click();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(MEASURE);
  const afterRows = await page.locator('#list .list-place').count();
  const kept = promised ? afterRows >= promised : true;
  // On a phone the drawer is the reader's own temporary overlay: the map's
  // share with it open is not the first screen's share, and the floor belongs
  // to the screen the reader arrived on. So the drawer is closed again and the
  // arrival state is what is judged. On the desktop the rail is permanent
  // chrome, so the share with the rail standing is the first screen's share.
  let arrival = null;
  if (phone) {
    await page.click('.list-close').catch(() => {});
    await page.waitForTimeout(900);
    arrival = await page.evaluate(MEASURE);
  }
  const judged = arrival || after;
  const mapKept = judged.mapShare >= 0.6;
  return {
    label, promised, beforeRows, afterRows, kept, mapKept,
    mapBefore: +(before.mapShare * 100).toFixed(1),
    mapAfter: +(after.mapShare * 100).toFixed(1),
    mapArrival: arrival ? +(arrival.mapShare * 100).toFixed(1) : null,
    pass: kept && mapKept,
    why: [!kept && `it promised ${promised} and delivered ${afterRows}`,
      !mapKept && `the map fell to ${(judged.mapShare * 100).toFixed(1)}%`].filter(Boolean).join('; '),
  };
}

async function checkDrawerEscape(page) {
  // The phone drawer stands on the map. It has a 44px close button, so it is
  // not a trap — but a keyboard reader who opens it has to be able to leave it
  // with the key they already know. The fourth audit found it had no way out
  // but the button, and no Escape.
  const wrap = page.locator('#list-wrap');
  const toggle = page.locator('#list-toggle');
  if (!(await toggle.count())) return { pass: true, skipped: 'no list toggle on this surface' };
  const wasOpen = await wrap.evaluate(el => el.classList.contains('open'));
  if (!wasOpen) await toggle.click();
  await page.waitForTimeout(700);
  const opened = await wrap.evaluate(el => el.classList.contains('open'));
  if (!opened) return { pass: true, skipped: 'the rail is not a drawer on this surface' };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const closed = !(await wrap.evaluate(el => el.classList.contains('open')));
  const focusBack = await page.evaluate(() => document.activeElement?.id || '');
  return {
    pass: closed,
    closed, focusBack,
    why: closed ? '' : 'Escape did not close the drawer',
  };
}


// Is the local server still answering? A dead server and a slow catalogue look
// identical from inside the page — both are "the data never arrived" — but they
// mean opposite things: one is a fault in the product, the other is a fault in
// the rig. The measurement must be able to tell them apart, or a dead server
// gets reported as a layout failure (and it did: workerd ran out of memory
// after eight hours, and the gate spent four minutes timing out before saying
// so).
async function serverAlive(page) {
  try {
    const origin = new URL(page.url()).origin;
    const res = await fetch(origin + '/', { signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch { return false; }
}

// Every surface, not just the map. Three audits measured the map, the rail and
// the header band; nobody had ever censused the guide sheet, the notebook, the
// 3D hunt or the standalone pages — and they held the same 32px and 36px
// controls the header band held. A census that only opens one page is a
// census of one page.
const STANDALONE = ['/research', '/neighbourhoods', '/privacy', '/day', '/bridge-1958', '/404'];
const SHEETS = [['guide', '#guide'], ['notebook', '#passport'], ['3d-hunt', '#open-3d']];

async function plantTiny(page) {
  await page.evaluate(() => {
    const t = document.createElement('button');
    t.id = 'planted-tiny';
    t.textContent = 'x';
    t.style.cssText = 'position:absolute;left:8px;top:64px;width:22px;height:22px;z-index:7';
    document.body.append(t);
  });
}

async function censusSurfaces(browser, base, planted) {
  const surfaces = [];
  const widths = [{ w: 390, h: 844 }, { w: 1440, h: 900 }];
  for (const path of STANDALONE) {
    for (const { w, h } of widths) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
      const page = await ctx.newPage();
      await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(2500);
      if (planted) { await plantTiny(page); await page.waitForTimeout(200); }
      const found = await page.evaluate(TAPS);
      surfaces.push({ name: path, width: w, found });
      await ctx.close();
    }
  }
  for (const { w, h } of widths) {
    for (const [name, sel] of SHEETS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
      const page = await ctx.newPage();
      await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await ready(page);
      await page.click(sel).catch(() => { });
      await page.waitForTimeout(2500);
      if (planted) { await plantTiny(page); await page.waitForTimeout(200); }
      const found = await page.evaluate(TAPS);
      surfaces.push({ name, width: w, found });
      await ctx.close();
    }
  }
  return surfaces;
}

async function ready(page) {
  // Gate on the app's own data, not on the map's load event: 'load' waits for external tiles
  // and a slow tile server must not be able to hide a layout failure.
  // `state` and `map` are top-level consts: global lexical bindings, not window properties.
  const deadline = Date.now() + 240000;
  for (;;) {
    const ready = await page.evaluate(() => {
      if (typeof state === 'undefined' || typeof map === 'undefined' || !document.querySelector('#map canvas')) return false;
      const directoryReady = state.clubMode ? state.cannabisLoaded : state.catalogueStatus === 'ready';
      return directoryReady && !!map.getSource('places')?._data?.features?.length;
    }).catch(() => false);
    if (ready) break;
    if (Date.now() > deadline) throw new Error('the page never received its catalogue within 240s');
    if (!(await serverAlive(page))) {
      throw new Error(`the local server at ${new URL(page.url()).origin} stopped answering mid-run — it died, so this measurement is void, not a failure. Restart it and run again.`);
    }
    await page.waitForTimeout(2000);
  }
  await page.waitForFunction(() => !!map.getLayer('place-icons'), {}, { timeout: 90000 }).catch(() => { });
  // The basemap must have painted before the screen is judged. A map that has not
  // drawn yet is not a layout: measuring it reported "the basemap drew nothing"
  // and failed a screen that was merely early. The wait must be for what the
  // verdict measures — the street line-work — not for one feature. A single
  // polygon satisfied the old wait long before the lines were on the canvas,
  // and a resized canvas reports nothing until the next frame.
  await page.waitForFunction(() => {
    try {
      const om = map.queryRenderedFeatures({ source: 'openmaptiles' });
      const lines = om.filter(f => f.layer.type === 'line').length;
      const seen = window.__mshLines || 0;
      window.__mshLines = lines;
      // Two consecutive reads of at least the floor: the map has stopped
      // growing and the lines are really there.
      return lines >= 40 && seen >= 40;
    } catch { return false; }
  }, { polling: 250 }, { timeout: 120000 }).catch(() => { });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
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
    if (shot) await page.screenshot({ path: new URL(`manga-lens-${shot}.png`, outDir).pathname , timeout: 120000 });
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
    // The 3D hunt lives in the header band, once. The rail used to carry a second
    // copy of the same control, ninety pixels away from it.
    await page.locator('#open-3d').click({ timeout: 15000 });
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
    if (shot) await page.screenshot({ path: new URL(`walkthrough-${shot}.png`, outDir).pathname , timeout: 120000 });
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

// A reader who enlarges text gets a narrower layout. The search must survive it,
// and no category may be pushed out of the viewport by it.
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
      // The header bar was never the control that got lost: the category row was.
      const chips = [...document.querySelectorAll('nav.chips button')].map(b => {
        const r = b.getBoundingClientRect();
        return { label: (b.innerText || '').trim().slice(0, 14), right: Math.round(r.right), w: Math.round(r.width) };
      });
      const outside = chips.filter(c => c.w > 0 && c.right > innerWidth + 1);
      return {
        viewport: 260, searchWidth: Math.round(w), barOverflow: overflow, bleed,
        inputPresent: !!input,
        chipsOutside: outside,
        pass: w >= 120 && overflow <= 1 && !bleed && !!input && outside.length === 0,
      };
    });
  } finally { await context.close(); }
}

// The filter strip now lives inside the Explore disclosure. Putting filters
// behind a labelled disclosure is honest design; putting them inside a
// horizontal scroller with the scrollbar removed is not — that is how
// "Crossing paths" lost half its name to an invisible edge. This opens the
// disclosure and asks the only question that matters: once the reader is
// looking at it, is every filter reachable, unwrapped and uncut?
async function checkFilterStrip(page) {
  // On a phone the rail is a drawer. The filters are not on screen until the
  // reader opens it, so the check must open the drawer first — otherwise it
  // measures a box nobody can see and calls it empty.
  await page.evaluate(() => {
    const rail = document.querySelector('#list-wrap');
    const open = rail && rail.classList.contains('open');
    const toggle = document.querySelector('#list-toggle');
    // The toggle only exists on a phone. On a desktop the rail is always there.
    const toggleVisible = toggle && toggle.checkVisibility ? toggle.checkVisibility() : toggle.getClientRects().length > 0;
    if (!open && toggleVisible) toggle.click();
  });
  await page.waitForTimeout(700);
  return await page.evaluate(() => {
    const det = document.querySelector('#side .list-explore');
    if (!det) return { present: false, pass: false, detail: 'the Explore disclosure is missing' };
    det.open = true;
    const strip = det.querySelector('.chip-scroll');
    if (!strip) return { present: false, pass: false, detail: 'the filter strip is missing' };
    const visible = strip.checkVisibility ? strip.checkVisibility() : strip.getClientRects().length > 0;
    if (!visible) return { present: false, pass: false, detail: 'the filter strip is not on screen — the rail never opened' };
    const box = strip.getBoundingClientRect();
    const hidden = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const chips = [...strip.querySelectorAll('button')].map(b => {
      const r = b.getBoundingClientRect();
      return { label: (b.innerText || '').trim().slice(0, 14), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), top: Math.round(r.top) };
    }).filter(c => c.w > 0); // a button in a hidden group has no box: it is not offered
    const outside = chips.filter(c => c.right > box.right + 1 || c.left < box.left - 1);
    const rows = new Set(chips.map(c => c.top)).size;
    const pass = chips.length > 0 && hidden <= 1 && outside.length === 0;
    return {
      present: true, open: det.open, hidden: Math.round(hidden), chips: chips.length, rows,
      overflowX: getComputedStyle(strip).overflowX,
      outside: outside.map(c => c.label),
      pass,
      detail: pass ? '' : `${chips.length} filters in ${rows} row(s), ${hidden}px hidden, ${outside.length} outside the strip`,
    };
  });
}

// CL;UB is half the product: a mode the old instrument never opened. Its own
// preservation is measured here — the mood group that did nothing, the Explore
// disclosure that was removed wholesale, the country-wide camera, the country action.
async function checkClub(page, base) {
  const checks = { errors: [] };
  checks.clubMode = await page.evaluate(() => !!state.clubMode);
  checks.explore = await page.evaluate(() => {
    const d = document.querySelector('#side .list-explore');
    if (!d) return { present: false };
    d.open = true;
    const actions = d.querySelector('.explore-actions');
    const r = actions ? actions.getBoundingClientRect() : { height: 0 };
    const buttons = actions ? actions.querySelectorAll('button, a').length : 0;
    return { present: true, open: d.open, height: Math.round(r.height), destinations: buttons };
  });
  checks.moodsHidden = await page.evaluate(() => {
    const m = document.querySelector('#side .chip-scroll .moods');
    if (!m) return true;
    const s = getComputedStyle(m);
    return s.display === 'none' || s.visibility === 'hidden';
  });
  checks.camera = await page.evaluate(() => {
    const z = map.getZoom(), c = map.getCenter();
    return { zoom: +z.toFixed(2), mpp: +(156543.03392 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, z)).toFixed(1) };
  });
  checks.thailandAction = await page.evaluate(async () => {
    const d = document.querySelector('#club-hotspots details');
    if (!d) return { present: false };
    d.open = true;
    const b = d.querySelector('[data-thailand]');
    if (!b) return { present: false };
    const before = map.getZoom();
    b.click();
    // The flight to the national bounds takes longer than a beat. Wait for the
    // camera to settle, or the check reads a half-finished flight as a dead button.
    let after = before, last = before;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 150));
      after = map.getZoom();
      if (Math.abs(after - last) < 0.01 && i > 3) break;
      last = after;
    }
    return { present: true, label: b.textContent.trim(), before: +before.toFixed(2), after: +after.toFixed(2), zoomedOut: after < before - 1 };
  });
  checks.search = await page.evaluate(async () => {
    const q = document.querySelector('#q');
    if (!q) return 0;
    q.focus();
    q.value = 'dispensary';
    q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 900));
    return document.querySelectorAll('#hits li').length;
  });
  return checks;
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
  // A dead band: flat emptiness running down more than a third of the screen,
  // wide enough to be a column. The area rule alone let a 360 x 392 px slab
  // through — 43% of the screen's height, but only 11% of its area.
  if (view.band && view.band.h > view.vh * 0.30 && view.band.w >= Math.max(200, view.vw * 0.25)) {
    F('B4 void', `a flat empty band ${view.band.w}x${view.band.h} runs down ${(100 * view.band.h / view.vh).toFixed(0)}% of the screen with nothing in it`);
  }
  if (view.obstructionShare > 0.12) F('B9 map obstruction', `${view.obstruction.cls || view.obstruction.tag} covers ${(view.obstructionShare * 100).toFixed(0)}% of the map`);
  if (view.inflated.length) F('B3 box fit', view.inflated.map(i => `${i.cls || i.tag} ${i.h}px holds ${i.textH}px of text`).join('; '));
  if (view.orphans.length) F('B4 orphan column', view.orphans.map(o => `${o.cls || o.tag} ${o.w}px wide on ${view.vw}px`).join('; '));
  if (view.bleed) F('B11 horizontal bleed', 'the document scrolls sideways');
  if (!view.mapIsFirst) F('B7 hierarchy', 'the map is not the largest thing on the first screen');
  if (view.hierarchyRatio < 1.5) F('B7 hierarchy', `top two areas differ by only ${view.hierarchyRatio}x`);
  if (!view.task.search || !view.task.count) F('B1 first-screen task', 'the search or the count is below the fold');
  // The map must draw the place. The city views render thousands of source street
  // lines; the empty national view rendered 16. Below the floor, the map is a field.
  if (view.mapContent) {
    if (view.mapContent.omTotal === 0) F('B9 map content', 'the basemap drew nothing on the first screen');
    else if (view.mapContent.omLine < 40) F('B9 map content', `the first screen draws ${view.mapContent.omLine} source street lines — the map is a field, not a place`);
  }
  if (view.clip) {
    if (view.clip.navOutside && view.clip.navOutside.length) F('B13 no clip', `the category row pushes ${view.clip.navOutside.map(c => c.label || 'a chip').join(', ')} outside the viewport`);
    if (view.clip.stripHidden > 1) F('B3 box fit', `the rail hides ${view.clip.stripHidden}px of filters in a scroller with no scrollbar`);
  }
  if (view.lang !== 'en') F('B12 language', `lang is "${view.lang}"`);
  // B13: an isolated control is a 44px tap. A dense chip row keeps its 32px,
  // and an inline link in a sentence is text — but everything else that a
  // finger has to hit is measured here, in every mode and at every width.
  if (view.taps && view.taps.length) {
    F('B13 tap target', view.taps.map(t => `${t.sel} ${t.w}x${t.h} "${t.text}"`).join('; '));
  }
  if (view.placeSheet && (!view.placeSheet.pass || (PLANTED && view.placeSheet.plantedRejected !== true))) F('B1 place sheet', `Bridge facts or Directions failed the reading budget: ${JSON.stringify(view.placeSheet)}`);
  if (view.thaiName && !view.thaiName.pass) F('B12 Thai typography', `a Thai place name does not wear the Thai face: ${JSON.stringify(view.thaiName)}`);
  if (view.visitReading && (!view.visitReading.pass || (PLANTED && view.visitReading.plantedRejected !== true))) F('B1 visit reading order', `Bridge photo, facts and actions failed the reading budget: ${JSON.stringify(view.visitReading)}`);
  if (view.dayPlanner && (!view.dayPlanner.pass || (PLANTED && view.dayPlanner.plantedRejected !== true))) F('B1 day planner', `A planner action failed the first-screen budget: ${JSON.stringify(view.dayPlanner)}`);
  if (journey) {
    if (!journey.places?.pass) F('B14 grouped places', 'the sidebar needs short category previews and a first-screen work action');    if (PLANTED && journey.ungroupedRejected !== true) F('B14 grouped places', 'the grouped-places gate accepted an ungrouped list');
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

// CL;UB is a second product in the same codebase. The instrument that never
// opened it could not see the four defects that lived only there.
function clubVerdict(club) {
  const fails = [];
  const F = (id, detail) => fails.push({ id, detail });
  if (!club) return { fails, verdict: 'REVISE' };
  if (!club.clubMode) F('B14 preservation', 'the club mode did not open');
  if (!club.explore?.present || !club.explore.height) F('B14 preservation', `the Explore disclosure is missing or empty in CL;UB (${JSON.stringify(club.explore)})`);
  if (!club.moodsHidden) F('B14 preservation', 'CL;UB shows a mood group whose chips do nothing');
  if (!club.thailandAction?.present) F('B14 preservation', 'CL;UB has no explicit All Thailand action');
  if (club.camera && club.camera.zoom < 11) F('B9 map content', `CL;UB opens at zoom ${club.camera.zoom} (${club.camera.mpp} m per pixel) — the country, not the listings`);
  if (!club.search) F('B14 preservation', 'CL;UB search returns nothing');
  return { fails, verdict: fails.length ? 'REVISE' : 'PASS' };
}

// ---------------------------------------------------------------- run
const { chromium } = loadPlaywright();
const base = await startServer();
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(CHROME ? { executablePath: CHROME } : {}) });
const report = { stamp, base, planted: PLANTED, viewports: [], journey: null, club: null, verdict: 'PASS', fails: [] };
// Two products live in this codebase. The instrument that only opened PL;UB
// could not see the four defects that existed only in CL;UB.
const MODES = [
  { key: 'plub', label: 'PL;UB', url: base, full: true },
  { key: 'club', label: 'CL;UB', url: base + (base.includes('?') ? '&' : '?') + 'mode=club', full: false },
];
try {
  for (const mode of MODES) {
  for (const { w, h } of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
    const page = await context.newPage();
    await page.goto(mode.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
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
        // A third known defect: a control a finger cannot hit. The tap census
        // must catch it, or the census is decorative.
        const t = document.createElement('button');
        t.id = 'planted-tiny';
        t.textContent = 'x';
        t.style.cssText = 'position:absolute;left:8px;top:64px;width:22px;height:22px;z-index:7';
        document.body.append(t);
      });
      await page.waitForTimeout(400);
    }
    const view = await page.evaluate(MEASURE);
    view.pinsLayer = pins;
    // The tap census, in the state the reader meets the rail: closed on the
    // desktop, and open on a phone where the rail is a drawer.
    view.taps = await censusTaps(page, w === 390);
    await page.screenshot({ path: new URL(`${PLANTED ? 'planted' : 'view'}-${mode.key}-${w}.png`, outDir).pathname , timeout: 120000 });
    if (mode.full) {
      try { view.placeSheet = await checkPlaceSheet(page, base); }
      catch (error) { view.placeSheet = { pass: false, error: String(error.message).split('\n')[0] }; }
      await page.screenshot({ path: new URL(`${PLANTED ? 'place-planted' : 'place'}-${w}.png`, outDir).pathname , timeout: 120000 });
      try { view.visitReading = await checkVisitReadingOrder(page, base); }
      catch (error) { view.visitReading = { pass: false, error: String(error.message).split('\n')[0] }; }
      await page.screenshot({ path: new URL(`${PLANTED ? 'visit-planted' : 'visit'}-${w}.png`, outDir).pathname , timeout: 120000 });
      try { view.dayPlanner = await checkDayPlanner(page, base); }
      catch (error) { view.dayPlanner = { pass: false, error: String(error.message).split('\n')[0] }; }
      // Last, because it opens a different place: the shots above must keep the page
      // they were taken on.
      try { view.thaiName = await checkThaiName(page, base); }
      catch (error) { view.thaiName = { pass: false, error: String(error.message).split('\n')[0] }; }
    }
    report.viewports.push({ mode: mode.key, width: w, height: h, ...view });
    await context.close();
  }
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await ready(page);
  report.journey = await PRESERVE(page, base, 'live');
  await context.close();
  // CL;UB's own preservation, in its own mode.
  {
    const cctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Bangkok' });
    const cpage = await cctx.newPage();
    const errs = [];
    cpage.on('pageerror', e => errs.push(String(e)));
    cpage.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await cpage.goto(MODES[1].url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await ready(cpage);
    report.club = { ...(await checkClub(cpage, base)), errors: errs };
    await cctx.close();
  }
  // The filter strip, measured open, in both modes, at both ends of the range.
  // Its own context, so opening the disclosure cannot disturb a measurement
  // already taken.
  report.filterStrip = [];
  for (const mode of MODES) {
    for (const { w, h } of [{ w: 390, h: 844 }, { w: 1440, h: 900 }]) {
      const sctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
      const spage = await sctx.newPage();
      await spage.goto(mode.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await ready(spage);
      const res = await checkFilterStrip(spage);
      report.filterStrip.push({ mode: mode.key, width: w, ...res });
      await sctx.close();
    }
  }
  report.enlargedText = await checkEnlargedText(browser, base);
  // The tap census, over every surface the product has: the map's own sheets
  // and the standalone pages. A census that opens one page is a census of one
  // page, and the guide sheet and the notebook were never opened by anything.
  report.surfaces = await censusSurfaces(browser, base, PLANTED);
  // The disclosure, in both modes, on the desktop and on a phone with the
  // drawer open. It must keep its promise and it must not take the map.
  report.disclosure = [];
  report.drawerEscape = [];
  for (const mode of MODES) {
    for (const { w, h, open } of [{ w: 390, h: 844, open: true }, { w: 1440, h: 900, open: false }]) {
      const dctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Bangkok' });
      const dpage = await dctx.newPage();
      await dpage.goto(mode.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await ready(dpage);
      if (open) {
        await dpage.click('#list-toggle').catch(() => {});
        await dpage.waitForTimeout(900);
      }
      const res = await checkDisclosure(dpage, open);
      report.disclosure.push({ mode: mode.key, width: w, ...res });
      // The phone drawer must also be escapable by keyboard. Only on the phone:
      // on the desktop the rail is permanent chrome, not a drawer.
      if (open) {
        if (PLANTED) {
          // A fourth known defect: a handler that swallows the key the reader
          // would use to leave the drawer. The gate must catch it.
          await dpage.evaluate(() => {
            document.addEventListener('keydown', e => {
              if (e.key === 'Escape') e.stopImmediatePropagation();
            }, true);
          });
          await dpage.waitForTimeout(300);
        }
        const esc = await checkDrawerEscape(dpage);
        report.drawerEscape.push({ mode: mode.key, width: w, ...esc });
      }
      await dctx.close();
    }
  }
} finally {
  await browser.close();
  if (child) child.kill();
}

for (const v of report.viewports) {
  const r = verdictFor(v, null);
  report.fails.push(...r.fails.map(f => ({ ...f, width: `${v.mode}-${v.width}` })));
  v.verdict = r.verdict;
}
{
  const r = verdictFor({ vw: 1440, vh: 900, chrome: { share: 0 }, mapShare: 1, mapShareNet: 1, mapOverlayShare: 0, mapOverlays: [], voidPx: 0, obstructionShare: 0, inflated: [], orphans: [], bleed: false, mapIsFirst: true, hierarchyRatio: 9, task: { search: true, count: true }, lang: 'en' }, report.journey);
  report.fails.push(...r.fails.map(f => ({ ...f, width: 'journey' })));
}
{
  const r = clubVerdict(report.club);
  report.fails.push(...r.fails.map(f => ({ ...f, width: 'club' })));
  if (report.club) report.club.verdict = r.verdict;
}
// A reader who enlarges text gets a narrower layout. The search must survive it.
if (report.enlargedText && !report.enlargedText.pass) {
  report.fails.push({ id: 'B15 enlarged text', detail: `at 260px (a 390px phone at 150% text) the search is ${report.enlargedText.searchWidth}px wide, the bar overflows by ${report.enlargedText.barOverflow}px, the page scrolls sideways: ${report.enlargedText.bleed}, and ${(report.enlargedText.chipsOutside || []).map(c => c.label || 'a chip').join(', ') || 'no chip'} sits outside the viewport`, width: '260' });
}
// Every filter must be reachable once the reader opens Explore. A filter that
// is cut, or scrolled out of sight behind a removed scrollbar, is not offered —
// it is hidden, and a hidden filter is a lie about what the map can show.
for (const s of report.filterStrip || []) {
  if (!s.pass) report.fails.push({ id: 'B3 box fit', detail: `the filter strip hides filters: ${s.detail || 'the strip is missing'}`, width: `${s.mode}-${s.width}-strip` });
}
// The rail's one disclosure: it must keep its promise and it must not take the
// map. A disclosure that says "Show all 48 places" and delivers eight is a
// lie; one that takes the map below 60% is a bad trade.
for (const d of report.disclosure || []) {
  if (d.pass) continue;
  if (!d.kept) report.fails.push({ id: 'B1 first-screen task', detail: `the disclosure broke its promise at ${d.mode} ${d.width}px: "${d.label}" delivered ${d.afterRows} rows`, width: `${d.mode}-${d.width}-disclosure` });
  if (!d.mapKept) report.fails.push({ id: 'B9 map share', detail: `opening the disclosure at ${d.mode} ${d.width}px took the map from ${d.mapBefore}% to ${d.mapAfter}%`, width: `${d.mode}-${d.width}-disclosure` });
}
// The phone drawer stands on the map, so it must be escapable by keyboard. A
// drawer with a 44px close button and no Escape is a surface a keyboard reader
// cannot leave the way they expect to.
for (const e of report.drawerEscape || []) {
  if (!e.pass) report.fails.push({ id: 'B13 tap target', detail: `the phone drawer at ${e.mode} ${e.width}px has no keyboard way out: ${e.why || 'Escape did not close it'}`, width: `${e.mode}-${e.width}-escape` });
}
// Every surface, not only the map.
for (const s of report.surfaces || []) {
  if (!s.found || !s.found.length) continue;
  report.fails.push({ id: 'B13 tap target', detail: `${s.name} at ${s.width}px has a control a finger cannot hit: ${s.found.map(t => `${t.sel} ${t.w}x${t.h} "${t.text}"`).join('; ')}`, width: `${s.name.replace(/\W+/g, '-')}-${s.width}-taps` });
}
report.verdict = report.fails.length ? (report.fails.some(f => /map share|void|bleed|runtime/.test(f.id)) ? 'BLOCK' : 'REVISE') : 'PASS';

await writeFile(new URL(PLANTED ? 'msh-report-planted.json' : 'msh-report.json', outDir), JSON.stringify(report, null, 2) + '\n');

// The gate must be able to fail.
if (PLANTED) {
  const caught = report.fails.some(f => /void|obstruct|map/.test(f.id));
  // The planted drawer must be rejected too: a check that cannot fail is a
  // decoration. Both modes' drawers are swallowed, so both must be reported.
  const escRejected = (report.drawerEscape || []).length > 0 && report.drawerEscape.every(e => !e.pass);
  // The planted button must be caught on the standalone pages too, or the
  // surface census is a census that cannot fail.
  const surfaceRejected = (report.surfaces || []).some(s => (s.found || []).some(t => t.sel.includes('planted-tiny')));
  console.log(`Planted defect: ${report.fails.length} failure(s) reported; the gate caught it: ${caught}; the swallowed Escape was rejected: ${escRejected}; the planted button was caught on another surface: ${surfaceRejected}.`);
  for (const f of report.fails) console.log(`  PLANTED FAIL [${f.width}] ${f.id}: ${f.detail}`);
  if (!caught || !escRejected || !surfaceRejected || report.journey.ungroupedRejected !== true || report.fails.some(f => f.width === 'journey' || f.id === 'B1 place sheet' || f.id === 'B1 visit reading order' || f.id === 'B1 day planner')) { console.error('THE PLANTED OR PRESERVATION CHECK FAILED.'); process.exit(2); }
  console.log(`Report: ${new URL('msh-report-planted.json', outDir).pathname}`);
  process.exit(0);
}

const lines = [];
lines.push(`MSH audit ${stamp} · ${report.base} · planted=${PLANTED}`);
for (const v of report.viewports) {
  lines.push(`  ${(v.mode || 'plub').padEnd(5)} ${String(v.width).padStart(4)}px  chrome ${v.chrome.topPx}+${v.chrome.bottomPx}+${v.chrome.columnPx || 0}px (${(v.chrome.share * 100).toFixed(0)}%)  map ${(v.mapShare * 100).toFixed(0)}% (net ${(v.mapShareNet * 100).toFixed(0)}%)  void ${(100 * v.voidPx / (v.vw * v.vh)).toFixed(1)}% ${v.voidW}x${v.voidH}  band ${v.band?.w}x${v.band?.h}  lines ${v.mapContent?.omLine ?? '?'}  z${v.camera?.zoom ?? '?'}  ${v.verdict}`);
}
lines.push(`  journey: search ${report.journey.search} hits · chip ${report.journey.chipChanged ? 'works' : 'NO CHANGE'} · hop ${report.journey.hopStops} stops · shared feed "${String(report.journey.hopFeed).slice(0, 40)}" · lens ${report.journey.lensOn?.ground}/${report.journey.lensOff?.ground} · writes ${report.journey.writes.length}`);
if (report.club) lines.push(`  club:   mode ${report.club.clubMode} · explore ${report.club.explore?.height}px/${report.club.explore?.destinations} destinations · moods hidden ${report.club.moodsHidden} · camera z${report.club.camera?.zoom} (${report.club.camera?.mpp} m/px) · all-thailand ${report.club.thailandAction?.zoomedOut ? 'works' : 'NO'} · search ${report.club.search} · errors ${(report.club.errors || []).length}`);
if (report.enlargedText) lines.push(`  260px  enlarged text (390px phone at 150%): search ${report.enlargedText.searchWidth}px · bar overflow ${report.enlargedText.barOverflow}px · sideways ${report.enlargedText.bleed ? 'yes' : 'no'}  ${report.enlargedText.pass ? 'PASS' : 'FAIL'}`);
for (const s of report.filterStrip || []) lines.push(`  strip  ${s.mode} ${s.width}px: ${s.chips} filters in ${s.rows} row(s) · ${s.hidden}px hidden · outside ${(s.outside || []).length}  ${s.pass ? 'PASS' : 'FAIL'}`);
for (const e of report.drawerEscape || []) lines.push(`  escape ${e.mode} ${e.width}px: the drawer closes on Escape and returns focus to "${e.focusBack || 'nothing'}"  ${e.pass ? 'PASS' : 'FAIL'}`);
for (const s of report.surfaces || []) lines.push(`  taps   ${s.name} ${s.width}px: ${s.found.length} control(s) under 44px  ${s.found.length ? 'FAIL' : 'PASS'}`);
for (const f of report.fails) lines.push(`  FAIL [${f.width}] ${f.id}: ${f.detail}`);
lines.push(`Verdict: ${report.verdict}`);
console.log(lines.join('\n'));
console.log(`Report: ${new URL('msh-report.json', outDir).pathname}`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
