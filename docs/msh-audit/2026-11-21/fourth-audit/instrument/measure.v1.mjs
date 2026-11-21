#!/usr/bin/env node
// MSH audit #4 — independent measurement instrument.
// Auditor: Verifier (independent; did not build the artifact).
// Reads only. Never mutates the repository or the live hosts.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(
  '/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS = ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader'];

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const URL_ = arg('url', 'https://co.nonarkara.org');
const MODE = arg('mode', 'plub');
const OUTDIR = arg('out', '/tmp/msh-audit-verifier-4/out');
const LABEL = arg('label', MODE + '-' + arg('vw','1024'));
const VWS = String(arg('vw','390,1024,1440')).split(',').map(v=>parseInt(v.trim(),10)).filter(v=>v>0);

fs.mkdirSync(OUTDIR, { recursive: true });
fs.mkdirSync('/tmp/msh-audit-verifier-4/shots', { recursive: true });

const HELPERS = `
function visible(el){ if(!el) return false; try { return el.checkVisibility(); } catch(e){ return false; } }
function rect(el){ if(!el) return null; const r=el.getBoundingClientRect();
  return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
    top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),left:+r.left.toFixed(1),right:+r.right.toFixed(1)}; }
function deepText(el){ return (el.innerText||el.textContent||'').trim(); }
function all(sel){ return Array.from(document.querySelectorAll(sel)); }
`;

