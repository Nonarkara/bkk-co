import {createRequire} from 'node:module';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const base='http://localhost:43828',dir='docs/stroll-2026-11-07/amenity-race-review',before=createHash('sha256').update(await readFile('public/journeys.js')).digest('hex'),out=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const old=`function warmPlace(p,slot){
 const generation=sheetGeneration;
 load().then(()=>{if(generation===sheetGeneration&&state.selected?.id===p.id&&slot?.isConnected&&!document.querySelector('.been-form'))slot.outerHTML=placePanel(p)}).catch(()=>{});
 }`;
async function run(width,scenario,mutant=false){
 const c=await browser.newContext({viewport:{width,height:width===390?844:900},timezoneId:'Asia/Bangkok',serviceWorkers:'block'}),p=await c.newPage();p.setDefaultTimeout(15000);let release,held=false;const gate=new Promise(ok=>release=ok),r={width,scenario,mutant,errors:[],writes:[]};out.push(r);p.on('pageerror',e=>r.errors.push(e.message));p.on('request',q=>{if(q.url().includes('/api/')&&!['GET','HEAD'].includes(q.method()))r.writes.push(q.url())});
 await p.route('**/data/journey-places.json',async route=>{held=true;await gate;await route.continue().catch(()=>{})});
 if(mutant)await p.route('**/journeys.js*',async route=>{const response=await route.fetch(),body=await response.text();assert.ok(body.includes('owner.querySelector'));const changed=body.replace(/function warmPlace\(p,slot\)\{[\s\S]*?\n  \}\n  document\.addEventListener/,old+'\n  document.addEventListener');assert.notEqual(changed,body);await route.fulfill({response,body:changed})});
 try{
  await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof state!=='undefined'&&state.foodLoaded&&map.getLayer('place-icons'),{},{timeout:60000});r.script=await p.locator('script[src*="journeys.js?"]').getAttribute('src');assert.ok(r.script.includes('20261107c'));
  await p.evaluate(async()=>{await select(state.byId.get('n735122008'),false);window.raceOriginalSlot=document.querySelector('.journey-place-facts')});
  assert.equal(held,true,'Full venue join request is deliberately held');r.initial=await p.locator('[data-preference-fact="ac"]').innerText();assert.ok(r.initial.includes('unknown'));
  await p.evaluate(()=>WorkFinder.warmEvidence());r.forced=await p.evaluate(()=>({oldSlotDetached:!window.raceOriginalSlot.isConnected,fullJoinLoaded:!!WorkFinder.data,selected:state.selected.id,currentAC:document.querySelector('[data-preference-fact="ac"]').textContent}));assert.equal(r.forced.oldSlotDetached,true);assert.equal(r.forced.fullJoinLoaded,false);
  if(scenario==='new-task'){await p.locator('#passport').click();r.before=await p.locator('#sheet h1').innerText()}
  if(scenario==='new-place'){r.newID=await p.evaluate(async()=>{const other=state.places.find(v=>v.k==='cafe'&&v.id!=='n735122008');await select(other,false);return other.id});r.before=await p.locator('#sheet h1').innerText()}
  if(scenario==='close'){await p.locator('#sheet .close').click();r.before=await p.locator('#sheet').isHidden()}
  if(scenario==='edit-form'){await p.locator('.been-open').click();await p.locator('.been-form').waitFor();r.before=await p.locator('.been-form').innerText()}
  release();await p.waitForFunction(()=>!!WorkFinder.data);await p.waitForTimeout(150);
  if(scenario==='hydrate'){
   r.after=await p.locator('[data-preference-fact="ac"]').innerText();r.documented=await p.locator('[data-preference-fact="ac"]').getAttribute('data-value');assert.equal(r.documented,mutant?'unknown':'documented');
  }else if(scenario==='new-task'){r.after=await p.locator('#sheet h1').innerText();assert.equal(r.after,r.before);assert.equal(await p.locator('.journey-place-facts').count(),0)}
  else if(scenario==='new-place'){r.after=await p.locator('#sheet h1').innerText();assert.equal(r.after,r.before);assert.equal(await p.evaluate(()=>state.selected.id),r.newID)}
  else if(scenario==='close'){r.after=await p.locator('#sheet').isHidden();assert.equal(r.after,true)}
  else if(scenario==='edit-form'){r.after=await p.locator('.been-form').innerText();assert.equal(r.after,r.before)}
  await p.screenshot({path:`${dir}/${mutant?'negative-':''}${scenario}-${width}.png`});assert.deepEqual(r.errors,[]);assert.deepEqual(r.writes,[]);r.pass=true;
 }catch(e){r.failure=e.stack;await p.screenshot({path:`${dir}/failure-${scenario}-${width}.png`}).catch(()=>{});release()}
 await c.close();await writeFile(`${dir}/audit.json`,JSON.stringify({before,out},null,2)+'\n');console.log(width,scenario,mutant?'NEGATIVE':'FIXED',r.pass?'PASS':r.failure);
}
try{for(const width of [390,1024,1440])await run(width,'hydrate');await run(390,'hydrate',true);for(const scenario of ['new-task','new-place','close','edit-form'])await run(390,scenario)}finally{await browser.close()}
const after=createHash('sha256').update(await readFile('public/journeys.js')).digest('hex');await writeFile(`${dir}/audit.json`,JSON.stringify({before,after,stable:before===after,out},null,2)+'\n');if(out.some(r=>!r.pass))process.exitCode=1;
