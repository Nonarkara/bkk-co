import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader']});
const page = await (await browser.newContext({viewport:{width:1024,height:768}})).newPage();
await page.goto('http://127.0.0.1:8802/index.html', {waitUntil:'domcontentloaded'});
await page.waitForTimeout(4000);
const r = await page.evaluate(`(() => {
  const out = {};
  const m = document.getElementById('map');
  out.mapChildren = Array.from(m.children).map(e=>{const b=e.getBoundingClientRect(); return {tag:e.tagName, cls:String(e.className).slice(0,80), id:e.id,
    rect:{x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0)},
    bg:getComputedStyle(e).backgroundColor, pos:getComputedStyle(e).position, z:getComputedStyle(e).zIndex, pe:getComputedStyle(e).pointerEvents};});
  const lw = document.getElementById('list-wrap');
  out.listWrap = {rect:(()=>{const b=lw.getBoundingClientRect();return {x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0),bottom:+b.bottom.toFixed(0)};})(),
    bg:getComputedStyle(lw).backgroundColor, pe:getComputedStyle(lw).pointerEvents, overflow:getComputedStyle(lw).overflowY};
  const rows = Array.from(document.querySelectorAll('.list-place'));
  out.rows = rows.length;
  if (rows.length) { const last = rows[rows.length-1].getBoundingClientRect();
    out.lastRow = {bottom:+last.bottom.toFixed(0), top:+last.top.toFixed(0)}; out.slab = +(lw.getBoundingClientRect().bottom - last.bottom).toFixed(1); }
  out.count = document.getElementById('count') ? document.getElementById('count').textContent.trim() : null;
  out.listScrollH = document.getElementById('list').scrollHeight;
  out.listClientH = document.getElementById('list').clientHeight;
  out.canvas = (()=>{const c=map.getCanvas();const b=c.getBoundingClientRect();return {x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0),cw:c.clientWidth,ch:c.clientHeight};})();
  // key legend
  const key = document.querySelector('.atlas-key, [data-atlas-key], .atlas-dock');
  if (key) { const b=key.getBoundingClientRect(); const kd=key.closest('#map');
    out.key = {cls:String(key.className).slice(0,80), rect:{x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0)},
      insideMap: !!kd, bg:getComputedStyle(key).backgroundColor, pe:getComputedStyle(key).pointerEvents}; }
  // elements over canvas that are opaque
  out.overlaps = Array.from(document.querySelectorAll('body *')).filter(e=>{
    if (e === map.getCanvas()) return false;
    const b = e.getBoundingClientRect();
    if (b.width<4||b.height<4) return false;
    const cs = getComputedStyle(e);
    if (cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) return false;
    const bg = cs.backgroundColor; const m = bg.match(/rgba?\\(([^)]+)\\)/);
    const alpha = m ? (m[1].split(',')[3]!==undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
    const opaque = alpha > 0.5 || (cs.backgroundImage && cs.backgroundImage !== 'none');
    const blocks = cs.pointerEvents !== 'none';
    return (opaque || blocks);
  }).map(e=>{const b=e.getBoundingClientRect(); const cs=getComputedStyle(e);
    const bg=cs.backgroundColor; const mm=bg.match(/rgba?\\(([^)]+)\\)/);
    const alpha=mm?(mm[1].split(',')[3]!==undefined?parseFloat(mm[1].split(',')[3]):1):0;
    return {tag:e.tagName, cls:String(e.className).slice(0,70), id:e.id||null, insideMap: !!e.closest('#map'),
      rect:{x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0)},
      alpha:+alpha.toFixed(2), bg, pe:cs.pointerEvents, opaque: alpha>0.5};})
  .filter(o=>o.rect.w>20 && o.rect.h>20)
  .slice(0,40);
  // sample: elementFromPoint at map centre and in the strip
  const c = map.getCanvas().getBoundingClientRect();
  out.stackAt = (x,y)=>document.elementsFromPoint(x,y).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,50));
  out.stackStrip = out.stackAt(180, c.bottom-120);
  out.stackCentre = out.stackAt(700, 400);
  // camera centre
  const cc = map.project(map.getCenter());
  out.cameraCentreScreen = {x:+(c.left+cc.x).toFixed(0), y:+(c.top+cc.y).toFixed(0)};
  out.padding = map.getPadding ? map.getPadding() : null;
  return out;
})()`);
console.log(JSON.stringify(r,null,1));
await browser.close();
