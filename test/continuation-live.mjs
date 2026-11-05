// Read-only public smoke: never creates an account, visit, post or hop.
import assert from 'node:assert/strict';
import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||'/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PLUB_URL||'https://co.nonarkara.org',dir=new URL('../docs/continuation-2026-11-05/live-browser/',import.meta.url),results=[];await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const width of[390,1024,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await context.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>{if(!['GET','HEAD'].includes(r.request().method())){writes.push(r.request().method()+' '+r.request().url());return r.abort()}return r.continue()});
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>state.foodLoaded&&MangaLens.installed);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>MangaLens.set(true));await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>map.getPaintProperty('manga-town','fill-opacity')),.14);
 await page.evaluate(()=>openHop('ari'));await page.waitForFunction(()=>!map.isMoving()&&map.areTilesLoaded());
 const geometry=()=>page.evaluate(()=>map.getSource('route')._data);const planned=await geometry();const points=planned.features.filter(f=>f.geometry.type==='Point');assert(points.length>1);assert.equal(await page.evaluate(()=>map.getPaintProperty('route-num','text-color')),'#ffffff');
 await page.locator('[data-shared-hops]').click();await page.waitForFunction(()=>!document.querySelector('.hop-feed').hasAttribute('role'));assert.deepEqual(await geometry(),planned);
 await page.waitForFunction(()=>!map.isMoving()&&map.areTilesLoaded());await page.waitForTimeout(500);await page.screenshot({path:new URL('feed-'+width+'.png',dir).pathname});
 const bleed=await page.locator('#sheet').evaluate(s=>s.scrollWidth>s.clientWidth||document.documentElement.scrollWidth>innerWidth);assert.equal(bleed,false);
 await page.locator('[data-hop-compose]').click();await page.locator('.hop-account .cloud-create').waitFor();assert.deepEqual(await geometry(),planned);assert.equal(await page.locator('[data-hop-publish]').count(),0,'Anonymous reader must sign in before a public composer');
 await page.locator('#sheet .close').click();assert.equal((await geometry()).features.length,0);
 await page.evaluate(()=>openPassport());await page.locator('#notebook-tools').waitFor();assert.equal(await page.locator('#sheet').evaluate(s=>s.classList.contains('shared-hops-sheet')),false);
 await page.evaluate(()=>document.body.style.fontSize='30px');assert.equal(await page.locator('#sheet').evaluate(s=>s.scrollWidth>s.clientWidth||document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);results.push({width,routeIDs:points.map(f=>f.properties.id),fullRoutePreserved:true,anonymousGate:true,classCleanup:true,enlargedBleed:false,errors,writes});await context.close();
}await writeFile(new URL('results.json',dir),JSON.stringify(results,null,2)+'\n');console.log('Public read-only: manga targets, white route numbers, exact hop line/stop retention, anonymous key gate, new-task cleanup and enlarged notebook pass at3widths; zero writes/errors.');}finally{await browser.close()}
