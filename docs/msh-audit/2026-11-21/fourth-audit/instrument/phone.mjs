#!/usr/bin/env node
// Focused phone probe: the drawer (list sheet) — the surface the main instrument never opens.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader'];
const URL_ = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url')+1] : 'https://co.nonarkara.org';
const MODE = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode')+1] : 'plub';
const OUT = '/tmp/msh-audit-verifier-4/out';
const browser = await chromium.launch({executablePath:CHROME, headless:true, args:ARGS});
const ctx = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:1, hasTouch:true});
const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(3500);

const snap = () => page.evaluate(`(() => {
  const cnt=document.getElementById('count');
  const lw=document.getElementById('list-wrap');
  const close=document.querySelector('.list-close');
  const list=document.getElementById('list');
  const r = el => { if(!el) return null; const b=el.getBoundingClientRect();
    return {x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(1),h:+b.height.toFixed(1),bottom:+b.bottom.toFixed(0)}; };
  const cr = close ? close.getBoundingClientRect() : null;
  return {
    countText: cnt ? cnt.textContent.trim() : null,
    countVisible: cnt ? (cnt.checkVisibility?cnt.checkVisibility():false) : null,
    headingText: document.getElementById('places-in-view') ? document.getElementById('places-in-view').textContent.trim() : null,
    headingVisible: document.getElementById('places-in-view') ? document.getElementById('places-in-view').checkVisibility() : null,
    listOpen: lw ? lw.classList.contains('open') : null,
    listWrapRect: r(lw),
    rows: document.querySelectorAll('.list-place').length,
    listScrollH: list?list.scrollHeight:null, listClientH: list?list.clientHeight:null,
    listText: list?list.innerText.trim().slice(0,260):null,
    closeBtn: close ? {w:+cr.width.toFixed(1), h:+cr.height.toFixed(1), rect:r(close), visible:close.checkVisibility(), aria:close.getAttribute('aria-label')} : null,
    reveal: Array.from(document.querySelectorAll('[data-list-more]')).map(b=>({text:b.innerText.trim(), aria:b.getAttribute('aria-label'), state:b.getAttribute('data-list-more-state')})),
    toggle: (()=>{const t=document.getElementById('list-toggle'); if(!t) return null; const b=t.getBoundingClientRect();
      return {w:+b.width.toFixed(1), h:+b.height.toFixed(1), rect:{x:+b.x.toFixed(0),y:+b.y.toFixed(0)}, pressed:t.getAttribute('aria-pressed'), visible:t.checkVisibility()};})()
  };
})()`);

const out = { mode: MODE, url: URL_, errors: errs };
out.closed = await snap();
// map drag with the drawer closed (phone map is full bleed)
out.dragClosed = await (async () => {
  const before = await page.evaluate(`({c:{lng:map.getCenter().lng,lat:map.getCenter().lat},z:map.getZoom()})`);
  await page.mouse.move(195,520); await page.mouse.down(); await page.mouse.move(120,560,{steps:12}); await page.mouse.up();
  await page.waitForTimeout(900);
  const after = await page.evaluate(`({c:{lng:map.getCenter().lng,lat:map.getCenter().lat},z:map.getZoom()})`);
  return {before,after,moved: Math.abs(after.c.lng-before.c.lng)>1e-7};
})();
// open the drawer
await page.click('#list-toggle');
await page.waitForTimeout(2000);
out.open = await snap();
await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/PHONE-${MODE}-drawer.png`});
// does the count survive the drawer covering the map?
out.openAfterWait = await (async () => { await page.waitForTimeout(2500); return await snap(); })();
// click the disclosure if present
if (out.open.reveal && out.open.reveal.length) {
  await page.evaluate(`(()=>{const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]')||document.querySelector('[data-list-more]'); if(b) b.click();})()`);
  await page.waitForTimeout(1500);
  out.afterReveal = await snap();
  await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/PHONE-${MODE}-revealed.png`});
}
// escape closes
await page.keyboard.press('Escape');
await page.waitForTimeout(900);
out.afterEscape = await snap();
fs.writeFileSync(`${OUT}/PHONE-${MODE}.json`, JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,1));
await browser.close();
