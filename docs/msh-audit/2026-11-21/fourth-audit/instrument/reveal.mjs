#!/usr/bin/env node
// Isolate the cost of the ONE disclosure click: no drag, no zoom before it.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader'];
const OUT='/tmp/msh-audit-verifier-4/out';
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n); return i===-1?d:process.argv[i+1];};
const URL_=arg('url','https://co.nonarkara.org'), MODE=arg('mode','plub');
const browser=await chromium.launch({executablePath:CHROME,headless:true,args:ARGS});
const CORE=`
function V(el){ if(!el) return false; try { return el.checkVisibility(); } catch(e){ return false; } }
function R(el){ if(!el) return null; const r=el.getBoundingClientRect();
  return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
          top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),left:+r.left.toFixed(1),right:+r.right.toFixed(1)}; }
function AL(sel){ return Array.from(document.querySelectorAll(sel)); }
function bgAlpha(cs){ const m=cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/); if(!m) return 0; const p=m[1].split(','); return p[3]!==undefined?parseFloat(p[3]):1; }
function paintsOpaque(el){ const cs=getComputedStyle(el);
  if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) return false;
  if(bgAlpha(cs)>0.5) return true;
  if(cs.backgroundImage&&cs.backgroundImage!=='none') return true; return false; }
function blocksPointer(el){ return getComputedStyle(el).pointerEvents!=='none'; }
function covers(){ const cvs=map.getCanvas(); const cb=cvs.getBoundingClientRect(); const list=[];
  for(const el of AL('body *')){ if(el===cvs) continue; if(el.contains&&el.contains(cvs)) continue;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) continue;
    if(r.right<cb.left||r.left>cb.right||r.bottom<cb.top||r.top>cb.bottom) continue;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) continue;
    const opaque=paintsOpaque(el), blocks=blocksPointer(el); if(!opaque&&!blocks) continue;
    list.push({cls:String(el.className||'').slice(0,60), rect:{x:+r.x.toFixed(0),y:+r.y.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)}, opaque, blocks}); }
  return {canvas:{x:+cb.x.toFixed(1),y:+cb.y.toFixed(1),w:+cb.width.toFixed(1),h:+cb.height.toFixed(1)}, list}; }
function sampleCanvas(){ const cv=covers(); const cb=cv.canvas; const step=6; let painted=0,usable=0,total=0;
  for(let y=0;y<innerHeight;y+=step) for(let x=0;x<innerWidth;x+=step){
    const onCanvas=x>=cb.x&&x<=cb.x+cb.w&&y>=cb.y&&y<=cb.y+cb.h; if(!onCanvas) continue; total++;
    let op=false,bl=false; for(const c of cv.list){const r=c.rect;
      if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){ if(c.opaque)op=true; if(c.blocks)bl=true; }}
    if(!op)painted++; if(!op&&!bl)usable++; }
  const vp=innerWidth*innerHeight;
  return {painted:+(100*(painted*step*step)/vp).toFixed(2), usable:+(100*(usable*step*step)/vp).toFixed(2)}; }
`;
const snap=(pg)=>pg.evaluate(`(()=>{ ${CORE}
  const lw=document.getElementById('list-wrap'); const list=document.getElementById('list');
  const btn=document.querySelector('[data-list-more="all"][data-list-more-state="all"]')||Array.from(document.querySelectorAll('[data-list-more]')).find(x=>x.getAttribute('data-list-more-state')==='all');
  const sh=sampleCanvas();
  return { count:(document.getElementById('count')||{}).textContent,
    rows:document.querySelectorAll('.list-place').length,
    label: btn?btn.innerText.trim():null, aria:btn?btn.getAttribute('aria-label'):null,
    panel:R(lw), listScrollH:list?list.scrollHeight:null, listClientH:list?list.clientHeight:null,
    share:sh, zoom:+map.getZoom().toFixed(3),
    lastPlaceBottom:(()=>{const r=AL('.list-place').filter(V); if(!r.length) return null;
      const b=r[r.length-1].getBoundingClientRect(); return +b.bottom.toFixed(0);})() };
})()`);

const out={mode:MODE,url:URL_,viewports:{}};
for (const vw of [1024,1440]) {
  const vh = vw===1024?768:900;
  const ctx=await browser.newContext({viewport:{width:vw,height:vh}});
  const page=await ctx.newPage();
  const rec={vw,vh};
  await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(4000);
  rec.before=await snap(page);
  await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/REVEAL-${MODE}-${vw}-before.png`});
  await page.evaluate(`(()=>{ const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]')||
    Array.from(document.querySelectorAll('[data-list-more]')).find(x=>x.getAttribute('data-list-more-state')==='all'); if(b) b.click(); })()`);
  await page.waitForTimeout(1800);
  rec.after=await snap(page);
  await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/REVEAL-${MODE}-${vw}-after.png`});
  out.viewports[vw]=rec;
  await ctx.close();
}
fs.writeFileSync(`${OUT}/REVEAL-${MODE}.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,1));
await browser.close();
