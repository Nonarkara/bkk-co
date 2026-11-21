#!/usr/bin/env node
// Empty / loading / failed states, and the OLD club ladder (finding #5 before/after).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader'];
const OUT='/tmp/msh-audit-verifier-4/out';
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n); return i===-1?d:process.argv[i+1];};
const MODE=arg('mode','club'), URL_=arg('url','https://club.nonarkara.org');
const browser=await chromium.launch({executablePath:CHROME,headless:true,args:ARGS});
const out={mode:MODE,url:URL_};

// ---- genuinely empty: pan the camera away from every place ----
{
  const ctx=await browser.newContext({viewport:{width:1024,height:768}});
  const page=await ctx.newPage();
  try {
    await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(3500);
    out.emptyBefore=await page.evaluate(`(()=>({count:(document.getElementById('count')||{}).textContent,
      centre:{lng:map.getCenter().lng,lat:map.getCenter().lat,zoom:map.getZoom()},
      rows:document.querySelectorAll('.list-place').length,
      listText:(document.getElementById('list')||{}).innerText.slice(0,120)}))()`);
    await page.evaluate(`(()=>{ map.jumpTo({center:[105.6,7.6],zoom:8}); })()`);
    await page.waitForTimeout(3500);
    out.emptyAfter=await page.evaluate(`(()=>({count:(document.getElementById('count')||{}).textContent,
      centre:{lng:map.getCenter().lng,lat:map.getCenter().lat,zoom:map.getZoom()},
      rows:document.querySelectorAll('.list-place').length,
      listText:((document.getElementById('list')||{}).innerText||'').slice(0,200),
      emptyMsg:(document.getElementById('list')||{}).innerText.includes('No matches in view'),
      meta:!!document.querySelector('#list .meta')}))()`);
    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/STATE-${MODE}-empty.png`});
  } catch(e){ out.emptyErr=String(e); }
  await ctx.close();
}

// ---- loading state on the club host (slow catalogue) ----
{
  const ctx=await browser.newContext({viewport:{width:1024,height:768}});
  const page=await ctx.newPage();
  await page.route('**/places-cannabis.json', async r=>{ await new Promise(res=>setTimeout(res,12000)); r.abort(); });
  try {
    await page.goto(URL_,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(3000);
    out.loading=await page.evaluate(`(()=>{const t=document.body.innerText||'';
      const box=document.getElementById('club-hotspots');
      return {count:(document.getElementById('count')||{}).textContent,
        loadingWord:/Loading/i.test(t),
        phrases:(t.match(/Loading[^\\n]{0,60}/g)||[]).slice(0,4),
        boxHidden:box?box.hidden:null, boxText:box?box.innerText.trim().slice(0,140):null,
        rows:document.querySelectorAll('.list-place').length};})()`);
    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/STATE-${MODE}-loading.png`});
  } catch(e){ out.loadingErr=String(e); }
  await ctx.close();
}

// ---- the OLD club ladder: clicks to reach every listing in view ----
if (process.argv.includes('--old')) {
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage();
  try {
    await page.goto('http://127.0.0.1:8801/index.html?mode=club',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(4000);
    const ladder=await page.evaluate(`(()=>({count:(document.getElementById('count')||{}).textContent,
      rows:document.querySelectorAll('.list-place').length,
      more:Array.from(document.querySelectorAll('[data-list-more]')).map(b=>b.innerText.trim()),
      listScrollH:document.getElementById('list').scrollHeight, listClientH:document.getElementById('list').clientHeight}))()`);
    out.oldClubLadder0=ladder;
    let clicks=0, rows=ladder.rows, labels=[];
    for (let i=0;i<14;i++){
      const l=await page.evaluate(`(()=>{const b=document.querySelector('[data-list-more]:not([data-list-more-state="fewer"])');
        if(!b) return null; return {t:b.innerText.trim(), disabled:b.disabled};})()`);
      if(!l) break;
      labels.push(l.t);
      await page.evaluate(`(()=>{const b=document.querySelector('[data-list-more]:not([data-list-more-state="fewer"])'); if(b) b.click();})()`);
      clicks++; await page.waitForTimeout(700);
      const r=await page.evaluate(`(()=>({rows:document.querySelectorAll('.list-place').length,
        scrollH:document.getElementById('list').scrollHeight, clientH:document.getElementById('list').clientHeight,
        more:Array.from(document.querySelectorAll('[data-list-more]')).map(b=>b.innerText.trim())}))()`);
      if (r.rows===rows && clicks>2) { out.oldClubLadderEnd=r; break; }
      rows=r.rows; out.oldClubLadderEnd=r;
    }
    out.oldClubClicks=clicks; out.oldClubLabels=labels;
    await page.screenshot({path:`/tmp/msh-audit-verifier-4/shots/OLD-club-1440-expanded.png`});
  } catch(e){ out.oldErr=String(e); }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/STATES-${MODE}.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,1));
await browser.close();
