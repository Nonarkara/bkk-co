import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader']});
for (const [url,label] of [['https://club.nonarkara.org','club'],['https://co.nonarkara.org','plub']]) {
  for (const vw of [1440,1024]) {
    const hits=[];
    for (let i=0;i<3;i++){
      const ctx=await browser.newContext({viewport:{width:vw,height:vw===1440?900:768}});
      const page=await ctx.newPage(); const errs=[];
      page.on('pageerror',e=>errs.push(String(e).slice(0,220)));
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(5000);
      hits.push(errs.length?errs[0]:'clean');
      await ctx.close();
    }
    console.log(label, vw, JSON.stringify(hits));
  }
}
await browser.close();
