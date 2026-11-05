// Exercise the actual lens controller with deterministic events and time, without a GPU.
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../public/manga-lens.js',import.meta.url),'utf8');
const design=JSON.parse(await readFile(new URL('../public/styles/plub-manga.json',import.meta.url),'utf8'));
const opacity={background:'background-opacity',fill:'fill-opacity',line:'line-opacity',symbol:'text-opacity'};
function harness(failures=0){
 const events=new Map(),mediaEvents=new Map(),mapEvents=new Map(),timers=new Map(),writes=[];
 let now=0,serial=0,fetches=0,button;
 const listen=(registry,k,f)=>registry.set(k,[...(registry.get(k)||[]),f]);
 const emit=(registry,k,event={})=>(registry.get(k)||[]).forEach(f=>f(event));
 const element=tag=>{
  if(tag==='canvas')return{getContext:()=>({beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},getImageData:()=>({width:8,height:8,data:new Uint8Array(256)})})};
  const node={attrs:{},disabled:false,append(){},setAttribute(k,v){this.attrs[k]=v}};
  if(tag==='button')button=node;return node;
 };
 const document={hidden:false,createElement:element,addEventListener:(k,f)=>listen(events,k,f)};
 const media={matches:false,addEventListener:(k,f)=>listen(mediaEvents,k,f)};
 const base=[{id:'base',type:'background'},{id:'water',type:'fill',source:'openmaptiles',layout:{visibility:'none'}},{id:'pins',type:'symbol',source:'places'},{id:'route',type:'line',source:'route'}];
 let layers=structuredClone(base);const images=new Set();
 const map={getStyle:()=>({layers}),getLayer:id=>layers.find(l=>l.id===id),
  hasImage:id=>images.has(id),addImage:id=>images.add(id),
  addLayer:l=>layers.push(structuredClone(l)),
  setLayoutProperty(id,k,v){const l=this.getLayer(id);(l.layout??={})[k]=v},
  setPaintProperty(id,k,v){const l=this.getLayer(id);(l.paint??={})[k]=v;writes.push({id,k,v})},
  isStyleLoaded:()=>false,on:(k,f)=>listen(mapEvents,k,f),once:(k,f)=>listen(mapEvents,k,f),addControl:c=>c.onAdd()};
 const sandbox={document,matchMedia:()=>media,console:{warn(){}},AbortSignal,
  fetch:async()=>{const ok=++fetches>failures;return{ok,status:ok?200:503,json:async()=>structuredClone(design)}},
  setTimeout(f,delay){const id=++serial;timers.set(id,{f,at:now+delay,delay});return id},clearTimeout:id=>timers.delete(id)};
 runInNewContext(source,sandbox);const lens=sandbox.MangaLens;lens.attach(map);
 function advance(ms){const end=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].f()}now=end}
 const visible=id=>map.getLayer(id).layout?.visibility||'visible';
 const targets=()=>{for(const l of design.layers){const key=opacity[l.type],target=typeof l.paint?.[key]==='number'?l.paint[key]:1;assert.equal(map.getLayer(l.id).paint[key],target,l.id+' reaches its design opacity')}};
 const snapWrites=()=>{assert.ok(writes.length);assert.ok(writes.filter(w=>w.k.endsWith('-transition')).every(w=>w.v.duration===0),'snap writes override every per-paint transition')};
 return{lens,map,document,media,timers,writes,advance,visible,targets,snapWrites,get button(){return button},get fetches(){return fetches},
  event:(k,e={target:{closest:()=>false}})=>emit(events,k,e),reduce:()=>{media.matches=true;emit(mediaEvents,'change')},reload:()=>emit(mapEvents,'style.load')};
}
const h=harness();assert.equal(await h.lens.ready(),true);
assert.equal(h.visible('water'),'none');assert.equal(h.visible('base'),'visible');
await h.lens.set(true);assert.equal(h.button.attrs['aria-pressed'],'true');assert.equal(h.button.disabled,false);
assert.ok(h.timers.size>0);assert.ok([...h.timers.values()].every(t=>t.delay<=240),'all work is bounded by240ms');
h.advance(140);h.targets(); // Includes manga-town: a missing wash group leaves it transparent.
h.advance(100);assert.equal(h.timers.size,0);h.targets();
for(const id of ['base','water'])assert.equal(h.visible(id),'none');
for(const id of ['pins','route'])assert.equal(h.visible(id),'visible');
await h.lens.set(false);h.advance(240);assert.equal(h.visible('base'),'visible');assert.equal(h.visible('water'),'none');
for(const l of design.layers)assert.equal(h.visible(l.id),'none');
// Each manual input must terminate queued work, settle targets, and zero transitions.
for(const event of ['pointerdown','wheel','keydown','visibilitychange','reduce']){
 const x=harness();await x.lens.ready();await x.lens.set(true);assert.ok(x.timers.size);
 x.writes.length=0;
 if(event==='reduce')x.reduce();else{if(event==='visibilitychange')x.document.hidden=true;x.event(event)}
 assert.equal(x.timers.size,0,event+' cancels pending work');x.targets();x.snapWrites();
}
// The toggle's own pointer event can proceed into its deliberate transition.
await h.lens.set(true);h.event('pointerdown',{target:{closest:()=>true}});assert.ok(h.timers.size);h.lens.settle();assert.equal(h.timers.size,0);
for(const mode of ['held','reduced','hidden']){
 const x=harness();await x.lens.ready();x.writes.length=0;
 if(mode==='held')x.lens.hold(true);else{if(mode==='reduced')x.media.matches=true;else x.document.hidden=true;await x.lens.set(true)}
 assert.equal(x.timers.size,0);x.targets();x.snapWrites();
 assert.equal(x.button.attrs['aria-pressed'],'true');assert.equal(x.button.disabled,mode==='held');
}
// Snapshot style reload while on must retain original visibility, even with recycled layers.
h.lens.hold(true);h.reload();h.targets();assert.equal(h.visible('base'),'none');h.lens.hold(false);
await h.lens.set(false);h.advance(240);assert.equal(h.visible('base'),'visible');assert.equal(h.visible('water'),'none');
// Failed fetches stay actionable and truthful; both public retry paths clear the error.
for(const retry of ['ready','set']){
 const x=harness(1);assert.equal(await x.lens.set(true),false);assert.equal(x.lens.active,false);
 assert.equal(x.button.attrs['aria-pressed'],'false');assert.equal(x.button.disabled,false);assert.match(x.button.title,/unavailable/);
 if(retry==='ready'){assert.equal(await x.lens.ready(),true);await x.lens.set(true)}else await x.lens.set(true);
 x.advance(240);assert.equal(x.fetches,2);assert.equal(x.lens.active,true);assert.equal(x.button.attrs['aria-pressed'],'true');assert.doesNotMatch(x.button.title,/unavailable/);x.targets();
}
console.log('Manga runtime: all style opacity targets, bounded timers, input/visibility/reduced-motion cancellation, instant transitions, preserved base/app layers, reload restoration and fetch-failure retries pass.');
