import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1024,height:768}});
const page=await ctx.newPage();
await page.goto('https://co.nonarkara.org',{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(3500);
const out={};
out.at1024=await page.evaluate(`(()=>({count:(document.getElementById('count')||{}).textContent,
  label:(()=>{const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]');return b?b.innerText.trim():null;})(),
  rows:document.querySelectorAll('.list-place').length, zoom:+map.getZoom().toFixed(2)}))()`);
// zoom out the way a reader would: the map's own control
await page.evaluate(`(()=>{ map.setZoom(9.2); map.panTo([100.62,13.60]); })()`);
await page.waitForTimeout(2500);
out.zoomedOut=await page.evaluate(`(()=>({count:(document.getElementById('count')||{}).textContent,
  label:(()=>{const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]');return b?b.innerText.trim():null;})(),
  rows:document.querySelectorAll('.list-place').length, zoom:+map.getZoom().toFixed(2),
  listScrollH:document.getElementById('list').scrollHeight}))()`);
const t0=Date.now();
await page.evaluate(`(()=>{const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]'); if(b) b.click();})()`);
// is the page still alive?
let alive=null;
try {
  await page.waitForFunction(`document.querySelectorAll('.list-place').length>0`, {timeout:30000});
  alive=Date.now()-t0;
} catch(e){ alive='TIMEOUT>30s'; }
out.clickMs=alive;
out.after=await page.evaluate(`(()=>({rows:document.querySelectorAll('.list-place').length,
  count:(document.getElementById('count')||{}).textContent,
  listScrollH:document.getElementById('list').scrollHeight, listClientH:document.getElementById('list').clientHeight,
  nodes:document.getElementsByTagName('*').length,
  label:(()=>{const b=document.querySelector('[data-list-more]');return b?b.innerText.trim():null;})()}))()`).catch(e=>({err:String(e).slice(0,200)}));
await page.screenshot({path:'/tmp/msh-audit-verifier-4/shots/BULK-plub-1024-after.png'}).catch(()=>{});
fs.writeFileSync('/tmp/msh-audit-verifier-4/out/BULK.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,1));
await browser.close();
