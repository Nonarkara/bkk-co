import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createRequire}from'node:module';
import vm from 'node:vm';
const model=createRequire(import.meta.url)('../public/footprint-model.js');
const runtime=await readFile(new URL('../public/footprint-palette.js',import.meta.url),'utf8');
const square=x=>[[[x,13],[x+.001,13],[x+.001,13.001],[x,13.001],[x,13]]];
const a=square(100),b=square(101);
const grouped={type:'Feature',id:2420,properties:{},geometry:{type:'MultiPolygon',coordinates:[a,b]}};
const places=[{id:'coffee',k:'cafe',x:100.0005,y:13.0005},{id:'food',k:'restaurant',x:100.0006,y:13.0006},{id:'unknown',k:'bar',x:100.0007,y:13.0007}];
function harness(code,fetcher){
 const timers=new Map(),listeners=new Map(),images=new Map(),sources=new Map(),counts={data:0,move:0,layout:0,paint:0};
 let serial=0,raw=[],street=false,controlBox;
 const layers=[{id:'manga-building-tone'}];
 const ctx=new Proxy({}, {get:(o,k)=>k==='getImageData'?()=>({width:32,height:32,data:new Uint8ClampedArray(4096)}):o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const element=tag=>({style:{},append(){},setAttribute(){},getContext:()=>ctx,toDataURL:()=>`data:image/png;test-${tag}`});
 const map={
  on(name,handler){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(handler)},
  getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.get(id),hasImage:id=>images.has(id),addImage:(id,data)=>images.set(id,data),
  addSource(id,config){sources.set(id,{_data:config.data,setData(data){this._data=data;counts.data++}})},
  addLayer(config,before){const i=layers.findIndex(l=>l.id===before);layers.splice(i<0?layers.length:i,0,config)},
  getLayoutProperty:(id,name)=>map.getLayer(id)?.layout?.[name],
  setLayoutProperty(id,name,value){counts.layout++;map.getLayer(id).layout[name]=value},
  getStyle:()=>({layers}),querySourceFeatures:()=>raw,
  moveLayer(id,before){counts.move++;const i=layers.findIndex(l=>l.id===id),[item]=layers.splice(i,1);layers.splice(layers.findIndex(l=>l.id===before),0,item)},
  addControl(control){controlBox=control.onAdd(map)},setPaintProperty(){counts.paint++},setFeatureState(){},removeFeatureState(){}
 };
 const window={MangaLens:{active:true},StreetWorld:{active:false}};
 vm.runInNewContext(code,{fetch:fetcher,window,FootprintModel:model,PlaceTools:{symbol:()=>'*'},Atlas:{key(){}},document:{createElement:element,querySelector:()=>street?{}:null},setTimeout(fn){const id=++serial;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)});
 const flush=()=>{const pending=[...timers.values()];timers.clear();for(const fn of pending)fn();assert.equal(timers.size,0,'An update must not perpetuate its own render loop')};
 const emit=(name,event={})=>{for(const fn of listeners.get(name)||[])fn(event)};
 return {get controlBox(){return controlBox},map,window,counts,images,sources,layers,flush,emit,palette:window.FootprintPalette,setRaw(value){raw=value}};
}
function lateSourceCheck(code){
 const h=harness(code);h.palette.attach(h.map);h.palette.refresh(places);h.flush();
 assert.equal(h.palette.features.length,0,'Empty tiles during a pan remain unknown');
 h.setRaw([grouped,grouped]);
 h.emit('sourcedata',{sourceId:'openmaptiles',sourceDataType:undefined});h.flush();
 assert.equal(h.palette.features.length,1,'A late source event without sourceDataType must populate the overlay without refresh');
 return h;
}
const h=lateSourceCheck(runtime),overlay='manga-place-footprints';
assert.equal(h.palette.features[0].properties.mask,9);
assert.deepEqual(h.palette.features[0].properties.placeIDs,['coffee','food']);
assert.deepEqual(h.palette.features[0].geometry.coordinates,a,'Only the containing component may be filled');
assert.equal(h.palette.features[0].properties.tileFeatureID,2420);
assert.equal(h.sources.get('palette-footprints')._data.features.length,1);
assert.equal(h.images.size,16,'Neutral and all 15 category patterns are registered');
for(let mask=1;mask<16;mask++)assert(h.images.has('palette-mask-'+mask));
assert.equal(h.map.getLayoutProperty(overlay,'visibility'),'visible');
const before={...h.counts};
for(let i=0;i<6;i++){h.emit('idle');h.flush()}
assert.deepEqual(h.counts,before,'Unchanged idle events must not invalidate data, layer order, layout or paint');
h.window.MangaLens.active=false;h.palette.sync();h.flush();
assert.equal(h.map.getLayoutProperty(overlay,'visibility'),'none');assert.equal(h.controlBox.hidden,true,'Precision view cannot show an inactive building-color legend');
h.window.MangaLens.active=true;h.palette.sync();h.flush();
assert.equal(h.map.getLayoutProperty(overlay,'visibility'),'visible');assert.equal(h.controlBox.hidden,false);
h.palette.refresh(places.filter(p=>p.k!=='restaurant'));h.flush();
assert.equal(h.palette.features.length,1);assert.equal(h.palette.features[0].properties.mask,1);
assert.deepEqual(h.palette.features[0].properties.placeIDs,['coffee']);
h.palette.refresh(places.filter(p=>p.k==='bar'));h.flush();
assert.equal(h.palette.features.length,0,'Filtered and unknown kinds cannot leave stale colored footprints');
// Prove the original late-tile failure is caught, rather than merely exercising refresh.
const oldGuard=runtime.replace("if(['openmaptiles','street-buildings'].includes(e.sourceId))sync()","if(['openmaptiles','street-buildings'].includes(e.sourceId)&&e.sourceDataType==='content')sync()");
assert.notEqual(oldGuard,runtime,'The negative control must actually restore the old content-only guard');
assert.throws(()=>lateSourceCheck(oldGuard),/late source event without sourceDataType/,'The old guard must fail the late-tile regression');
console.log('Palette runtime late-tile recovery, idle stability, category filtering, visibility, component geometry and negative control pass.');

// A fresh z12 page has no MVT building geometry; the pinned source must bootstrap it.
let fetches=0;const retainedHarness=harness(runtime,async()=>{fetches++;return {ok:true,json:async()=>({type:'FeatureCollection',features:[grouped]})}});
retainedHarness.palette.attach(retainedHarness.map);retainedHarness.palette.refresh(places);
await new Promise(resolve=>setImmediate(resolve));retainedHarness.flush();
assert.equal(fetches,1);assert.equal(retainedHarness.palette.features.length,1,'Cold low zoom must use retained true source geometry without MVT');
const retainedBefore={...retainedHarness.counts};
for(let i=0;i<6;i++){retainedHarness.emit('moveend');retainedHarness.emit('idle');retainedHarness.flush()}
assert.deepEqual(retainedHarness.counts,retainedBefore,'Retained zoom/pan/idle may not perpetuate source updates');
retainedHarness.palette.refresh(places.filter(p=>p.k!=='restaurant'));retainedHarness.flush();assert.equal(retainedHarness.palette.features[0].properties.mask,1,'Retained source respects selected categories');
retainedHarness.palette.refresh([]);retainedHarness.flush();assert.equal(retainedHarness.palette.features.length,0,'Empty filters clear retained data');
console.log('Retained cold-zoom bootstrap, one fetch, pan/idle stability and selected-category reclassification pass.');
let attempts=0;const recovery=harness(runtime,async()=>{if(++attempts===1)throw new Error('offline');return {ok:true,json:async()=>({type:'FeatureCollection',features:[grouped]})}});
recovery.palette.attach(recovery.map);recovery.palette.refresh(places);assert.equal(recovery.palette.sourceState,'loading');assert.match(recovery.palette.legend(),/source is loading/);await new Promise(resolve=>setImmediate(resolve));recovery.flush();assert.equal(recovery.palette.sourceState,'unavailable');assert.match(recovery.palette.legend(),/city-scale colors may be absent/);assert.match(recovery.palette.legend(),/data-retry-footprints/);
for(let i=0;i<5;i++){recovery.emit('idle');recovery.flush()}assert.equal(attempts,1,'Unavailable source must never enter an automatic retry loop');await recovery.palette.retry();recovery.flush();assert.equal(attempts,2);assert.equal(recovery.palette.sourceState,'available');assert.equal(recovery.palette.features.length,1);assert.doesNotMatch(recovery.palette.legend(),/data-retry-footprints/);console.log('Source loading/unavailable disclosure, no automatic retry loop and explicit retry recovery pass.');
