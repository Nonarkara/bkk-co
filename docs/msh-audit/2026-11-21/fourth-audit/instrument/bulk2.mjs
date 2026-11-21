import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await ctx.newPage();
await page.goto('https://co.nonarkara.org',{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(3500);
await page.evaluate(`(()=>{ map.setZoom(9.2); map.panTo([100.62,13.60]); })()`);
await page.waitForTimeout(2500);
await page.click('#list-toggle');
await page.waitForTimeout(1800);
const before=await page.evaluate(`(()=>({count:(document.getElementById('count')||{}).textContent,
  label:(()=>{const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]');return b?b.innerText.trim():null;})(),
  rows:document.querySelectorAll('.list-place').length}))()`);
const t0=Date.now();
await page.evaluate(`(()=>{const b=document.querySelector('[data-list-more="all"][data-list-more-state="all"]'); if(b) b.click();})()`);
let alive=null;
try { await page.waitForFunction(`document.querySelectorAll('.list-place').length>100`,{timeout:30000}); alive=Date.now()-t0; }
catch(e){ alive='TIMEOUT>30s'; }
const after=await page.evaluate(`(()=>({rows:document.querySelectorAll('.list-place').length,
  count:(document.getElementById('count')||{}).textContent,
  listScrollH:document.getElementById('list').scrollHeight, listClientH:document.getElementById('list').clientHeight,
  nodes:document.getElementsByTagName('*').length}))()`).catch(e=>({err:String(e).slice(0,200)}));
const out={before,clickMs:alive,after};
fs.writeFileSync('/tmp/msh-audit-verifier-4/out/BULK-phone.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,1));
await browser.close();
