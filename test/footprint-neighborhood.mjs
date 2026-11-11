import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import vm from'node:vm';
const code=await readFile(new URL('../public/neighborhood-palette.js',import.meta.url),'utf8'),
 hoods=JSON.parse(await readFile(new URL('../public/data/hoods.json',import.meta.url))),
 areas=JSON.parse(await readFile(new URL('../public/data/street-areas.json',import.meta.url))),
 proof=JSON.parse(await readFile(new URL('../docs/stroll-2026-11-07/zoom-mood-provenance.json',import.meta.url)));
assert(Buffer.byteLength(code)<=16000,'Mood module stays a small overlay');
const byCombination=new Map(Object.entries(proof.combinations).map(([id,cols])=>[Number(id),cols]));
const window={MangaLens:{active:true}},listeners=new Map(),sources=new Map(),images=new Map(),layers=[{id:'manga-ground'},{id:'manga-park'},{id:'manga-building'},{id:'manga-building-tone'},{id:'manga-road-major-core'},{id:'places'}],counts={source:0,layer:0,layout:0,image:0};
const context=new Proxy({},{get:(o,k)=>k==='getImageData'?()=>({width:64,height:64,data:new Uint8ClampedArray(16384)}):o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const map={on(n,f){listeners.set(n,[...(listeners.get(n)||[]),f])},getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.get(id),hasImage:id=>images.has(id),addImage(id,data){counts.image++;images.set(id,data)},addSource(id,data){counts.source++;sources.set(id,data)},addLayer(l,before){counts.layer++;layers.splice(layers.findIndex(x=>x.id===before),0,l)},getLayoutProperty:(id,k)=>map.getLayer(id).layout[k],setLayoutProperty(id,k,v){counts.layout++;map.getLayer(id).layout[k]=v},getStyle:()=>({layers})};
vm.runInNewContext(code,{window,document:{createElement:()=>({getContext:()=>context})},fetch:async()=>({json:async()=>areas})});const api=window.NeighborhoodPalette;
api.attach(map);await new Promise(r=>setTimeout(r,20));
function validate(list){assert.equal(list.length,12,'twelve neighbourhood grounds');
 for(const a of list){
  const s=areas.areas.find(s=>s.id===a.id);assert(s,'the area exists in the shipped list');
  assert.equal(a.x,s.anchor.x,'Anchor longitude must be existing source');assert.equal(a.y,s.anchor.y,'Anchor latitude must be existing source');
  assert.equal(a.anchorID,s.anchor.sourceID);assert.equal(a.radiusM,800);
  const h=hoods.hoods.find(h=>h.slug===a.id);
  if(h){assert.equal(a.mood,h.for,'Existing authored mood only');assert.equal(a.x,h.anchor.x);assert.equal(a.y,h.anchor.y);assert.equal(a.anchorID,h.anchor.id)}
  else if(s.kind==='cluster')assert.match(a.mood,/in 800 m/,'A density area states the catalogue count, never an invented mood');
  else assert(a.mood,'A venue area keeps its own named mood');
  for(const[name,hex]of a.colors)assert(byCombination.get(a.chord).some(c=>c.name===name&&c.hex===hex),'Exact catalogue chord only');
 }}
validate(api.areas);
assert.throws(()=>validate(api.areas.map((a,i)=>i? a:{...a,x:a.x+.01})),/Anchor longitude/,'False anchor negative control must fail');
assert.throws(()=>validate(api.areas.map((a,i)=>i? a:{...a,radiusM:1000})),/800/,'False radius negative control must fail');
assert.equal(api.catalogue.sha256,proof.sha256);
for(const a of api.areas)if(proof.combinations[a.chord])for(const c of a.colors)assert(proof.combinations[a.chord].some(p=>p.hex===c[1]),`combination ${a.chord} keeps only proved colours`);
assert.match(api.legend(),/not district boundaries/);assert.match(api.legend(),/unassigned/);assert.match(api.legend(),/^<details/);
assert.match(api.legend(),/cafe density/,'The legend says which areas are density-chosen');
for(const f of api.features){assert.equal(f.properties.role,'editorial-story-frame');const ring=f.geometry.coordinates[0];assert.deepEqual(ring[0],ring.at(-1));for(const[x,y]of ring){const rad=Math.PI/180,lat=f.properties.anchorY*rad,dy=(y-f.properties.anchorY)*rad,dx=(x-f.properties.anchorX)*rad,a=Math.sin(dy/2)**2+Math.cos(lat)*Math.cos(y*rad)*Math.sin(dx/2)**2;assert(Math.abs(6371008.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))-800)<.001,'Narrative circle radius is exactly800m geodesic')}}
assert.equal(sources.size,1);assert.equal(images.size,12,'one tone per neighbourhood');assert.equal(layers[1].id,'manga-neighborhood-ground','Mood ground must stay below existing roads/buildings and above paper');assert.equal(map.getLayoutProperty('manga-neighborhood-ground','visibility'),'visible');
const before={...counts};for(let i=0;i<10;i++)for(const f of listeners.get('idle'))f();api.attach(map);assert.deepEqual(counts,before,'Idle/repeated attach cannot create source/render churn');
window.MangaLens.active=false;api.sync();assert.equal(map.getLayoutProperty('manga-neighborhood-ground','visibility'),'none');window.MangaLens.active=true;api.sync();assert.equal(map.getLayoutProperty('manga-neighborhood-ground','visibility'),'visible');assert.deepEqual(layers.filter(l=>l.id!=='manga-neighborhood-ground').map(l=>l.id),['manga-ground','manga-park','manga-building','manga-building-tone','manga-road-major-core','places'],'Earned layers retained');
console.log('Narrative anchor/radius provenance for twelve areas, proved Wada catalogue chords, authored moods kept, density areas stating the catalogue count, false-anchor/radius controls, geodesic circles, source layering and idle/lens lifecycle pass.');
