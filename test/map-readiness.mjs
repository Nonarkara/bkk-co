import{createRequire}from'node:module';import assert from'node:assert/strict';import{writeFile}from'node:fs/promises';
const{chromium}=createRequire(import.meta.url)('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
try{for(const mode of['route','cancel','selection','notebook']){const p=await b.newPage({viewport:{width:1280,height:720}});let release;const gate=new Promise(r=>release=r);await p.route('**/styles/positron',async r=>{await gate;await r.continue()});await p.goto('http://localhost:43827');await p.waitForFunction(()=>state.byId.size===57539,{},{timeout:120000});
if(mode==='route'||mode==='cancel'){await p.evaluate(()=>openHop('charoenkrung'));assert.equal(await p.evaluate(()=>pendingRoute.stops.length),5);if(mode==='cancel')await p.evaluate(()=>closeSheet())}
else{await p.evaluate(()=>select(state.byId.get('h0001'),false));if(mode==='notebook')await p.evaluate(()=>openPassport())}
release();await p.waitForFunction(()=>map.getSource('route')&&map.loaded(),{},{timeout:60000});
if(mode==='route'){await p.waitForFunction(()=>map.queryRenderedFeatures({layers:['route-num']}).length>=5);assert.equal(await p.evaluate(()=>map.getSource('route')._data.features.filter(f=>f.geometry.type==='Point').length),5)}
if(mode==='cancel')assert.equal(await p.evaluate(()=>map.getSource('route')._data.features.length),0);
if(mode==='selection')assert.deepEqual(await p.evaluate(()=>map.getSource('sel')._data.geometry.coordinates),await p.evaluate(()=>{const p=state.byId.get('h0001');return[p.x,p.y]}));
if(mode==='notebook'){await p.getByRole('heading',{name:'Your notebook',exact:true}).waitFor();assert.equal(await p.evaluate(()=>state.selected),null);assert.equal(await p.evaluate(()=>map.getSource('sel')._data.features.length),0)}
results.push({mode,pass:true});await p.close()}
await writeFile(new URL('../docs/visual-2026-11-03/map-readiness.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log('Held map style: queued route replays; cancelled route stays gone; selection replays; notebook survives late map startup.')}finally{await b.close()}
