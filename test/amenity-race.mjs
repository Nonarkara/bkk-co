// Exercise the actual controller with a held source request and a replaced DOM slot.
import assert from'node:assert/strict';import vm from'node:vm';import{readFile}from'node:fs/promises';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),JourneyModel=require('../public/journey-model.js');globalThis.JourneyModel=JourneyModel;const PlacePreferences=require('../public/place-preferences.js'),code=await readFile(new URL('../public/journeys.js',import.meta.url),'utf8');
const original=`function warmPlace(p,slot){const generation=sheetGeneration;load().then(()=>{if(generation===sheetGeneration&&state.selected?.id===p.id&&slot?.isConnected&&!document.querySelector('.been-form'))slot.outerHTML=placePanel(p)}).catch(()=>{});}`;
const transplant=s=>s.replace(/function warmPlace\(p,slot\)\{[\s\S]*?\n  \}\n  document.addEventListener/,original+'\n  document.addEventListener');
async function run(source,guard){let release,editing=false;const p={id:'n735122008',k:'cafe',flags:0},visible={outerHTML:'unknown'},owner={isConnected:true,hidden:false,querySelector:s=>s==='.been-form'?(editing?{}:null):s==='.journey-place-facts'?visible:null},old={isConnected:true,closest:()=>owner},window={PlacePreferences},context={window,JourneyModel,state:{selected:p,scores:{}},sheetGeneration:1,document:{addEventListener(){},querySelector:()=>null},esc:s=>String(s??''),URL,AbortSignal,fetch:async path=>({ok:true,json:async()=>path.includes('journey-places')?await new Promise(r=>release=()=>r({venueTags:{[p.id]:{sourceID:p.id,tags:{air_conditioning:'yes',internet_access:'wlan'}}}})):path.includes('journey-geo')?{manifest:{asOf:'2026-10-24'}}:{}})};
 vm.createContext(context);vm.runInContext(source,context);window.WorkFinder.warmPlace(p,old);await new Promise(r=>setTimeout(r,0));assert(release,'Full join request held');old.isConnected=false;
 if(guard==='task')context.sheetGeneration++;if(guard==='selection')context.state.selected={id:'other'};if(guard==='form')editing=true;
 release();await new Promise(r=>setTimeout(r,0));assert(window.WorkFinder.data);return visible.outerHTML;
}
// No preference is set, so renderFacts stays empty (it would only repeat Working here).
// The held join still has to reach this slot: mapped Wi-Fi from the venue tags, the
// geography snapshot date, and this place's OSM id. Parking stays unknown.
assert.match(await run(code),/class="journey-place-facts"[\s\S]*data-facility="parking" data-value="unknown"[\s\S]*<b>Wi-Fi<\/b> · Venue internet_access=wlan\. OpenStreetMap 2026-10-24[\s\S]*openstreetmap\.org\/node\/735122008/,'Same intent must receive richer facts after an earlier evidence refresh replaces its DOM node');
for(const guard of['task','selection','form'])assert.equal(await run(code,guard),'unknown',guard+' must reject a late refresh');
assert.equal(await run(transplant(code)),'unknown','Replanted captured-slot implementation must reproduce stale unknown');
console.log('Held join + replaced evidence node updates current same-task slot; task/selection/form guards pass; original captured-slot falsifier reproduces stale unknown.');
