// Palette320 marks contained matching place records, never a whole source-feature ID.
(() => {
 const chord=[{kind:'cafe',name:'Café',color:'#96d1aa'},{kind:'coworking',name:'Co-work',color:'#f5ecc2'},{kind:'library',name:'Library',color:'#819238'},{kind:'restaurant',name:'Food',color:'#a5c8d1'}];
 const source='palette-footprints',layer='manga-place-footprints',empty=()=>({type:'FeatureCollection',features:[]});
 let map,keyBox,grid=FootprintModel.index([]),timer,last='',current=empty(),streetStates=new Set(),retained=null,retainedGrid=null,retainedData=null,sourceState='loading',sourcePromise=null;const swatches=new Map();
 function tile(mask){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d'),colors=chord.filter((_,i)=>mask&(1<<i)).map(c=>c.color);
  ctx.fillStyle=colors[0]||'#e7e3dd';ctx.fillRect(0,0,32,32);
  if(colors.length>1){for(let y=0;y<32;y++)for(let x=0;x<32;x++){ctx.fillStyle=colors[Math.floor((x+y)/4)%colors.length];ctx.fillRect(x,y,1,1)}}
  else if(mask){ctx.strokeStyle='rgba(43,35,32,.18)';ctx.fillStyle='rgba(43,35,32,.18)';ctx.lineWidth=.7;ctx.beginPath();
   if(mask===2){for(let y=4;y<32;y+=8)for(let x=4;x<32;x+=8){ctx.moveTo(x+1,y);ctx.arc(x,y,.8,0,Math.PI*2)}ctx.fill()}
   else{for(let n=-32;n<64;n+=8){if(mask===1){ctx.moveTo(n,0);ctx.lineTo(n+32,32)}else if(mask===4){ctx.moveTo(0,n);ctx.lineTo(32,n)}else{ctx.moveTo(n,0);ctx.lineTo(n,32)}}ctx.stroke()}
  }else{ctx.fillStyle='rgba(43,35,32,.12)';for(let y=4;y<32;y+=8)for(let x=4;x<32;x+=8){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill()}}
  return {image:ctx.getImageData(0,0,32,32),url:canvas.toDataURL()};
 }
 function install(){
  if(!map?.getLayer('manga-building-tone'))return false;
  for(let mask=0;mask<16;mask++){const id=mask?'palette-mask-'+mask:'palette-volume-neutral';if(!map.hasImage(id)){const t=tile(mask);map.addImage(id,t.image);swatches.set(mask,t.url)}}
  if(!map.getSource(source))map.addSource(source,{type:'geojson',tolerance:0,data:empty()});
  if(!map.getLayer(layer))map.addLayer({id:layer,type:'fill',source,layout:{visibility:'none'},paint:{'fill-pattern':['concat','palette-mask-',['to-string',['get','mask']]],'fill-opacity':.92,'fill-opacity-transition':{duration:0,delay:0}}},'manga-building-tone');
  return true;
 }
 function isStreet(){return !!(window.StreetWorld?.active&&document.querySelector('.street-panel:not([hidden])'))}
 function sync(){
  clearTimeout(timer);
  const on=!!window.MangaLens?.active,visibility=on?'visible':'none';
  if(keyBox)keyBox.hidden=!(on||window.state?.clubMode||document.body?.classList.contains('club-mode'));
  if(!install())return;
  if(map.getLayoutProperty(layer,'visibility')!==visibility)map.setLayoutProperty(layer,'visibility',visibility);
  if(on)timer=setTimeout(update,80);
 }
 function update(){
  if(!map?.getLayer(layer)||!window.MangaLens?.active)return;
  const street=isStreet(),raw=street?map.getSource('street-buildings')?._data?.features:retained||map.querySourceFeatures('openmaptiles',{sourceLayer:'building'});
  if(!Array.isArray(raw))return;
  // Pinned unchanged OSM components are independent of MVT zoom availability/LOD.
  // Reclassify on selected-place changes only; map idle must not create a render loop.
  if(!street&&retained&&retainedGrid!==grid){retainedData=FootprintModel.classify(retained,grid);retainedGrid=grid}
  const data=!street&&retained?retainedData:FootprintModel.classify(raw,grid),signature=!street&&retained?data:JSON.stringify([street,data]);
  const changed=signature!==last;
  if(changed){map.getSource(source).setData(data);current=data;last=signature}
  const before=street?'street-building-edge':'manga-building-tone',layers=map.getStyle().layers,position=layers.findIndex(l=>l.id===layer);if(map.getLayer(before)&&layers[position+1]?.id!==before)map.moveLayer(layer,before);
  // The pinned street corpus's rendered-height features each have one source Polygon.
  // Never tint a whole multipart native volume from a match in one disconnected part.
  if(changed&&map.getLayer('street-building-height')){
   for(const id of streetStates)map.removeFeatureState({source:'street-buildings',id});streetStates=new Set();
   if(street){const eligible=new Set(raw.filter(f=>f.properties.render3D&&f.geometry.type==='MultiPolygon'&&f.geometry.coordinates.length===1).map(f=>f.id));
    for(const f of data.features)if(eligible.has(f.properties.tileFeatureID)){const id=f.properties.tileFeatureID;map.setFeatureState({source:'street-buildings',id},{paletteMask:f.properties.mask});streetStates.add(id)}
   }
   map.setPaintProperty('street-building-height','fill-extrusion-pattern',['case',['>', ['coalesce',['feature-state','paletteMask'],0],0],['concat','palette-mask-',['to-string',['feature-state','paletteMask']]],'palette-volume-neutral']);
  }
 }
 function refresh(places){grid=FootprintModel.index(places);last='';sync()}
 function sourceNotice(){return sourceState==='available'?'Footprints retain unchanged OpenStreetMap source polygons from the 24 October 2026 snapshot across zoom levels.':sourceState==='loading'?'Retained footprint source is loading. Currently loaded map polygons remain available.':'Retained footprint source is unavailable. Only currently loaded map polygons can be colored; city-scale colors may be absent. <button type="button" class="linkish" data-retry-footprints>Retry footprint source</button>'}
 function paintSourceState(){for(const el of document.querySelectorAll?.('[data-footprint-source-state]')||[])el.innerHTML=sourceNotice()}
 function loadRetained(){
  if(retained||sourcePromise)return sourcePromise;
  if(typeof fetch!=='function'){sourceState='unavailable';paintSourceState();return null}
  sourceState='loading';paintSourceState();
  // Exactly one in-flight request. A failure waits for the reader's explicit retry.
  sourcePromise=Promise.resolve().then(()=>fetch('/data/footprint-colors.json')).then(r=>{if(!r.ok)throw new Error('Footprint source unavailable');return r.json()}).then(data=>{
   if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Invalid footprint source');
   retained=data.features;retainedGrid=null;sourceState='available';sync();
  }).catch(()=>{sourceState='unavailable'}).finally(()=>{sourcePromise=null;paintSourceState()});
  return sourcePromise;
 }
 function legend(){return `<section class="building-key"><h2>Manga building colors</h2><ul>${chord.map((c,i)=>`<li><span class="footprint-swatch" style="background-image:url('${swatches.get(1<<i)||''}');background-color:${c.color}">${PlaceTools.symbol(c.kind)}</span>${c.name}</li>`).join('')}</ul><p>Colors mark matching place pins strictly inside a mapped footprint, not the use of every room or floor. Stripes mean several categories; neutral means no confirmed match. Points outside or on an uncertain edge are left unassigned.</p><p class="src">Cobalt Green from Palette combination 202. Sulpher Yellow, Oil Green and Light Glaucous Blue from combination 320. Credited digital conversions from Palette; textures and category symbols also distinguish the groups without hue. No nearby building is guessed. Tiny footprints may be smaller than a pixel at city scale.</p><p class="src" data-footprint-source-state role="status" aria-live="polite">${sourceNotice()}</p></section>`}
 function attach(m){
  map=m;
  loadRetained();
  document.addEventListener?.('click',e=>{if(e.target.closest?.('[data-retry-footprints]'))loadRetained()});
  map.on('style.load',()=>{last='';sync()});map.on('moveend',sync);map.on('idle',sync);
  map.on('sourcedata',e=>{if(['openmaptiles','street-buildings'].includes(e.sourceId))sync()});
  map.addControl({onAdd(){const box=document.createElement('div');box.className='maplibregl-ctrl footprint-key-control';keyBox=box;box.hidden=true;const b=document.createElement('button');b.type='button';b.className='footprint-key';b.title='Open the map key';b.setAttribute('aria-label','Map key');b.innerHTML=chord.map(c=>`<span class="footprint-swatch" style="background-color:${c.color}">${PlaceTools.symbol(c.kind)}</span>`).join('')+`<span class="footprint-club-symbol" aria-hidden="true">${PlaceTools.symbol('cannabis')}</span><span>Key</span>`;b.onclick=()=>Atlas.key();box.append(b);return box},onRemove(){}},'bottom-left');
  sync();
 }
 window.FootprintPalette={attach,refresh,sync,legend,chord,retry:loadRetained,get sourceState(){return sourceState},get features(){return current.features}};
})();
