// Proposed reusable test: copy to test/manga-browser.mjs and run against local Worker/static server.
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH||'/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.PLUB_URL||'http://localhost:43828',out=process.env.PLUB_EVIDENCE_DIR||'/tmp/plub-manga-audit-nov5/final';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw Error('Local only: intercepts prerequisite response');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const result={interruptions:[]},opacityKey={background:'background-opacity',fill:'fill-opacity',line:'line-opacity',symbol:'text-opacity'};
const ready=async p=>{await p.goto(base);await p.waitForFunction(()=>state.byId.size>10000&&MangaLens.installed,null,{timeout:120000})};
try {
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();await ready(page);
 await page.evaluate(()=>{globalThis.originalPaint=map.setPaintProperty.bind(map);globalThis.writes=[];map.setPaintProperty=(...args)=>{writes.push({id:args[0],property:args[1],value:args[2]});return originalPaint(...args)}});
 // Every actual style layer must reach its design opacity, regardless of animation grouping.
 await page.getByRole('button',{name:'Manga view',exact:true}).click();await page.waitForTimeout(350);
 const completed=await page.evaluate(keys=>map.getStyle().layers.filter(l=>l.id.startsWith('manga-')).map(l=>({id:l.id,opacity:map.getPaintProperty(l.id,keys[l.type]),transition:map.getPaintProperty(l.id,keys[l.type]+'-transition')})),opacityKey);
 assert.equal(completed.find(l=>l.id==='manga-town').opacity,.14);assert.ok(completed.every(l=>l.opacity>0));result.completed=completed;
 // Capture writes only after each synchronous interruption has settled the existing work.
 for(const event of ['pointerdown','wheel','keydown','visibilitychange','reduce','task'])for(const on of [true,false]){
  await page.evaluate(on=>{MangaLens.set(!on);MangaLens.settle()},on);
  await page.evaluate(({event,on})=>{MangaLens.set(on);if(event==='visibilitychange'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event(event))}else if(event==='task'){openSheet('<header><h1>Audit task</h1></header>')}else if(event!=='reduce'){const Constructor=event==='keydown'?KeyboardEvent:event==='wheel'?WheelEvent:PointerEvent;map.getCanvas().dispatchEvent(new Constructor(event,{bubbles:true,key:'Shift'}))}}, {event,on});
  if(event==='reduce'){await page.evaluate(()=>{globalThis.auditMediaEvent=false;matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{auditMediaEvent=true},{once:true})});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>auditMediaEvent)}
  const settled=await page.evaluate(keys=>{writes=[];return map.getStyle().layers.filter(l=>l.id.startsWith('manga-')).map(l=>({id:l.id,transition:map.getPaintProperty(l.id,keys[l.type]+'-transition')}))},opacityKey);
  await page.waitForTimeout(350);const late=await page.evaluate(()=>writes);assert.deepEqual(late,[],`${event}/${on}: delayed writes survive interruption`);assert.ok(settled.every(l=>l.transition?.duration===0),`${event}/${on}: active transition survives interruption`);result.interruptions.push({event,on,lateWrites:late.length,allTransitionsZero:true});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});closeSheet()});if(event==='reduce')await page.emulateMedia({reducedMotion:'no-preference'});
 }
 await page.evaluate(()=>{MangaLens.set(false);MangaLens.settle()});
 const baseline=await page.evaluate(()=>map.getStyle().layers.filter(l=>!l.id.startsWith('manga-')).map(l=>[l.id,l.layout?.visibility||'visible']));
 await page.evaluate(()=>{MangaLens.set(true);MangaLens.settle();globalThis.restored=false;map.once('style.load',()=>restored=true);map.setStyle(map.getStyle(),{diff:false})});await page.waitForFunction(()=>restored);await page.evaluate(()=>{MangaLens.set(false);MangaLens.settle()});
 const restored=await page.evaluate(()=>map.getStyle().layers.filter(l=>!l.id.startsWith('manga-')).map(l=>[l.id,l.layout?.visibility||'visible']));assert.deepEqual(restored,baseline);result.basemapAndAppRestore=true;assert.equal(await page.evaluate(()=>map.getPaintProperty('manga-town','fill-opacity')),0);
 await context.close();
 const failed=await browser.newContext(),errorPage=await failed.newPage();await failed.route('**/styles/plub-manga.json',route=>route.fulfill({status:503,body:'unavailable'}));await errorPage.goto(base);await errorPage.waitForFunction(()=>state.byId.size>10000,null,{timeout:120000});await errorPage.evaluate(()=>StreetWorld.open());await errorPage.getByRole('button',{name:'Retry street sketch',exact:true}).waitFor();
 result.failed=await errorPage.evaluate(()=>({active:StreetWorld.active,installed:MangaLens.installed,panel:document.querySelector('.street-panel').textContent}));assert.equal(result.failed.active,false);assert.equal(result.failed.installed,false);await errorPage.screenshot({path:out+'/failed-prerequisite.png'});
 await failed.unroute('**/styles/plub-manga.json');await errorPage.getByRole('button',{name:'Retry street sketch',exact:true}).click();await errorPage.waitForFunction(()=>StreetWorld.active&&MangaLens.installed&&MangaLens.held,null,{timeout:30000});await errorPage.evaluate(()=>StreetWorld.exit());const toggle=errorPage.getByRole('button',{name:'Manga view',exact:true});assert.equal(await toggle.isDisabled(),false);assert.ok(!(await toggle.getAttribute('title')).includes('unavailable'));await toggle.focus();await errorPage.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-pressed'),'true');result.retryRecovered=true;await failed.close();
 await writeFile(out+'/regression-results.json',JSON.stringify(result,null,2));console.log('Manga browser: all opacity targets,12 interruption paths with no late writes and0ms transitions, snapshot basemap/app restore, prerequisite503/retry and keyboard pass.');
} finally {await browser.close()}