async function probePage(page) {
  return await page.evaluate(`(() => {
    ${HELPERS}
    const out = { url: location.href, title: document.title };
    out.hasMap = (typeof map !== 'undefined' && !!map);
    if (out.hasMap) {
      try {
        out.zoom = map.getZoom();
        const c = map.getCenter();
        out.center = {lng:+c.lng.toFixed(6), lat:+c.lat.toFixed(6)};
        const b = map.getBounds();
        out.bounds = {w:+b.getWest().toFixed(6), s:+b.getSouth().toFixed(6), e:+b.getEast().toFixed(6), n:+b.getNorth().toFixed(6)};
        out.mapSize = {w: map.getContainer().clientWidth, h: map.getContainer().clientHeight};
        out.canvas = rect(map.getCanvas());
        out.containerRect = rect(map.getContainer());
      } catch(e){ out.mapErr = String(e); }
    }
    out.viewport = {w: innerWidth, h: innerHeight, dpr: devicePixelRatio};

    const canvases = all('canvas.maplibregl-canvas').filter(visible);
    let best = null;
    for (const c of canvases) {
      const r = rect(c), vw = innerWidth, vh = innerHeight;
      const iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const area = iw*ih;
      if (!best || area > best.area) {
        best = { area:+area.toFixed(0), visibleW:+iw.toFixed(1), visibleH:+ih.toFixed(1),
                 sharePct:+(100*area/(vw*vh)).toFixed(2), rect:r };
      }
    }
    out.mapShare = best ? best.sharePct : null;
    out.mapShareDetail = best;
    out.canvasCount = canvases.length;

    // count text
    const countText = (() => {
      const hits = all('*').filter(el => {
        const t = deepText(el);
        return t && /places in view|places visible|showing|results in view/i.test(t) && t.length < 240 && el.children.length < 8;
      });
      return hits.map(el => ({ tag: el.tagName, cls: String(el.className||'').slice(0,140),
        text: deepText(el).slice(0,200), rect: rect(el), visible: visible(el) }));
    })();
    out.countTextNodes = countText;

    function paperPanel(el){
      let n = el;
      while (n && n !== document.body) {
        const cls = String(n.className||'');
        if (/(paper|panel|card|rail|drawer|sheet|list)/i.test(cls)) return n;
        n = n.parentElement;
      }
      return null;
    }
    const srcEl = countText.length ? (countText.find(c=>c.visible) || countText[0]) : null;
    if (srcEl) {
      const hit = all('*').filter(el => {
        const t = deepText(el);
        return t && /places in view|places visible|showing|results in view/i.test(t) && t.length < 240 && el.children.length < 8;
      });
      const el = hit[0];
      const panel = el ? paperPanel(el) : null;
      out.paperPanel = panel ? { cls: String(panel.className).slice(0,180), rect: rect(panel), visible: visible(panel) } : null;
      out.countEl = el ? { cls: String(el.className||'').slice(0,180), rect: rect(el), text: deepText(el).slice(0,160) } : null;
    }

    // last visible list row
    const rows = all('[class*="row"],[class*="card"],[class*="item"],[class*="place"],li');
    const visRows = rows.filter(el => visible(el) && el.getBoundingClientRect().height > 8 && el.getBoundingClientRect().width > 40);
    if (visRows.length) {
      const last = visRows.reduce((a,b)=> (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
      out.lastRow = { cls: String(last.className||'').slice(0,160), rect: rect(last), text: deepText(last).slice(0,120) };
    }

    out.statedCount = null; out.statedText = null;
    for (const c of countText) {
      if (!c.visible) continue;
      const m = deepText(c).match(/(\\d+)\\s*(?:places?|results?|spots?|pins?)/i) || deepText(c).match(/places? in view[^0-9]{0,12}(\\d+)/i);
      if (m) { out.statedCount = parseInt(m[1],10); out.statedText = deepText(c); break; }
    }

    try { out.lastListLen = (typeof lastList !== 'undefined' && lastList) ? lastList.length : null; } catch(e){}
    try {
      if (typeof lastList !== 'undefined' && lastList && lastList[0]) {
        const s = lastList[0];
        out.lastListSample = Object.fromEntries(Object.entries(s).filter(([k,v]) => typeof v !== 'object' || v === null));
      }
    } catch(e){}
    try {
      if (typeof state !== 'undefined' && state) {
        out.stateKeys = Object.keys(state);
        out.state = JSON.parse(JSON.stringify(state, (k,v)=> typeof v === 'function' ? '[fn]' : (v instanceof Map ? '[map]' : v)));
      }
    } catch(e){ out.stateErr = String(e); }

    // rendered features
    try {
      const feats = map.queryRenderedFeatures();
      out.renderedFeatureCount = feats.length;
      out.renderedLayers = Array.from(new Set(feats.map(f=>f.layer && f.layer.id))).filter(Boolean);
      out.renderedSample = feats.slice(0,3).map(f=>({layer:f.layer&&f.layer.id, geom:f.geometry&&f.geometry.type, props:f.properties}));
      const placeFeats = feats.filter(f => f.properties && (f.properties.name || f.properties.title || f.properties.id));
      out.renderedPlaceCount = placeFeats.length;
      out.renderedPlaceNames = placeFeats.slice(0,300).map(f=>f.properties.name||f.properties.title||f.properties.id);
    } catch(e){ out.renderedErr = String(e); }

    // buttons
    out.buttons = all('button,[role="button"]').filter(el=>visible(el)).map(el=>{
      const r = rect(el);
      return { tag: el.tagName, cls: String(el.className||'').slice(0,140),
        text: deepText(el).slice(0,90), aria: el.getAttribute('aria-label')||null,
        expanded: el.getAttribute('aria-expanded'), rect: r, w:+r.w.toFixed(1), h:+r.h.toFixed(1) };
    });

    // details
    out.details = all('details').map(d=>({
      cls:String(d.className||'').slice(0,140), open:d.open,
      summary: d.querySelector('summary') ? deepText(d.querySelector('summary')).slice(0,140) : null,
      summaryVisible: d.querySelector('summary') ? visible(d.querySelector('summary')) : null,
      rect: rect(d) }));

    // ground probes below paper panel
    out.ground = [];
    const pr = out.paperPanel && out.paperPanel.rect;
    if (pr) {
      for (const dy of [8, 30, 60, 120]) {
        const x = 180, y = pr.bottom + dy;
        if (y < 0 || y > innerHeight) { out.ground.push({x,y,offscreen:true}); continue; }
        const stack = document.elementsFromPoint(x,y).slice(0,4).map(e=>({tag:e.tagName, cls:String(e.className||'').slice(0,110), id:e.id||null}));
        const canvasHit = all('canvas.maplibregl-canvas').some(c=>{const r=c.getBoundingClientRect();
          return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
        const el = document.elementFromPoint(x,y);
        out.ground.push({x, y, stack, canvasHit, top: el ? {tag:el.tagName, cls:String(el.className||'').slice(0,110)} : null});
      }
    }
    return out;
  })()`);
}

