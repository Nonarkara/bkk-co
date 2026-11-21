#!/usr/bin/env node
// MSH audit #4 — independent measurement instrument (v2).
// Auditor: Verifier. Independent of the builder; reads only.
// Measures: map share (painted + usable), panel slab, ground interactivity,
// count honesty (two independent readings), 44px targets, error surface,
// disclosure cost, and the preserved findings.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS = ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader'];

function arg(n, d) { const i = process.argv.indexOf('--'+n); if (i===-1) return d; const v=process.argv[i+1]; return v===undefined||v.startsWith('--') ? true : v; }
const URL_ = arg('url','https://co.nonarkara.org');
const MODE = arg('mode','plub');
const OUTDIR = arg('out','/tmp/msh-audit-verifier-4/out');
const LABEL = arg('label', MODE+'-'+arg('vw','1024'));
const VWS = String(arg('vw','390,1024,1440')).split(',').map(v=>parseInt(v,10)).filter(v=>v>0);
const SKIP = String(arg('skip','none')).split(',');
fs.mkdirSync(OUTDIR,{recursive:true});
fs.mkdirSync('/tmp/msh-audit-verifier-4/shots',{recursive:true});
fs.mkdirSync('/tmp/msh-audit-verifier-4/data',{recursive:true});

// ================= in-page measurement core =================
const CORE = `
function V(el){ if(!el) return false; try { return el.checkVisibility(); } catch(e){ return false; } }
function R(el){ if(!el) return null; const r=el.getBoundingClientRect();
  return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
          top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),left:+r.left.toFixed(1),right:+r.right.toFixed(1)}; }
function T(el){ return (el.innerText||el.textContent||'').trim(); }
function AL(sel){ return Array.from(document.querySelectorAll(sel)); }
function bgAlpha(cs){ const m=cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/); if(!m) return 0;
  const p=m[1].split(','); return p[3]!==undefined ? parseFloat(p[3]) : 1; }
function paintsOpaque(el){ const cs=getComputedStyle(el);
  if (cs.visibility==='hidden'||cs.display==='none') return false;
  if (parseFloat(cs.opacity)===0) return false;
  if (bgAlpha(cs)>0.5) return true;
  if (cs.backgroundImage && cs.backgroundImage!=='none') return true;
  return false; }
function blocksPointer(el){ const cs=getComputedStyle(el); return cs.pointerEvents!=='none'; }

// cover rectangles over the map canvas
function covers(){
  const cvs = map.getCanvas(); const cb = cvs.getBoundingClientRect();
  const out = [];
  for (const el of AL('body *')) {
    if (el === cvs) continue;
    if (el.contains && el.contains(cvs)) continue;   // ancestors paint behind, not over
    const r = el.getBoundingClientRect();
    if (r.width<2||r.height<2) continue;
    if (r.right<cb.left||r.left>cb.right||r.bottom<cb.top||r.top>cb.bottom) continue;
    const cs=getComputedStyle(el);
    if (cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) continue;
    const opaque = paintsOpaque(el);
    const blocks = blocksPointer(el);
    if (!opaque && !blocks) continue;
    out.push({ tag:el.tagName, cls:String(el.className||'').slice(0,70), id:el.id||null,
      insideMap: !!el.closest('#map'), rect:{x:+r.x.toFixed(0),y:+r.y.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)},
      opaque, blocks, bg:cs.backgroundColor, pe:cs.pointerEvents, z:cs.zIndex });
  }
  return {canvas:{x:+cb.x.toFixed(1),y:+cb.y.toFixed(1),w:+cb.width.toFixed(1),h:+cb.height.toFixed(1)}, list:out};
}

// grid-sample the canvas: how much of the first screen is map (painted / usable)
function sampleCanvas(){
  const cv = covers();
  const cb = cv.canvas;
  const step = 6;
  let painted=0, usable=0, total=0;
  const blockedBy=[];
  for (let y=0; y<innerHeight; y+=step) {
    for (let x=0; x<innerWidth; x+=step) {
      const onCanvas = x>=cb.x && x<=cb.x+cb.w && y>=cb.y && y<=cb.y+cb.h;
      if (!onCanvas) continue;
      total++;
      let opaqueCover=false, blockCover=false, who=null;
      for (const c of cv.list) {
        const r=c.rect;
        if (x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) {
          if (c.opaque) { opaqueCover=true; if(!who) who=c; }
          if (c.blocks) { blockCover=true; if(!who) who=c; }
        }
      }
      if (!opaqueCover) painted++;
      if (!opaqueCover && !blockCover) usable++;
      else if (who && blockedBy.length<12) blockedBy.push({cls:who.cls,id:who.id,insideMap:who.insideMap,rect:who.rect,opaque:who.opaque,blocks:who.blocks,bg:who.bg});
    }
  }
  const vp = innerWidth*innerHeight;
  return { canvas: cb, samples: total, step,
    mapSharePainted: +(100*(painted*step*step)/vp).toFixed(2),
    mapShareUsable:  +(100*(usable*step*step)/vp).toFixed(2),
    paintedPx: +(painted*step*step).toFixed(0), usablePx: +(usable*step*step).toFixed(0),
    covers: cv.list, blockedSamples: blockedBy };
}

// independent visibility of a place, decided by PAINT, not by pointer
function independentVisible(px, py, canvas, cvs){
  if (px<canvas.x||py<canvas.y||px>canvas.x+canvas.w||py>canvas.y+canvas.h) return {vis:false, why:'offscreen'};
  const stack = document.elementsFromPoint(px,py);
  for (const el of stack) {
    // the place's own marker proves it is painted
    if (el.closest && el.closest('.maplibregl-marker')) return {vis:true, why:'marker'};
    if (el === cvs) return {vis:true, why:'canvas'};
    const cs = getComputedStyle(el);
    // anything opaque on top HIDES the place (paper panel, Key legend, map control)
    if (paintsOpaque(el)) return {vis:false, why:'covered-by:'+String(el.className||el.tagName).slice(0,44)};
    // an opaque ANCESTOR of a transparent hit-box also hides the map (rail rows
    // inside the white paper panel are transparent, the panel under them is not)
    for (let a=el.parentElement; a && a!==document.body && a!==document.documentElement; a=a.parentElement) {
      if (a === map.getContainer() || a.contains(map.getCanvas())) break;
      if (paintsOpaque(a)) return {vis:false, why:'under-opaque:'+String(a.className||a.tagName).slice(0,44)};
    }
    // a transparent overlay that takes pointer events still lets the map paint through
    if (blocksPointer(el)) return {vis:true, why:'transparent-overlay:'+String(el.className||el.tagName).slice(0,44)};
  }
  return {vis:false, why:'no-canvas-in-stack'};
}
`;

