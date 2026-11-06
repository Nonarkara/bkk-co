import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),base='http://localhost:43828',dir='docs/stroll-2026-11-07/review',out=[];
async function ready(p){await p.goto(base);await p.waitForFunction(()=>typeof state!=='undefined'&&state.foodLoaded&&map.getLayer('place-icons'),{},{timeout:60000})}
async function gallery(p){await p.locator('#guide').click();await p.locator('[data-neighborhood-photos]').click()}
async function save(){await writeFile(`${dir}/edges.json`,JSON.stringify(out,null,2)+'\n')}
// Fresh page: visible failure state, retry, area pagination, enlarged dialog.
{
 const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await c.newPage();await ready(p);let reject=true;await p.route('**/data/neighborhood-photos.json',r=>reject?r.fulfill({status:503,body:'unavailable'}):r.continue());await gallery(p);await p.locator('[data-photo-retry]').waitFor();out.push({test:'photo-error',text:await p.locator('.reference-gallery-body').innerText()});await p.screenshot({path:`${dir}/photo-error-390.png`});reject=false;await p.locator('[data-photo-retry]').click();await p.locator('[aria-label="Photo neighborhood"]').waitFor();await p.locator('[aria-label="Photo neighborhood"]').selectOption('ari');await p.locator('.reference-more').click();out.push({test:'photo-retry-pagination',count:await p.locator('[data-photo]').count(),status:await p.locator('.reference-count').innerText()});await p.evaluate(()=>document.body.style.fontSize='30px');await p.locator('[data-photo]').first().click();await p.screenshot({path:`${dir}/photo-large-390.png`});out.push({test:'photo-large',geometry:await p.locator('.neighborhood-photo-dialog').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,box:e.getBoundingClientRect().toJSON()}))});await c.close();await save();
}
// Delayed real manifest must not overwrite a later task after a close.
{
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();await ready(p);let release;const gate=new Promise(ok=>release=ok);await p.route('**/data/neighborhood-photos.json',async r=>{await gate;await r.continue()});await gallery(p);await p.waitForTimeout(150);out.push({test:'photo-loading',text:await p.locator('.reference-gallery-body').innerText()});await p.screenshot({path:`${dir}/photo-loading-390.png`});await p.locator('#sheet .close').click();await p.locator('#passport').click();const title=await p.locator('#sheet h1').innerText();release();await p.waitForTimeout(1000);out.push({test:'photo-late-response',before:title,after:await p.locator('#sheet h1').innerText(),gallery:await p.locator('.reference-gallery-body').count()});await c.close();await save();
}
// Individual place references, source dates and local preference missing evidence.
{
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();await ready(p);await p.evaluate(async()=>{await hoodsReady;const hood=hoods.list.find(h=>h.slug==='ari'),place=hood.ids.map(id=>state.byId.get(id)).find(p=>p?.k==='cafe');await select(place,false)});await p.locator('.place-reference button.reference-image').waitFor();out.push({test:'place-photo',text:await p.locator('.place-reference').innerText(),unknown:await p.locator('.place-preference-facts').innerText()});await p.screenshot({path:`${dir}/place-photo-390.png`});await c.close();await save();
}
// Final 30px regression check after the builder's h2 min-width repair.
{
 const c=await b.newContext({viewport:{width:1024,height:900}}),p=await c.newPage();await ready(p);await p.locator('#q').focus();await p.locator('#hits [data-act=street]').click();await p.locator('[data-street-step="8"]').waitFor();await p.evaluate(()=>document.body.style.fontSize='30px');await p.waitForTimeout(200);out.push({test:'final-world-30px-1024',geometry:await p.locator('.street-panel').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,h2:getComputedStyle(e.querySelector('h2')).minWidth,doc:document.documentElement.scrollWidth,viewport:innerWidth}))});await p.screenshot({path:`${dir}/world-large-fixed-1024.png`});await c.close();await save();
}
// Use a genuine browser lifecycle transition; inspect visibility rather than assume it.
{
 const c=await b.newContext({viewport:{width:1440,height:900}}),p=await c.newPage();await ready(p);await p.locator('#q').focus();await p.locator('#hits [data-act=street]').click();await p.locator('[data-street-play]').waitFor();await p.locator('[data-street-play]').click();const before=await p.evaluate(()=>({playing:StreetWorld.playing,hidden:document.hidden}));const cdp=await c.newCDPSession(p);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await cdp.send('Page.setWebLifecycleState',{state:'active'});const after=await p.evaluate(()=>({playing:StreetWorld.playing,hidden:document.hidden}));out.push({test:'browser-freeze-thaw',before,after});
 // Hidden-event handler fault injection only, separately labelled from browser lifecycle.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});out.push({test:'hidden-event-handler',playing:await p.evaluate(()=>StreetWorld.playing)});await c.close();await save();
}
await b.close();console.log(JSON.stringify(out,null,2));