async function clickThroughDisclosure(page) {
  const out = { clicks: 0, steps: [], disclosureLabels: [], reachedRows: null };
  try {
    for (let i = 0; i < 6; i++) {
      const st = await page.evaluate(`(() => {
        const cands = Array.from(document.querySelectorAll('button,[role="button"],summary')).filter(e=>{
          const t=(e.innerText||e.getAttribute('aria-label')||'');
          return /more|show|expand|see all|view all|reveal|see |places|list/i.test(t);
        }).filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;});
        return {cands: cands.map(e=>({tag:e.tagName,text:(e.innerText||'').trim().slice(0,90),
          expanded:e.getAttribute('aria-expanded'), open:e.tagName==='SUMMARY'?e.parentElement.open:null,
          visible:e.checkVisibility()}))};
      })()`);
      out.steps.push(st);
      const cand = st.cands.find(c=>c.visible!==false && c.expanded!=='true' && c.open!==true);
      if (!cand) break;
      out.disclosureLabels.push(cand.text);
      const clicked = await page.evaluate((t) => {
        const els = Array.from(document.querySelectorAll('button,[role="button"],summary'));
        const e = els.find(x => (x.innerText||'').trim().slice(0,90) === t);
        if (!e) return null;
        e.click();
        return (e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,90);
      }, cand.text);
      out.clicks++;
      await page.waitForTimeout(800);
      if (clicked === null) break;
    }
    out.reachedRows = await page.evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('[class*="row"],[class*="card"],[class*="item"],[class*="place"]'))
        .filter(e=>{const r=e.getBoundingClientRect(); return r.width>40 && r.height>8;});
      return rows.length;
    })()`);
  } catch (e) { out.err = String(e); }
  return out;
}

async function keyboardProbe(page) {
  const out = { sequence: [], trap: null, noIndicator: [] };
  try {
    await page.evaluate(`(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); })`);
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press('Tab');
      const s = await page.evaluate(`(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return {none:true};
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return { tag:a.tagName, cls:String(a.className||'').slice(0,90),
          text:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,50),
          visible: a.checkVisibility ? a.checkVisibility() : true,
          r:{x:+r.x.toFixed(0),y:+r.y.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)},
          outlineW: parseFloat(cs.outlineWidth)||0, outlineStyle: cs.outlineStyle,
          shadow: cs.boxShadow && cs.boxShadow !== 'none',
          borderW: parseFloat(cs.borderWidth)||0, borderBottom: parseFloat(cs.borderBottomWidth)||0,
          bg: cs.backgroundColor };
      })()`);
      out.sequence.push(s);
    }
    out.noIndicator = out.sequence.filter(s => s.visible && !(s.outlineW>0 || s.shadow || s.borderBottom>0 || s.borderW>0))
      .map(s => ({tag:s.tag, cls:s.cls, text:s.text}));
  } catch (e) { out.err = String(e); }
  return out;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
const results = { label: LABEL, url: URL_, mode: MODE, started: new Date().toISOString(), viewports: {} };

for (const vw of VWS) {
  const vh = vw === 390 ? 844 : vw === 1024 ? 768 : 900;
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleMsgs = [], pageErrors = [];
  page.on('console', m => consoleMsgs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', e => pageErrors.push(String(e)));
  const rec = { vw, vh };

  try {
    await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);
    try { await page.waitForFunction(() => typeof map !== 'undefined' && map && map.isStyleLoaded && map.isStyleLoaded(), { timeout: 15000 }); } catch {}
    await page.waitForTimeout(1800);

    rec.before = await probePage(page);

    // ---- real drag + real wheel in the ground below the paper panel ----
    const pr = rec.before.paperPanel && rec.before.paperPanel.rect;
    if (pr) {
      const gy = Math.min(pr.bottom + 60, vh - 20), gx = 180;
      const before = await page.evaluate(`(() => ({c:{lng:map.getCenter().lng, lat:map.getCenter().lat}, z:map.getZoom()}))()`);
      await page.mouse.move(gx, gy);
      await page.mouse.down();
      await page.mouse.move(gx - 140, gy + 30, { steps: 14 });
      await page.mouse.up();
      await page.waitForTimeout(1000);
      const afterDrag = await page.evaluate(`(() => ({c:{lng:map.getCenter().lng, lat:map.getCenter().lat}, z:map.getZoom()}))()`);
      await page.mouse.move(gx, gy);
      await page.mouse.wheel(0, -320);
      await page.waitForTimeout(1000);
      const afterWheel = await page.evaluate(`(() => ({c:{lng:map.getCenter().lng, lat:map.getCenter().lat}, z:map.getZoom()}))()`);
      const moved = Math.abs(afterDrag.c.lng-before.c.lng) > 1e-7 || Math.abs(afterDrag.c.lat-before.c.lat) > 1e-7;
      const zoomed = Math.abs(afterWheel.z-afterDrag.z) > 1e-7;
      rec.ground = { point:{x:gx,y:gy}, panelBottom:pr.bottom, belowPanel: gy>pr.bottom && gy<vh,
        before, afterDrag, afterWheel, dragMoved: moved,
        dragDeltaLng:+(afterDrag.c.lng-before.c.lng).toFixed(6), dragDeltaLat:+(afterDrag.c.lat-before.c.lat).toFixed(6),
        wheelChangedZoom: zoomed, zoomDelta:+(afterWheel.z-afterDrag.z).toFixed(4),
        verdict: (moved && zoomed) ? 'GROUND_INTERACTIVE' : 'GROUND_DEAD' };
    } else { rec.ground = { verdict:'NO_PANEL_RECT' }; }

    await page.screenshot({ path: `/tmp/msh-audit-verifier-4/shots/${LABEL}-${vw}-landing.png` });

    // ---- count honesty ----
    const indep = await page.evaluate(`(() => {
      const res = {};
      try {
        const st = map.getStyle();
        const srcIds = Object.entries(st.sources||{}).filter(([k,v])=>v && v.type==='geojson').map(([k])=>k);
        res.srcIds = srcIds;
        const feats = [];
        for (const id of srcIds) { try { feats.push(...map.querySourceFeatures(id)); } catch(e){} }
        res.sourceFeatureCount = feats.length;
        const seen = new Map();
        const container = map.getContainer().getBoundingClientRect();
        for (const f of feats) {
          const p = f.properties||{};
          const key = p.id||p.name||p.title||JSON.stringify(p);
          if (!(f.geometry && f.geometry.type==='Point')) continue;
          const scr = map.project(f.geometry.coordinates);
          const inScreen = scr.x >= 0 && scr.x <= container.width && scr.y >= 0 && scr.y <= container.height;
          const rec2 = seen.get(key) || { key, name: p.name||p.title||p.id, scr:{x:+scr.x.toFixed(1), y:+scr.y.toFixed(1)}, inScreen:false };
          if (inScreen) rec2.inScreen = true;
          seen.set(key, rec2);
        }
        const allF = Array.from(seen.values());
        res.totalPlaces = allF.length;
        res.inScreen = allF.filter(f=>f.inScreen);
        res.inScreenCount = res.inScreen.length;
        res.inScreenNames = res.inScreen.map(f=>f.name);
        const layerIds = (st.layers||[]).filter(l=>srcIds.includes(l.source)).map(l=>l.id);
        res.layerIds = layerIds;
        let rendered = [];
        if (layerIds.length) { try { rendered = map.queryRenderedFeatures(undefined,{layers:layerIds}); } catch(e){ res.qrfErr=String(e);} }
        const rseen = new Set();
        for (const f of rendered) { const p=f.properties||{}; rseen.add(p.id||p.name||p.title||JSON.stringify(p)); }
        res.renderedPlaceCount = rseen.size;
        res.renderedNames = Array.from(rseen);
      } catch(e){ res.err = String(e); }
      return res;
    })()`);
    rec.countHonesty = { stated: rec.before.statedCount, statedText: rec.before.statedText, independent: indep };

    // ---- 44px targets ----
    rec.targets = await page.evaluate(`(() => {
      const out = [];
      for (const b of all('button,[role="button"]')) {
        const t = (deepText(b)||'').toLowerCase(), a = (b.getAttribute('aria-label')||'').toLowerCase();
        const cls = String(b.className||'').toLowerCase();
        if (!/list|menu|toggle|close|dismiss|hide|grid|map|back|expand/.test(t+'|'+a+'|'+cls)) continue;
        const r = b.getBoundingClientRect();
        if (r.width===0 && r.height===0) continue;
        out.push({ cls:String(b.className||'').slice(0,140), text:deepText(b).slice(0,60), aria:b.getAttribute('aria-label'),
          w:+r.width.toFixed(1), h:+r.height.toFixed(1), rect:rect(b), visible:visible(b) });
      }
      return out;
    })()`);

    rec.disclosure = await page.evaluate(`(() => {
      const out = { details: [], buttons: [] };
      for (const d of all('details')) {
        const s = d.querySelector('summary');
        out.details.push({ open:d.open, summary:s?deepText(s).slice(0,140):null, summaryVisible:s?visible(s):false });
      }
      for (const b of all('button,[role="button"]')) {
        const t = deepText(b), a = b.getAttribute('aria-label')||'';
        if (/more|show|expand|see all|view all|reveal|all |กด/i.test(t+' '+a)) out.buttons.push({ text:t.slice(0,90), aria:a, expanded:b.getAttribute('aria-expanded'), visible:visible(b) });
      }
      return out;
    })()`);

    rec.clicksToAll = await clickThroughDisclosure(page);
    rec.after = await probePage(page);
    rec.keyboard = await keyboardProbe(page);

    // ---- reduced motion ----
    const ctx2 = await browser.newContext({ viewport:{width:vw,height:vh}, reducedMotion:'reduce' });
    const p2 = await ctx2.newPage();
    try {
      await p2.goto(URL_, { waitUntil:'domcontentloaded', timeout:45000 });
      await p2.waitForTimeout(3000);
      rec.reducedMotion = await p2.evaluate(`(() => {
        const els = Array.from(document.querySelectorAll('*')).slice(0,5000);
        let animated = 0; const durations = new Set();
        for (const e of els) {
          const cs = getComputedStyle(e);
          if (cs.animationName && cs.animationName !== 'none' && cs.animationDuration !== '0s') { animated++; durations.add(cs.animationName+'/'+cs.animationDuration); }
        }
        return { animatedElements: animated, anim: Array.from(durations).slice(0,12), mq: matchMedia('(prefers-reduced-motion: reduce)').matches };
      })()`);
    } catch(e){ rec.reducedMotion = { err:String(e) }; }
    await ctx2.close();

    // ---- 150% reader text ----
    const ctx3 = await browser.newContext({ viewport:{width:vw,height:vh} });
    const p3 = await ctx3.newPage();
    try {
      await p3.goto(URL_, { waitUntil:'domcontentloaded', timeout:45000 });
      await p3.waitForTimeout(2500);
      await p3.evaluate(`(() => { document.documentElement.style.fontSize='150%'; })`);
      await p3.waitForTimeout(1000);
      rec.readerText150 = await p3.evaluate(`(() => ({
        scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
        innerW: innerWidth, bodyScrollW: document.body.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        offenders: Array.from(document.querySelectorAll('body *')).map(e=>{const r=e.getBoundingClientRect();
          return {cls:String(e.className||'').slice(0,70), right:+r.right.toFixed(0)};})
          .filter(o=>o.right > innerWidth+1).slice(0,12) }))()`);
      await p3.screenshot({ path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-${vw}-text150.png` });
    } catch(e){ rec.readerText150 = { err:String(e) }; }
    await ctx3.close();

    rec.maplibreWarnings = consoleMsgs.filter(m=>/maplibre|webgl|gl_|warning|error/i.test(m.text)).map(m=>m.text).slice(0,30);
    rec.consoleErrors = consoleMsgs.filter(m=>m.type==='error').map(m=>m.text).slice(0,20);
    rec.pageErrors = pageErrors.slice(0,20);
    await ctx.close();
  } catch (e) {
    rec.fatal = String(e && e.stack ? e.stack : e);
  }

  results.viewports[vw] = rec;
  fs.writeFileSync(path.join(OUTDIR, `${LABEL}-${vw}.json`), JSON.stringify({label:LABEL,url:URL_,mode:MODE,vw,vh,rec},null,2));
  console.log('WROTE', `${LABEL}-${vw}.json`);
}

