// A reference sketch on the existing map, never a second canvas or an inferred city.
(() => {
 const M=StreetModel, empty=()=>({type:'FeatureCollection',features:[]});
 let world,index,areaData,promise,panel,area,position,snapshot,installed=false,active=false,suspended=false,playing=false,timer=null,revision=0,view='overview',lastArea=null,lastRoad=null,desiredPadding=null,pendingReflow=false,cameraRevision=0,blocked=false,stroll=null,strollProgress=0,strollChoices=[],look=0;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const get=async path=>{const r=await fetch(path,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Street sketch data is unavailable. Your map and notebook still work.');return r.json()};
 const current=t=>t===revision&&panel?.isConnected&&!panel.hidden;
 function load(){return promise||(promise=Promise.all([get('data/street-world.json'),Promise.resolve(window.MangaLens?.ready?.())]).then(([w,lens])=>{if(!lens)throw Error('Manga drawing is unavailable. Your map and notebook still work. Retry the street sketch.');world=w;return w}).catch(e=>{promise=null;throw e}))}
 // One file per neighbourhood. The index is small; a reader only pays for the area they walk.
 const areaFiles=new Map();
 function areaFile(id){if(!areaFiles.has(id)){const p=get('data/street-world/'+id+'.json');areaFiles.set(id,p);p.catch(()=>areaFiles.delete(id))}return areaFiles.get(id)}
 function createPanel(){
  if(!panel){panel=document.createElement('section');panel.className='street-panel';panel.setAttribute('aria-label','Street sketch controls');document.body.append(panel);panel.addEventListener('toggle',e=>{if(e.target.open)pause()},true);panel.addEventListener('focusin',e=>{if(playing&&!e.target.matches('[data-street-play]'))pause()});panel.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-street-play]'))pause()});new ResizeObserver(reflow).observe(panel)}
  panel.hidden=false;return panel;
 }
 function pause(){
  ++cameraRevision;playing=false;clearTimeout(timer);timer=null;if(active)map.stop?.();
  const b=panel?.querySelector('[data-street-play]');if(b){b.textContent='Play';b.setAttribute('aria-pressed','false')}
 }
 function suspend(){++revision;pause();if(panel)panel.hidden=true;if(active&&!suspended){suspended=true;paint(false);map.setMaxPitch(snapshot.maxPitch);map.setMaxZoom(snapshot.maxZoom);map.jumpTo({pitch:snapshot.pitch,padding:{top:0,left:0,right:0,bottom:0}})}}
 function install(){
  if(installed)return;
  const before=map.getLayer('pins-city')?'pins-city':undefined;
  const c=document.createElement('canvas');c.width=c.height=12;const g=c.getContext('2d');g.fillStyle='#ede9e3';g.fillRect(0,0,12,12);g.strokeStyle='#b6b1aa';g.lineWidth=.7;g.beginPath();for(let x=-12;x<24;x+=6){g.moveTo(x,0);g.lineTo(x+12,12)}g.stroke();
  map.addImage('street-ink-tone',g.getImageData(0,0,12,12));
  const t=document.createElement('canvas');t.width=t.height=8;const h=t.getContext('2d');h.fillStyle='#e7e3dd';h.fillRect(0,0,8,8);h.fillStyle='#cbc5bf';for(const [x,y] of [[1,1],[5,5],[2,6],[6,2]]){h.beginPath();h.arc(x,y,.7,0,Math.PI*2);h.fill()};
  map.addImage('street-screentone-3d',h.getImageData(0,0,8,8));
  map.addSource('street-buildings',{type:'geojson',data:empty()});
  map.addSource('street-selected-line',{type:'geojson',data:empty()});
  map.addSource('street-stroll-line',{type:'geojson',data:empty()});
  map.addSource('street-eye',{type:'geojson',data:empty()});
  map.addLayer({id:'street-building-flat',type:'fill',source:'street-buildings',layout:{visibility:'none'},paint:{'fill-pattern':'street-ink-tone','fill-opacity':.85}},before);
  map.addLayer({id:'street-building-edge',type:'line',source:'street-buildings',layout:{visibility:'none'},paint:{'line-color':'#514a47','line-width':1}},before);
  map.addLayer({id:'street-building-height',type:'fill-extrusion',source:'street-buildings',filter:['==',['get','render3D'],true],layout:{visibility:'none'},paint:{'fill-extrusion-color':'#e7e3dd','fill-extrusion-pattern':'street-screentone-3d','fill-extrusion-height':['get','heightM'],'fill-extrusion-base':['coalesce',['get','minHeightM'],0],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},before);
  map.addLayer({id:'street-stroll-line',type:'line',source:'street-stroll-line',layout:{visibility:'none'},paint:{'line-color':'#34454c','line-width':5,'line-opacity':.4}},before);
  map.addLayer({id:'street-selected-line',type:'line',source:'street-selected-line',layout:{visibility:'none'},paint:{'line-color':'#34454c','line-width':3,'line-dasharray':[2,1]}},before);
  map.addLayer({id:'street-eye',type:'circle',source:'street-eye',layout:{visibility:'none'},paint:{'circle-radius':5,'circle-color':'#34454c','circle-stroke-color':'#fff','circle-stroke-width':2}});
  const canvas=map.getCanvas();canvas.addEventListener('pointerdown',pause);map.on('movestart',e=>{if(e.originalEvent)pause()});canvas.addEventListener('wheel',pause,{passive:true});canvas.addEventListener('keydown',keyboard,true);
  installed=true;
 }
 function paint(on){
  // The street sketch is always drawn in line and tone; the lens holds it open while the sketch runs.
  window.MangaLens?.hold(on);
  for(const id of ['street-building-flat','street-building-edge','street-building-height','street-selected-line','street-stroll-line','street-eye'])map.setLayoutProperty(id,'visibility',on?'visible':'none');
 }
 const point=()=>M.point(index.roads.get(position.streetID),position.distance);
 function draw(){
  const r=index.roads.get(position.streetID),p=point();
  if(lastArea!==area.id){map.getSource('street-buildings').setData(areaData.buildings);lastArea=area.id}
  if(lastRoad!==r.id){map.getSource('street-selected-line').setData({type:'FeatureCollection',features:[{type:'Feature',id:r.id,geometry:r.geometry,properties:r.properties}]});lastRoad=r.id}
  const routePoints=stroll?.segments.flatMap((edge,i)=>{const r=index.roads.get(edge.streetID);return i?[M.point(r,edge.to).coordinates]:[M.point(r,edge.from).coordinates,M.point(r,edge.to).coordinates]});
  map.getSource('street-stroll-line').setData(routePoints?.length>1?{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:routePoints}}]}:empty());
  window.FootprintPalette?.sync();
  map.getSource('street-eye').setData({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:p.coordinates},properties:{}}]});
 }
 function layoutPadding(){return {top:30,left:35,right:65,bottom:isPhone()?Math.min(panel.offsetHeight+25,innerHeight*.45):35}}
 function reflow(){
  if(!active||!panel||panel.hidden)return;
  const next=layoutPadding();if(desiredPadding&&Object.keys(next).every(k=>Math.abs(next[k]-desiredPadding[k])<1))return;
  desiredPadding=next;
  if(map.isMoving()){
   if(pendingReflow)return;pendingReflow=true;const token=revision;
   map.once('moveend',()=>{pendingReflow=false;if(active&&!panel.hidden&&token===revision)map.setPadding(desiredPadding)});
  }else map.setPadding(next);
 }
 function camera(){
  if(!active||!position)return;
  const p=point(),r=index.roads.get(position.streetID),direction=position.direction||1;
  const ahead=M.point(r,position.distance+direction*.5).coordinates;
  const bearing=(M.dist(p.coordinates,ahead)>.01?M.bearing(p.coordinates,ahead):p.bearing+(direction<0?180:0))+look;
  const padding=layoutPadding();desiredPadding=padding;
  // A bounded artistic perspective keeps actual nearby pins in view, even at a source endpoint.
  const token=++cameraRevision;
  map.easeTo({center:p.coordinates,bearing,pitch:view==='walk'?66:55,zoom:view==='walk'?18.25:17.3,padding,duration:reduce.matches||document.hidden?0:240,essential:false});
  if(view==='walk')requestAnimationFrame(()=>{
   if(token!==cameraRevision)return;
   const ready=()=>requestAnimationFrame(()=>{if(!map.areTilesLoaded())map.once('idle',()=>inspectView(token));else inspectView(token)});
   map.isMoving()?map.once('moveend',ready):ready();
  });
 }
 function inspectView(token){
  if(token!==cameraRevision||!active||panel.hidden||document.hidden||view!=='walk'||map.isMoving())return;
  const box=map.getContainer().getBoundingClientRect(),instrument=panel.getBoundingClientRect();
  const bottom=isPhone()?Math.min(box.height-20,instrument.top-box.top-10):box.height-30;
  if(bottom<100)return;
  let hits=0,total=0;
  for(let x=1;x<=5;x++)for(let y=1;y<=4;y++){
   const px=30+(box.width-110)*x/6,py=25+(bottom-25)*y/5;
   const screenX=box.left+px,screenY=box.top+py;
   if(screenX>=instrument.left&&screenX<=instrument.right&&screenY>=instrument.top&&screenY<=instrument.bottom)continue;
   total++;if(map.queryRenderedFeatures([px,py],{layers:['street-building-height']}).length)hits++;
  }
  if(total&&hits/total>.6){
   blocked=true;view='overview';pause();details();
   map.easeTo({center:point().coordinates,bearing:map.getBearing(),pitch:40,zoom:16.8,padding:layoutPadding(),duration:reduce.matches?0:200});
  }
 }

 function roadName(road){return road.properties.name||road.properties.nameTh||(['footway','path','pedestrian'].includes(road.properties.highway)?'Mapped footpath':'Unnamed lane')}
 const directionName=b=>['N','NE','E','SE','S','SW','W','NW'][Math.round((b+360)%360/45)%8];
 function nearby(){const p=point().coordinates;return state.places.filter(p=>['cafe','coworking','library'].includes(p.k)&&state.kinds.has(p.k)).map(v=>({p:v,metres:M.dist(p,[v.x,v.y])})).filter(v=>v.metres<=300).sort((a,b)=>a.metres-b.metres)}
 function details(){
  if(!active||!panel||panel.hidden)return;
  const road=index.roads.get(position.streetID),near=nearby(),first=near[0],host=panel.querySelector('.street-nearby');
  panel.querySelector('.street-view-notice').textContent=blocked?'A mapped building blocks that angle · using a wider overview.':'';
  panel.querySelector('[data-street-source]').href='https://www.openstreetmap.org/way/'+road.properties.sourceID.slice(1);
  panel.querySelector('.street-status').textContent=`${roadName(road)} · facing ${directionName(point().bearing+(position.direction<0?180:0)+look)} · ${Math.round(position.distance)} m along source line.`;
  panel.querySelector('[data-street-view]').textContent=view==='walk'?'Overview':'Low view';
  const row=({p,metres})=>`<button class="street-place-name" data-street-place="${esc(p.id)}">${PlaceTools.symbol(p.k)} ${PlaceTools.name(p.n)}${p.branch?' · '+esc(p.branch):''}</button><div class="street-cafe-actions"><span class="src">${Math.round(metres)} m straight line</span><a href="${esc(JourneyModel.directions(p,null))}" target="_blank" rel="noopener">Directions ↗</a><button data-street-place="${esc(p.id)}">Notes &amp; place</button></div>`;
  host.innerHTML=first?row(first)+(near.length>1?`<details><summary>${near.length-1} more nearby</summary>${near.slice(1,8).map(row).join('')}</details>`:''):'<p class="src">No selected work spots within 300 m. Step along the mapped street or choose another street.</p>';
  host.querySelectorAll('[data-street-place]').forEach(b=>b.onclick=()=>{pause();panel.hidden=true;select(state.byId.get(b.dataset.streetPlace),true)});
  strollDetails();
  const branches=M.branches(index,position,new Set(area.streetIDs)),box=panel.querySelector('.street-junction');
  box.hidden=!branches.length;
  box.innerHTML=branches.length?`<details><summary>Junction · ${branches.length} source directions</summary>${branches.map((v,i)=>`<button data-street-branch="${i}">${esc(roadName(index.roads.get(v.streetID)))} · ${directionName(v.bearing)}</button>`).join('')}</details>`:'';
  box.querySelectorAll('[data-street-branch]').forEach(b=>b.onclick=()=>{pause();stroll=null;look=0;position={...branches[+b.dataset.streetBranch]};draw();details();camera()});
 }
 function turn(sign){
  const choices=M.branches(index,position,new Set(area.streetIDs)),heading=point().bearing+(position.direction<0?180:0)+look;
  const delta=b=>((b-heading+540)%360)-180;
  const choice=choices.filter(v=>sign*delta(v.bearing)>20&&sign*delta(v.bearing)<170).sort((a,b)=>Math.abs(delta(a.bearing))-Math.abs(delta(b.bearing)))[0];
  if(choice){stroll=null;position={...choice};look=0;draw()}else look+=sign*35;
  details();camera();
 }
 function suggestions(){
  const origin=point().coordinates,ids=new Set(area.placeIDs);
  const places=state.places.filter(p=>p.k==='cafe'&&ids.has(p.id)&&state.kinds.has(p.k)).sort((a,b)=>M.dist(origin,[a.x,a.y])-M.dist(origin,[b.x,b.y])).slice(0,24);
  return M.routes(index,area,position,places);
 }
 function strollDetails(){
  const host=panel.querySelector('.street-stroll');if(!host)return;
  if(stroll){
   const done=strollProgress>=stroll.length-.01;
   let along=-strollProgress,nextLane='';for(const edge of stroll.segments){if(along>=0&&edge.streetID!==position.streetID){nextLane=` Next: ${roadName(index.roads.get(edge.streetID))} in ${Math.round(along)} m.`;break}along+=edge.length}
   host.innerHTML=`<p class="street-status">${done?'Source-line end near':'Toward'} ${esc(stroll.place.n)} · ${Math.round(Math.max(0,stroll.length-strollProgress))} m of mapped lanes left · pin ${Math.round(stroll.offset)} m straight line from end. Entrance unverified.${esc(nextLane)}</p><div class="street-cafe-actions"><button data-stroll-end>Free stroll</button><a href="${esc(JourneyModel.directions(stroll.place,null))}" target="_blank" rel="noopener">Directions ↗</a><button data-stroll-place>Place &amp; notes</button></div>`;
   host.querySelector('[data-stroll-end]').onclick=()=>{pause();stroll=null;draw();details()};
   host.querySelector('[data-stroll-place]').onclick=()=>{pause();panel.hidden=true;select(stroll.place,true)};
  }else{
   host.innerHTML='<details><summary>Choose a café stroll · source lanes</summary><div class="street-stroll-options"></div></details>';
   host.querySelector('details').ontoggle=e=>{if(!e.target.open)return;pause();strollChoices=suggestions();const box=host.querySelector('.street-stroll-options');
    box.innerHTML=strollChoices.length?strollChoices.map((r,i)=>`<button data-stroll="${i}">${esc(r.place.n)} · ${Math.round(r.length)} m mapped lanes · pin ${Math.round(r.offset)} m from end</button>`).join(''):'<p class="src">No connected café approach within this source graph. Choose another street or area.</p>';
    box.querySelectorAll('[data-stroll]').forEach(b=>b.onclick=()=>{pause();stroll=strollChoices[+b.dataset.stroll];strollProgress=0;look=0;position=M.advance(stroll,0,0).position;draw();details();camera()});
   };
  }
 }
 function render(){
  const roads=area.streetIDs.map(id=>index.roads.get(id)).filter(Boolean).sort((a,b)=>Number(b.properties.cafeIDs.length>0)-Number(a.properties.cafeIDs.length>0)||roadName(a).localeCompare(roadName(b)));
  const known=area.counts?.heightVolumes||0;
  panel.innerHTML=`<header><h2 tabindex="-1">Neighbourhood stroll</h2><button class="street-close" aria-label="Return to 2D map">×</button></header><p class="street-view-notice" role="status"></p><p class="street-coverage">${esc(area.name)} · ${known?known+' mapped-height volumes; other footprints flat':'0 mapped heights · flat outlines'}</p><div class="street-nearby"></div><div class="street-controls" aria-label="Source-lane movement"><button data-street-walkthrough style="border-color:var(--ink);font-weight:600;background:var(--wash)">Walk 3D World ↗</button><button data-street-turn="-1" aria-label="Look or choose source direction left">↶</button><button data-street-step="-8" aria-label="Step back 8 metres on source street">← 8 m</button><button data-street-play aria-pressed="false" ${reduce.matches?'disabled':''}>Play</button><button data-street-step="8" aria-label="Step forward 8 metres on source street">8 m →</button><button data-street-turn="1" aria-label="Look or choose source direction right">↷</button><button data-street-view>${view==='walk'?'Overview':'Low view'}</button></div><p class="street-status" role="status"></p><div class="street-junction"></div><div class="street-stroll"></div><details class="street-setup"><summary>Change area / street</summary><label>Area<select data-street-area>${world.areas.map(a=>`<option value="${esc(a.id)}" ${a.id===area.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label><label>Street<select data-street-road aria-label="Mapped street">${roads.map(r=>`<option value="${esc(r.id)}" ${r.id===position.streetID?'selected':''}>${esc(roadName(r))}${r.properties.cafeIDs.length?' · '+r.properties.cafeIDs.length+' café pins':''}</option>`).join('')}</select></label></details><details><summary>Reference sketch · access &amp; source</summary><p class="src">Virtual exploration of mapped streets, not verified pedestrian routes or café entrances. Access and roadside conditions need checking. W/A/S/D or arrows on the map; 8 m steps pause at shared source junctions. Left/right looks along a lane or chooses a mapped turn at its junction. A chosen café stroll follows connected source lanes; it ends near the pin, never at an inferred entrance. Unknown heights stay flat.</p><p class="src">${esc(area.name)}: ${known} source-height volumes / ${area.buildingIDs.length} footprints. Schematic flat ground; Low view is an artistic perspective, not a surveyed street photograph. Buildings/streets: OSM ${esc(world.manifest.asOf.slice(0,10))}, <a href="${esc(world.manifest.licenseURL)}" target="_blank" rel="noopener">ODbL</a>. Source tags may be stale. <a data-street-source href="https://www.openstreetmap.org/way/${esc(index.roads.get(position.streetID).properties.sourceID.slice(1))}" target="_blank" rel="noopener">Current street source ↗</a>. Café pins remain the current PL;UB catalogue.</p></details>`;
  panel.querySelector('.street-close').onclick=exit;
  panel.querySelector('[data-street-walkthrough]').onclick=()=>{pause();openWalkthrough(area);};
  panel.querySelector('[data-street-area]').onchange=e=>{e.target.disabled=true;choose(e.target.value).catch(err=>{const s=panel.querySelector('[role=status]');if(s)s.textContent=err.message}).finally(()=>{e.target.disabled=false})};
  panel.querySelector('[data-street-road]').onchange=e=>{pause();stroll=null;look=0;position={streetID:e.target.value,distance:0,direction:1};draw();details();camera()};
  panel.querySelectorAll('[data-street-step]').forEach(b=>b.onclick=()=>{pause();step(+b.dataset.streetStep)});
  panel.querySelectorAll('[data-street-turn]').forEach(b=>b.onclick=()=>{pause();turn(+b.dataset.streetTurn)});
  panel.querySelector('[data-street-view]').onclick=()=>{pause();blocked=false;view=view==='walk'?'overview':'walk';details();camera()};
  panel.querySelector('[data-street-play]').onclick=()=>{if(playing){pause();return}if(reduce.matches||document.hidden)return;playing=true;const b=panel.querySelector('[data-street-play]');b.textContent='Pause';b.setAttribute('aria-pressed','true');loop()};
  panel.onkeydown=keyboard;
  details();panel.querySelector('h2').focus({preventScroll:true});
 }
 async function choose(id,near){
  pause();blocked=false;stroll=null;look=0;
  const meta=world.areas.find(a=>a.id===id)||world.areas.find(a=>a.id==='samyan');
  const data=await areaFile(meta.id);
  area={...meta,streetIDs:data.streetIDs,placeIDs:data.placeIDs,buildingIDs:data.buildings.features.map(f=>f.id),counts:data.counts};
  areaData=data;index=M.index(data);
  position=M.nearest(index,near||[area.anchor.x,area.anchor.y],area);
  if(!position)throw Error('No source street is available in this area.');
  render();draw();camera();
 }
 function step(metres){
  if(!active||panel.hidden||document.hidden)return;
  look=0;
  if(stroll){const next=M.advance(stroll,strollProgress,metres);if(next){strollProgress=next.progress;position=next.position;if(next.done)pause();draw();details();camera();return}}
  const result=M.move(index,position,metres,new Set(area.streetIDs));position=result.position;
  if(result.stopped)pause();draw();details();camera();
 }
 function loop(){if(!playing||!active||panel.hidden||document.hidden||reduce.matches){pause();return}step(8);if(playing)timer=setTimeout(loop,700)}
 function keyboard(e){
  if(!active||panel.hidden||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();return}
  const k=e.key.toLowerCase();if(!['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k))return;
  e.preventDefault();e.stopImmediatePropagation();pause();
  if(['w','arrowup'].includes(k))step(8);else if(['s','arrowdown'].includes(k))step(-8);else turn(['a','arrowleft'].includes(k)?-1:1);
 }
 function prepare(){
  state.mood=null;state.flags.clear();document.querySelectorAll('[data-flag]').forEach(b=>b.setAttribute('aria-pressed','false'));
  Atlas.reset();
  const u=new URL(location.href);for(const k of ['p','hood','hop','mood'])u.searchParams.delete(k);history.replaceState(null,'',u);
 }
 async function open(place){
  if(active&&!place)return resume();
  const p=place||state.selected,token=++revision;
  pause();openFromUrl.framed=true;closeSheet();createPanel().innerHTML='<header><h2>Neighbourhood stroll</h2><button class="street-close" aria-label="Close street sketch">×</button></header><p role="status">Loading mapped streets and explicit building heights…</p>';
  panel.querySelector('.street-close').onclick=exit;
  try{
   await Promise.all([load(),firstData]);
   if(!map.getLayer('pins-city'))await new Promise((ok,fail)=>{const timer=setTimeout(()=>{map.off('idle',check);fail(Error('Map is not ready. Try the sketch again.'))},15000);function check(){if(map.getLayer('pins-city')){clearTimeout(timer);map.off('idle',check);ok()}}map.on('idle',check);check()});
   if(!current(token))return;
   if(!active)snapshot={center:map.getCenter().toArray(),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),maxPitch:map.getMaxPitch(),maxZoom:map.getMaxZoom()};
   prepare();install();active=true;suspended=false;map.setMaxPitch(85);map.setMaxZoom(22);paint(true);
   const center=map.getCenter(),origin=p?[p.x,p.y]:[center.lng,center.lat],nearestArea=world.areas.slice().sort((a,b)=>M.dist(origin,[a.anchor.x,a.anchor.y])-M.dist(origin,[b.anchor.x,b.anchor.y]))[0];
   const within=origin&&M.dist(origin,[nearestArea.anchor.x,nearestArea.anchor.y])<=nearestArea.radiusM;
   await choose(nearestArea.id,within?origin:undefined);
   if(origin&&!within){const note=document.createElement('p');note.className='src';note.textContent=(p?'That place':'This map location')+' is outside the mapped sketch areas. Showing '+nearestArea.name+'; choose an area above.';panel.querySelector('header').after(note)}
  }catch(e){if(!current(token))return;panel.querySelector('[role=status]')?.remove();const msg=document.createElement('p');msg.setAttribute('role','status');msg.textContent=e.message;panel.append(msg);const b=document.createElement('button');b.textContent='Retry street sketch';b.onclick=()=>open(p);panel.append(b)}
 }
 function resume(){if(!active)return open();closeSheet();createPanel();prepare();map.setMaxPitch(85);map.setMaxZoom(22);suspended=false;paint(true);render();draw();camera()}
 function exit(){
  ++revision;pause();if(panel)panel.hidden=true;
  if(active){stroll=null;paint(false);map.getSource('street-stroll-line').setData(empty());map.getSource('street-eye').setData(empty());map.getSource('street-buildings').setData(empty());map.getSource('street-selected-line').setData(empty());active=false;lastArea=null;lastRoad=null;if(snapshot){map.setMaxPitch(snapshot.maxPitch);map.setMaxZoom(snapshot.maxZoom);map.easeTo({...snapshot,padding:{top:0,left:0,right:0,bottom:0},duration:reduce.matches||document.hidden?0:200})}}
 }

 let walkthroughStage, walkthroughController;
 async function openWalkthrough(target, trigger = document.activeElement) {
  if (walkthroughController) return;
  if (!walkthroughStage) {
   walkthroughStage = document.createElement('dialog');
   walkthroughStage.id = 'walkthrough-stage';
   walkthroughStage.className = 'street-3d-stage';
   walkthroughStage.setAttribute('aria-label', '3D neighbourhood');
   document.body.append(walkthroughStage);
  }
  const stage = walkthroughStage;
  const controller = new AbortController();
  walkthroughController = controller;
  pause();
  map.stop();

  function close(restoreFocus = true) {
   if (walkthroughController !== controller) return;
   walkthroughController = null;
   controller.abort();
   stage.close();
   stage.replaceChildren();
   if (restoreFocus && trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
  }

  function showStatus(message, failed = false) {
   stage.innerHTML = '<div class="model-start"><p role="status"></p><div class="model-start-actions"></div></div>';
   stage.querySelector('[role=status]').textContent = message;
   const actions = stage.querySelector('.model-start-actions');
   const back = document.createElement('button');
   back.textContent = 'Back to map';
   back.onclick = () => close();
   actions.append(back);
   if (failed) {
    const retry = document.createElement('button');
    retry.textContent = 'Retry 3D';
    retry.onclick = () => { close(false); void openWalkthrough(target, trigger); };
    actions.prepend(retry);
   }
   if (stage.open) back.focus();
  }

  stage.oncancel = event => { event.preventDefault(); close(); };
  stage.onkeydown = event => {
   if (event.key !== 'Escape') return;
   event.preventDefault();
   event.stopPropagation();
   close();
  };
  showStatus('Loading 3D neighbourhood…');
  stage.showModal();
  const centre = map.getCenter();
  const origin = Number.isFinite(target?.x) && Number.isFinite(target?.y)
   ? { x: target.x, y: target.y }
   : { x: centre.lng, y: centre.lat };
  try {
   const mod = await import('./street-world-3d.js?v=green-20261115');
   if (controller.signal.aborted) return;
   await mod.start(stage, {
    areaId: target?.id,
    origin,
    placeById: id => state.byId.get(canonId(id)),
    catalogues: [firstData, foodData],
    signal: controller.signal,
    onClose: () => close(),
    onError: () => {
     if (!controller.signal.aborted) showStatus('The 3D renderer stopped. Retry or return to the map.', true);
    },
    onSelectPlace: place => { close(false); select(place, true); }
   });
  } catch (error) {
   if (controller.signal.aborted) return;
   console.warn('3D neighbourhood could not start', error);
   showStatus('Could not open the 3D neighbourhood. Retry or return to the map.', true);
  }
 }

 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&panel&&!panel.hidden&&document.querySelector('#sheet').hidden){e.preventDefault();exit()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});reduce.addEventListener('change',()=>{pause();if(active&&!panel.hidden){render();camera()}});
 window.addEventListener('resize',()=>{pause();reflow()});
 window.StreetWorld={open,openWalkthrough,resume,exit,pause,suspend,load,get active(){return active},get playing(){return playing},get position(){return position},get data(){return areaData||world},get area(){return area},get view(){return view},get stroll(){return stroll?{placeID:stroll.place.id,length:stroll.length,progress:strollProgress,offset:stroll.offset}:null}};
})();
