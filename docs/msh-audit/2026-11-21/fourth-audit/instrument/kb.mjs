#!/usr/bin/env node
// Keyboard behaviour with the phone drawer OPEN: reachability, focus indicator, escape, trap.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader'];
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n); return i===-1?d:process.argv[i+1];};
const URL_=arg('url','https://co.nonarkara.org'), MODE=arg('mode','plub');
const browser=await chromium.launch({executablePath:CHROME,headless:true,args:ARGS});
const ctx=await browser.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(3500);
await page.click('#list-toggle');
await page.waitForTimeout(1500);
const drawerOpen = await page.evaluate(`(()=>{const lw=document.getElementById('list-wrap');return {open:lw.classList.contains('open'), rect:(()=>{const r=lw.getBoundingClientRect();return {y:+r.y.toFixed(0),h:+r.height.toFixed(0)};})()};})()`);
const seq=[];
for (let i=0;i<40;i++){
  await page.keyboard.press('Tab');
  const s=await page.evaluate(`(()=>{const a=document.activeElement; if(!a||a===document.body) return {none:true};
    const r=a.getBoundingClientRect(); const cs=getComputedStyle(a);
    const inDrawer = !!(a.closest('#list-wrap')||a.closest('#sheet'));
    const covered = r.width>0 && r.height>0 && r.top < (window.__drawerTop||0) && r.bottom > 0;
    return {tag:a.tagName, cls:String(a.className||'').slice(0,60), id:a.id||null,
      text:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,36),
      visible:a.checkVisibility?a.checkVisibility():false,
      y:+r.y.toFixed(0), w:+r.width.toFixed(0), h:+r.height.toFixed(0),
      inDrawer, outlineW:parseFloat(cs.outlineWidth)||0, shadow:cs.boxShadow&&cs.boxShadow!=='none',
      borderW:parseFloat(cs.borderWidth)||0};
  })()`);
  seq.push(s);
}
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
const afterEscape=await page.evaluate(`(()=>{const lw=document.getElementById('list-wrap');return {open:lw.classList.contains('open'), active:document.activeElement?String(document.activeElement.className||document.activeElement.id||document.activeElement.tagName).slice(0,60):null};})()`);
// focus behind the drawer?
const behind = seq.filter(s=>!s.none && s.visible && !s.inDrawer);
const out={mode:MODE,url:URL_,drawerOpen,escape:afterEscape,
  tabbed:seq.length,
  focusedInDrawer:seq.filter(s=>s.inDrawer).length,
  focusedOutsideDrawer:seq.filter(s=>!s.none&&!s.inDrawer).map(s=>({tag:s.tag,cls:s.cls,id:s.id,text:s.text,y:s.y,visible:s.visible})),
  withoutFocusIndicator:seq.filter(s=>s.visible&&!(s.outlineW>0||s.shadow||s.borderW>0)).map(s=>({tag:s.tag,cls:s.cls,id:s.id,text:s.text})),
  sequence:seq};
fs.writeFileSync(`/tmp/msh-audit-verifier-4/out/KB-${MODE}.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify({mode:MODE,drawerOpen,escape:afterEscape,tabbed:seq.length,
  focusedInDrawer:out.focusedInDrawer, focusedOutsideDrawer:out.focusedOutsideDrawer.slice(0,10),
  withoutFocusIndicator:out.withoutFocusIndicator.slice(0,10)},null,1));
await browser.close();