// ---- error surface (club catalogue fetch forced to fail) ----
if (MODE === 'club' || arg('errorTest','0')==='1') {
  const vw = 1024, vh = 768;
  const ctx = await browser.newContext({ viewport:{width:vw,height:vh} });
  const page = await ctx.newPage();
  await page.route('**/places-cannabis.json', r => r.abort());
  const errRec = { vw, vh };
  try {
    await page.goto(URL_, { waitUntil:'domcontentloaded', timeout:45000 });
    await page.waitForTimeout(4500);
    errRec.state = await page.evaluate(`(() => {
      const t = document.body.innerText||'';
      const un = (t.match(/Directory unavailable/gi)||[]).length;
      const retry = Array.from(document.querySelectorAll('button')).filter(b=>/retry/i.test(b.innerText||b.getAttribute('aria-label')||'')).length;
      return { directoryUnavailable: un, retryButtons: retry, bodySample: t.slice(0,1400) };
    })()`);
    await page.screenshot({ path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-${vw}-error.png` });
  } catch(e){ errRec.err = String(e); }
  results.errorSurface = errRec;
  await ctx.close();
}

await browser.close();
results.finished = new Date().toISOString();
fs.writeFileSync(path.join(OUTDIR, `${LABEL}-summary.json`), JSON.stringify(results,null,2));
console.log('WROTE', path.join(OUTDIR, `${LABEL}-summary.json`));
