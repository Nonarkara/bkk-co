// Authored story atmosphere around existing anchors, never district/building evidence.
(() => {
 const catalogue={source:'Palette · Sanzo Wada digital catalogue',path:'palette/data/colors.json',sha256:'555f11c32eb8133078fd470dd7d5320533aaa8b636f12fa06a8dd3d0ee2703b4',meaning:'Credited digital conversions, not exact historical ink.'};
 const areas=[
  {id:'ari',name:'Ari',mood:'Slow mornings',source:'data/hoods.json',anchorID:'n5388607091',x:100.54462,y:13.77971,radiusM:800,chord:176,colors:[['Seashell Pink','#fdd4bd'],['Hermosa Pink','#f9c1ce'],['Calamine BLue','#78cdd0']]},
  {id:'thonglo',name:'Thong Lo',mood:'After work',source:'data/hoods.json',anchorID:'n5391626092',x:100.57851,y:13.72423,radiusM:800,chord:227,colors:[['Light Glaucous Blue','#a5c8d1'],['Hermosa Pink','#f9c1ce'],['Cerulian Blue','#0093a5']]},
  {id:'charoenkrung',name:'Charoen Krung',mood:'Crossing paths',source:'data/hoods.json',anchorID:'n4840964126',x:100.51518,y:13.72705,radiusM:800,chord:273,colors:[['Hermosa Pink','#f9c1ce'],['Neutral Gray','#b6bfc1'],['Sudan Brown','#a36752'],['Pansy Purple','#7d133a']]},
  {id:'samyan',name:'Sam Yan',mood:'Studying past midnight',source:'data/hoods.json',anchorID:'n12803915078',x:100.53012,y:13.73206,radiusM:800,chord:320,colors:[['Sulpher Yellow','#f5ecc2'],['Light Glaucous Blue','#a5c8d1'],['Oil Green','#819238'],['Coral Red','#f58e84']]},
  {id:'ramkhamhaeng',name:'Ramkhamhaeng',mood:'Meet’s space',source:'data/street-world.json',anchorID:'o825832f94e7f',x:100.61656,y:13.76998,radiusM:800,chord:241,colors:[['Pale Lemon Yellow','#ffefae'],['Isabella Color','#c5a56e'],['Dark Medici Blue','#547076']]},
 ];
 const source='neighborhood-palette',layer='manga-neighborhood-ground',empty=()=>({type:'FeatureCollection',features:[]});let map=null;
 // A geodesic editorial frame. These generated coordinates are never source boundaries.
 function circle(area){
  const rad=Math.PI/180,lat=area.y*rad,lon=area.x*rad,d=area.radiusM/6371008.8,ring=[];
  for(let i=0;i<=96;i++){const bearing=i/96*2*Math.PI,phi=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(bearing)),lambda=lon+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(phi));ring.push([lambda/rad,phi/rad])}
  ring[ring.length-1]=ring[0].slice();
  return {type:'Feature',id:area.id,properties:{id:area.id,name:area.name,chord:area.chord,anchorSource:area.source,anchorID:area.anchorID,anchorX:area.x,anchorY:area.y,radiusM:area.radiusM,role:'editorial-story-frame',meaning:'800m narrative circle, not a district boundary or amenity evidence'},geometry:{type:'Polygon',coordinates:[ring]}};
 }
 function pattern(area){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),colors=area.colors.map(x=>x[1]);
  // Broad quiet paper, one secondary band and sparse tiny printed marks.
  // Their positions are graphic composition, never streets, parcels or densities.
  g.fillStyle=colors[0];g.fillRect(0,0,64,64);g.fillStyle=colors[1];g.fillRect(0,48,64,16);
  g.fillStyle=colors[2];for(const [x,y]of[[12,12],[44,28],[28,44],[60,60]]){g.beginPath();g.arc(x,y,1.1,0,Math.PI*2);g.fill()}
  if(colors[3]){g.fillStyle=colors[3];g.fillRect(0,0,64,.7)}
  return g.getImageData(0,0,64,64);
 }
 function sync(){
  if(!map?.getLayer('manga-ground'))return;
  for(const area of areas){const id='neighborhood-chord-'+area.chord;if(!map.hasImage(id))map.addImage(id,pattern(area))}
  if(!map.getSource(source))map.addSource(source,{type:'geojson',tolerance:0,data:{...empty(),features:areas.map(circle)}});
  if(!map.getLayer(layer)){
   const layers=map.getStyle().layers,index=layers.findIndex(l=>l.id==='manga-ground'),before=layers[index+1]?.id;
   map.addLayer({id:layer,type:'fill',source,layout:{visibility:'none'},paint:{'fill-pattern':['concat','neighborhood-chord-',['to-string',['get','chord']]],'fill-opacity':.28,'fill-opacity-transition':{duration:0,delay:0}}},before);
  }
  const wanted=window.MangaLens?.active?'visible':'none';if(map.getLayoutProperty(layer,'visibility')!==wanted)map.setLayoutProperty(layer,'visibility',wanted);
 }
 function attach(m){if(map===m)return;map=m;map.on('style.load',sync);map.on('idle',sync);sync()}
 function legend(){return `<details class="neighborhood-palette-key"><summary>Neighbourhood moods · Wada</summary><p>Five 800m story circles around existing map anchors. Their quiet ground colors are authored atmosphere, not district boundaries, building use or amenity evidence. The same café, co-work, library and food colors stay on actual matched footprints.</p><ul>${areas.map(a=>`<li>${a.name} · ${a.mood} · ${a.chord} <span aria-label="${a.colors.map(c=>c[0]).join(', ')}">${a.colors.map(c=>`<span style="display:inline-block;width:12px;height:12px;background:${c[1]}" aria-hidden="true"></span>`).join('')}</span></li>`).join('')}</ul><p class="src">Sanzo Wada combinations 176, 227, 273, 320 and 241. Credited digital catalogue conversions. Circles retain existing PL;UB story/Street sketch anchors and 800m radius; the rest of Bangkok is unassigned.</p></details>`}
 window.NeighborhoodPalette={attach,sync,legend,catalogue,areas,get features(){return areas.map(circle)}};
})();
