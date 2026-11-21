import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader']});
for (const [url,label] of [['https://club.nonarkara.org','club'],['https://co.nonarkara.org','plub']]) {
  const ctx=await browser.newContext({viewport:{width:1024,height:768}});
  const page=await ctx.newPage();
  await page.addInitScript(`window.__s=[];(function(){let n=0;const iv=setInterval(()=>{try{window.__s.push(document.body?document.body.innerText.slice(0,900):'');}catch(e){} if(++n>60)clearInterval(iv);},25);})();`);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(2500);
  const hits=await page.evaluate(`(()=>{const s=window.__s||[];const re=/caf\\u00e9|coffee|co-working|library/i;const out=[];
    s.forEach((t,i)=>{const m=t.match(re); if(m) out.push({i, word:m[0], ctx:t.slice(Math.max(0,m.index-70), m.index+90).replace(/\\n/g,' | ')});});
    return {n:s.length, hits:out.slice(0,8)};})()`);
  console.log(label, JSON.stringify(hits,null,1));
  await ctx.close();
}
await browser.close();