async function probe(page) {
  return await page.evaluate(`(() => {
    ${CORE}
    const out = { url: location.href, title: document.title };
    out.viewport = {w:innerWidth,h:innerHeight};
    out.hasMap = (typeof map!=='undefined' && !!map);
    const cvs = map.getCanvas(); const cb = cvs.getBoundingClientRect();
    out.canvas = {x:+cb.x.toFixed(1),y:+cb.y.toFixed(1),w:+cb.width.toFixed(1),h:+cb.height.toFixed(1),cw:cvs.clientWidth,ch:cvs.clientHeight};
    out.share = sampleCanvas();

    // ---- paper panel + slab ----
    const lw = document.getElementById('list-wrap');
    out.listWrap = lw ? {rect:R(lw), bg:getComputedStyle(lw).backgroundColor, pe:getComputedStyle(lw).pointerEvents, overflowY:getComputedStyle(lw).overflowY,
      scrollH: lw.scrollHeight, clientH: lw.clientHeight} : null;
    const list = document.getElementById('list');
    out.listChildren = list ? Array.from(list.children).map(li=>{const r=li.getBoundingClientRect();
      return {cls:String(li.className||'').slice(0,60), tag:li.tagName, top:+r.top.toFixed(0), bottom:+r.bottom.toFixed(0), h:+r.height.toFixed(0),
        text:T(li).slice(0,60), visible:V(li)};}) : [];
    const lastContent = list && list.lastElementChild ? list.lastElementChild : null;
    out.slab = (lw && lastContent) ? +(lw.getBoundingClientRect().bottom - lastContent.getBoundingClientRect().bottom).toFixed(1) : null;
    const placeRows = AL('.list-place').filter(V);
    const lastPlace = placeRows.length ? placeRows[placeRows.length-1] : null;
    out.lastPlaceRect = lastPlace ? R(lastPlace) : null;
    // third audit's "flat slab": the empty column between the last row and the bottom of the first screen
    out.flatSlab = lastPlace ? +(innerHeight - lastPlace.getBoundingClientRect().bottom).toFixed(1) : null;
    out.lastPlaceBottom = lastPlace ? +lastPlace.getBoundingClientRect().bottom.toFixed(1) : null;
    out.lastContentCls = lastContent ? String(lastContent.className||'') : null;
    out.rows = document.querySelectorAll('.list-place').length;

    // ---- stated count ----
    const cnt = document.getElementById('count');
    out.statedText = cnt ? T(cnt) : null;
    out.statedCount = cnt ? (()=>{const m=T(cnt).match(/(\\d+)/); return m?parseInt(m[1],10):null;})() : null;

    // ---- camera centre ----
    const cc = map.project(map.getCenter());
    out.camera = { centre:{lng:+map.getCenter().lng.toFixed(6), lat:+map.getCenter().lat.toFixed(6)}, zoom:+map.getZoom().toFixed(3),
      centreScreen:{x:+(cb.x+cc.x).toFixed(0), y:+(cb.y+cc.y).toFixed(0)}, padding: map.getPadding ? map.getPadding() : null };

    // ---- count honesty: two independent readings ----
    try {
      const a = map.unproject([0,0]); const b2 = map.unproject([cvs.clientWidth, cvs.clientHeight]);
      const minLng=Math.min(a.lng,b2.lng), maxLng=Math.max(a.lng,b2.lng);
      const minLat=Math.min(a.lat,b2.lat), maxLat=Math.max(a.lat,b2.lat);
      const inCanvas = p => p.x>=minLng && p.x<=maxLng && p.y>=minLat && p.y<=maxLat;
      const cands = (typeof lastList!=='undefined' && lastList) ? lastList.filter(inCanvas) : [];
      out.candidates = cands.length;
      const appSet = [], mineSet = [];
      const mismatches = [];
      for (const p of cands) {
        const pt = map.project([p.x,p.y]);
        const px = cb.x+pt.x, py = cb.y+pt.y;
        const mine = independentVisible(px,py,cb,cvs);
        let appV=false, appWhy='';
        try { appV = (typeof visibleOnMap!=='undefined') ? !!visibleOnMap(p) : false; appWhy='app'; } catch(e){ appWhy='err:'+e; }
        if (appV) appSet.push(p);
        if (mine.vis) mineSet.push(p);
        if (appV!==mine.vis) mismatches.push({ name:p.name||p.nm||p.title||p.label||p.id, id:p.id, kind:p.k,
          x:+px.toFixed(0), y:+py.toFixed(0), app:appV, mine:mine.vis, why:mine.why });
      }
      out.count = { appCount: appSet.length, myCount: mineSet.length, stated: out.statedCount,
        appFnAvailable: (typeof visibleOnMap!=='undefined'),
        candidateSample: cands.slice(0,2).map(p=>({keys:Object.keys(p), name:p.name||p.nm||p.title, id:p.id, x:p.x, y:p.y})),
        mismatches: mismatches.slice(0,40), mismatchTotal: mismatches.length,
        appNames: appSet.slice(0,60).map(p=>p.name||p.title||p.id),
        myNames: mineSet.slice(0,60).map(p=>p.name||p.title||p.id) };
    } catch(e) { out.countErr = String(e); }

    // ---- buttons (44px targets, retry, disclosure) ----
    out.buttons = AL('button,[role="button"]').filter(V).map(b=>{const r=b.getBoundingClientRect();
      return { cls:String(b.className||'').slice(0,110), id:b.id||null, text:T(b).slice(0,80), aria:b.getAttribute('aria-label'),
        expanded:b.getAttribute('aria-expanded'), w:+r.width.toFixed(1), h:+r.height.toFixed(1), rect:R(b) };});

    // ---- reveal / disclosure ----
    out.reveal = AL('[data-list-more], .list-reveal button, .list-more').map(b=>({ cls:String(b.className||'').slice(0,80),
      text:T(b).slice(0,80), aria:b.getAttribute('aria-label'), state:b.getAttribute('data-list-more-state'), visible:V(b) }));

    // ---- map key legend ----
    out.keyLegends = AL('.atlas-key, .map-key, [data-atlas-key], .atlas-dock').map(e=>{const r=e.getBoundingClientRect();
      return { cls:String(e.className||'').slice(0,80), rect:{x:+r.x.toFixed(0),y:+r.y.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)},
        insideMap: !!e.closest('#map'), bg:getComputedStyle(e).backgroundColor, visible:V(e), text:T(e).slice(0,60) };});

    // ---- ground probe points below the panel ----
    out.ground = [];
    if (lw) {
      const pb = lw.getBoundingClientRect().bottom;
      for (const dy of [8,40,80,140]) {
        const x=180, y=pb+dy;
        if (y<0||y>innerHeight) { out.ground.push({x,y,offscreen:true}); continue; }
        const stack = document.elementsFromPoint(x,y).slice(0,3).map(e=>e.tagName+'.'+String(e.className||'').slice(0,45));
        out.ground.push({x,y,stack, canvasHit: (x>=cb.x&&x<=cb.x+cb.w&&y>=cb.y&&y<=cb.y+cb.h)});
      }
    }
    return out;
  })()`);
}

async function groundTest(page, panelBottom, vh) {
  const gy = Math.min(panelBottom + 60, vh - 20), gx = 180;
  const before = await page.evaluate(`(() => ({c:{lng:map.getCenter().lng,lat:map.getCenter().lat},z:map.getZoom()}))()`);
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.move(gx - 150, gy + 40, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(1100);
  const afterDrag = await page.evaluate(`(() => ({c:{lng:map.getCenter().lng,lat:map.getCenter().lat},z:map.getZoom()}))()`);
  await page.mouse.move(gx, gy);
  await page.mouse.wheel(0, -320);
  await page.waitForTimeout(1100);
  const afterWheel = await page.evaluate(`(() => ({c:{lng:map.getCenter().lng,lat:map.getCenter().lat},z:map.getZoom()}))()`);
  const moved = Math.abs(afterDrag.c.lng-before.c.lng)>1e-7 || Math.abs(afterDrag.c.lat-before.c.lat)>1e-7;
  const zoomed = Math.abs(afterWheel.z-afterDrag.z)>1e-7;
  return { point:{x:gx,y:gy}, before, afterDrag, afterWheel,
    dragMoved:moved, dragDeltaLng:+(afterDrag.c.lng-before.c.lng).toFixed(6), dragDeltaLat:+(afterDrag.c.lat-before.c.lat).toFixed(6),
    wheelChangedZoom:zoomed, zoomDelta:+(afterWheel.z-afterDrag.z).toFixed(4),
    verdict:(moved&&zoomed)?'GROUND_INTERACTIVE':'GROUND_DEAD' };
}

async function disclosureTest(page) {
  const out = { clicks:0, labels:[], rowsBefore:0, rowsAfter:null, scrollH:null, clientH:null, label:null };
  out.rowsBefore = await page.evaluate(`document.querySelectorAll('.list-place').length`);
  out.rowsPre = await page.evaluate(`({scrollH: document.getElementById('list').scrollHeight, clientH: document.getElementById('list').clientHeight})`);
  out.countBefore = await page.evaluate(`(document.getElementById('count')||{}).textContent||null`);
  out.panelBefore = await page.evaluate(`(()=>{const e=document.getElementById('list-wrap'); const r=e.getBoundingClientRect();
    return {h:+r.height.toFixed(0), bottom:+r.bottom.toFixed(0)};})()`);
  const b = await page.evaluate(`(() => {
    const btn = document.querySelector('[data-list-more="all"][data-list-more-state="all"]') ||
               Array.from(document.querySelectorAll('[data-list-more]')).find(x=>x.getAttribute('data-list-more-state')==='all');
    if (!btn) return null;
    return { text:(btn.innerText||'').trim(), aria:btn.getAttribute('aria-label'), visible: btn.checkVisibility() };
  })()`);
  if (b) {
    out.labels.push(b.text); out.label = b.text;
    await page.evaluate(`(() => { const btn = document.querySelector('[data-list-more="all"][data-list-more-state="all"]') ||
      Array.from(document.querySelectorAll('[data-list-more]')).find(x=>x.getAttribute('data-list-more-state')==='all');
      if (btn) btn.click(); })()`);
    out.clicks = 1;
    await page.waitForTimeout(1400);
    const st = await page.evaluate(`(()=>{ const l=document.getElementById('list');
      return {rows: document.querySelectorAll('.list-place').length, scrollH:l.scrollHeight, clientH:l.clientHeight,
        count:(document.getElementById('count')||{}).textContent||null,
        panel:(()=>{const e=document.getElementById('list-wrap'); const r=e.getBoundingClientRect(); return {h:+r.height.toFixed(0), bottom:+r.bottom.toFixed(0)};})()}; })()`);
    out.rowsAfter = st.rows; out.scrollH = st.scrollH; out.clientH = st.clientH;
    out.countAfter = st.count; out.panelAfter = st.panel;
  }
  out.scrollH = out.scrollH ?? out.rowsPre.scrollH; out.clientH = out.clientH ?? out.rowsPre.clientH;
  return out;
}

async function keyboardProbe(page) {
  const out = { sequence:[], noIndicator:[], escapeClose:null };
  try {
    await page.evaluate(`(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); })`);
    for (let i=0;i<50;i++) {
      await page.keyboard.press('Tab');
      const s = await page.evaluate(`(() => {
        const a=document.activeElement; if(!a||a===document.body) return {none:true};
        const r=a.getBoundingClientRect(); const cs=getComputedStyle(a);
        return { tag:a.tagName, cls:String(a.className||'').slice(0,90), id:a.id||null,
          text:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,50),
          visible: a.checkVisibility ? a.checkVisibility() : true,
          w:+r.width.toFixed(0), h:+r.height.toFixed(0),
          outlineW: parseFloat(cs.outlineWidth)||0, outlineStyle:cs.outlineStyle, outlineColor:cs.outlineColor,
          shadow: cs.boxShadow && cs.boxShadow!=='none', borderW: parseFloat(cs.borderWidth)||0,
          borderBottom: parseFloat(cs.borderBottomWidth)||0, bg:cs.backgroundColor };
      })()`);
      out.sequence.push(s);
    }
    out.noIndicator = out.sequence.filter(s=>s.visible && !(s.outlineW>0||s.shadow||s.borderW>0))
      .map(s=>({tag:s.tag,cls:s.cls,id:s.id,text:s.text}));
    // escape closes the drawer?
    out.escapeClose = await page.evaluate(`(() => {
      const lw=document.getElementById('list-wrap'); const t=document.getElementById('list-toggle');
      return { listOpenBefore: lw ? lw.classList.contains('open') : null, togglePressed: t? t.getAttribute('aria-pressed'):null };
    })()`);
  } catch(e){ out.err=String(e); }
  return out;
}

// ================= runner =================
const browser = await chromium.launch({ executablePath:CHROME, headless:true, args:ARGS });
const results = { label:LABEL, url:URL_, mode:MODE, started:new Date().toISOString(), viewports:{} };

for (const vw of VWS) {
  const vh = vw===390 ? 844 : vw===1024 ? 768 : 900;
  const ctx = await browser.newContext({ viewport:{width:vw,height:vh}, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const consoleMsgs=[], pageErrors=[];
  page.on('console',m=>consoleMsgs.push({type:m.type(),text:m.text()}));
  page.on('pageerror',e=>pageErrors.push(String(e)));
  const rec = { vw, vh };

  try {
    // cross-mode flash watch
    await page.addInitScript(`window.__flash=[]; (function(){ let n=0; const iv=setInterval(()=>{ try{
      const t=document.body?(document.body.innerText||'').slice(0,600):''; window.__flash.push(t); }catch(e){} if(++n>40) clearInterval(iv); },25); })();`);
    await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(1200);
    try { await page.waitForFunction(`typeof map!=='undefined' && map && map.isStyleLoaded && map.isStyleLoaded()`, {timeout:15000}); } catch {}
    await page.waitForTimeout(2000);

    rec.before = await probe(page);
    rec.flash = await page.evaluate(`(() => {
      const s = window.__flash||[]; const other = ${JSON.stringify(MODE==='club'?'café|Café|coffee|Co-working|Library':'Dispensar|cannabis|Cannabis|THC')};
      const re = new RegExp(other,'i');
      let hits = 0, firstHit = null;
      s.forEach((t,i)=>{ if (re.test(t)) { hits++; if(firstHit===null) firstHit=i; } });
      return { samples:s.length, otherModeHits:hits, firstHitIndex:firstHit, firstTexts:s.slice(0,4) };
    })()`);

    // ground interactivity
    const pb = rec.before.listWrap ? rec.before.listWrap.rect.bottom : null;
    if (pb) { rec.ground = await groundTest(page, pb, vh); }
    else rec.ground = { verdict:'NO_PANEL' };

    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-${vw}-landing.png`});

    // disclosure
    rec.disclosure = await disclosureTest(page);
    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-${vw}-disclosed.png`});
    rec.afterDisclosure = await probe(page);

    // 44px targets (phone drawer)
    rec.targets = await page.evaluate(`(() => {
      const out=[];
      for (const sel of ['#list-toggle','.list-close','.close','.sheet .close']) {
        const el=document.querySelector(sel); if(!el) { out.push({sel, missing:true}); continue; }
        const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
        out.push({ sel, w:+r.width.toFixed(1), h:+r.height.toFixed(1), visible: el.checkVisibility?el.checkVisibility():false,
          display:cs.display, rect:{x:+r.x.toFixed(0),y:+r.y.toFixed(0)}, aria:el.getAttribute('aria-label') });
      }
      const small = Array.from(document.querySelectorAll('button,[role="button"]')).filter(b=>{
        const r=b.getBoundingClientRect(); if(r.width===0||r.height===0) return false;
        return (r.width<44||r.height<44) && b.checkVisibility();
      }).map(b=>{const r=b.getBoundingClientRect();
        return { cls:String(b.className||'').slice(0,80), id:b.id||null, text:(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,40),
          w:+r.width.toFixed(1), h:+r.height.toFixed(1) };});
      return { measured: out, undersized: small };
    })()`);

    rec.keyboard = await keyboardProbe(page);
    rec.maplibre = { warnings: consoleMsgs.filter(m=>/maplibre|webgl|gl_|warn/i.test(m.text)).map(m=>m.text).slice(0,20),
      errors: consoleMsgs.filter(m=>m.type==='error').map(m=>m.text).slice(0,20), pageErrors: pageErrors.slice(0,10) };
    await ctx.close();
  } catch(e){ rec.fatal = String(e && e.stack ? e.stack : e); await ctx.close().catch(()=>{}); }

  results.viewports[vw] = rec;
  fs.writeFileSync(path.join(OUTDIR,`${LABEL}-${vw}.json`), JSON.stringify({label:LABEL,url:URL_,mode:MODE,vw,vh,rec},null,2));
  console.log('WROTE',`${LABEL}-${vw}.json`);
}

// ---- reduced motion ----
if (!SKIP.includes('rm')) {
  const ctx = await browser.newContext({viewport:{width:1024,height:768}, reducedMotion:'reduce'});
  const page = await ctx.newPage();
  try {
    await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(3500);
    results.reducedMotion = await page.evaluate(`(() => {
      const els=Array.from(document.querySelectorAll('*')).slice(0,6000); const anims=[];
      for (const e of els){ const cs=getComputedStyle(e);
        if (cs.animationName && cs.animationName!=='none' && cs.animationDuration!=='0s') anims.push(cs.animationName+'/'+cs.animationDuration);
        if (cs.transitionDuration && cs.transitionDuration!=='0s' && cs.transitionDuration!=='0.001s' && parseFloat(cs.transitionDuration)>0) anims.push('transition/'+cs.transitionDuration); }
      return { mq: matchMedia('(prefers-reduced-motion: reduce)').matches, anims: Array.from(new Set(anims)).slice(0,15), count: anims.length };
    })()`);
  } catch(e){ results.reducedMotion={err:String(e)}; }
  await ctx.close();
}

// ---- 150% reader text ----
if (!SKIP.includes('text150')) {
  const rows=[];
  for (const vw of [390,1024,1440]) {
    const vh = vw===390?844:vw===1024?768:900;
    const ctx = await browser.newContext({viewport:{width:vw,height:vh}});
    const page = await ctx.newPage();
    try {
      await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(2500);
      await page.evaluate(`(() => { document.documentElement.style.fontSize='150%'; })`);
      await page.waitForTimeout(1200);
      const r = await page.evaluate(`(() => {
        ${CORE}
        const sh = sampleCanvas();
        return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, innerW: innerWidth,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          mapSharePainted: sh.mapSharePainted, mapShareUsable: sh.mapShareUsable,
          offenders: Array.from(document.querySelectorAll('body *')).map(e=>{const r=e.getBoundingClientRect();
            return { cls:String(e.className||'').slice(0,60), right:+r.right.toFixed(0), w:+r.width.toFixed(0) };})
            .filter(o=>o.right > innerWidth+1 && o.w>0).slice(0,15) };
      })()`);
      rows.push({vw, ...r});
      await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-${vw}-text150.png`});
    } catch(e){ rows.push({vw, err:String(e)}); }
    await ctx.close();
  }
  results.readerText150 = rows;
}

// ---- error surface (club) ----
if (MODE==='club' || arg('errorTest','0')==='1') {
  const ctx = await browser.newContext({viewport:{width:1024,height:768}});
  const page = await ctx.newPage();
  await page.route('**/places-cannabis.json', r=>r.abort());
  const er = {};
  try {
    await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(5000);
    er.state = await page.evaluate(`(() => {
      const t=document.body.innerText||'';
      const un=(t.match(/Directory unavailable/gi)||[]).length;
      const retry=Array.from(document.querySelectorAll('button')).filter(b=>/retry/i.test(b.innerText||b.getAttribute('aria-label')||''))
        .map(b=>({cls:String(b.className||'').slice(0,60), text:(b.innerText||'').trim(), visible:b.checkVisibility?b.checkVisibility():false,
          rect:(()=>{const r=b.getBoundingClientRect();return {x:+r.x.toFixed(0),y:+r.y.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)};})()}));
      const box=document.getElementById('club-hotspots');
      return { directoryUnavailable: un, retryButtons: retry, count:document.getElementById('count')?document.getElementById('count').textContent.trim():null,
        clubHotspotsHidden: box?box.hidden:null, clubHotspotsText: box?box.innerText.trim().slice(0,200):null,
        bodySample: t.slice(0,900) };
    })()`);
    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-error.png`});
  } catch(e){ er.err=String(e); }
  results.errorSurface = er;
  await ctx.close();
}

// ---- loading + empty states ----
if (!SKIP.includes('states')) {
  // loading: delay the catalogue
  const ctx = await browser.newContext({viewport:{width:1024,height:768}});
  const page = await ctx.newPage();
  await page.route('**/places-cannabis.json', async r => { await new Promise(res=>setTimeout(res,9000)); r.abort(); });
  const ld = {};
  try {
    await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(2500);
    ld.loading = await page.evaluate(`(() => {
      const t=document.body.innerText||'';
      const box=document.getElementById('club-hotspots');
      return { hasLoadingWord: /Loading/i.test(t), loadingPhrases: (t.match(/Loading[^\\n]{0,60}/g)||[]).slice(0,4),
        count: document.getElementById('count')?document.getElementById('count').textContent.trim():null,
        clubBoxText: box?box.innerText.trim().slice(0,160):null, clubBoxHidden: box?box.hidden:null };
    })()`);
    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-loading.png`});
  } catch(e){ ld.err=String(e); }
  results.loadingState = ld;
  await ctx.close();

  // empty: genuinely nothing in view
  const ctx2 = await browser.newContext({viewport:{width:1024,height:768}});
  const page2 = await ctx2.newPage();
  const em = {};
  try {
    await page2.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page2.waitForTimeout(3000);
    await page2.evaluate(`(() => { if (typeof map!=='undefined') map.jumpTo({center:[105.5,8.0], zoom:9}); })`);
    await page2.waitForTimeout(1500);
    em.empty = await page2.evaluate(`(() => {
      const list=document.getElementById('list');
      return { count: document.getElementById('count')?document.getElementById('count').textContent.trim():null,
        listText: list?list.innerText.trim().slice(0,200):null,
        rows: document.querySelectorAll('.list-place').length };
    })()`);
    await page2.screenshot({path:`/tmp/msh-audit-verifier-4/shots/${LABEL}-empty.png`});
  } catch(e){ em.err=String(e); }
  results.emptyState = em;
  await ctx2.close();
}

await browser.close();
results.finished = new Date().toISOString();
fs.writeFileSync(path.join(OUTDIR,`${LABEL}-summary.json`), JSON.stringify(results,null,2));
console.log('WROTE', path.join(OUTDIR,`${LABEL}-summary.json`));
