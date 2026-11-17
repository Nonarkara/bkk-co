// Neighbourhood mood grounds around the street-sketch anchors.
//
// Two kinds of area share this layer, and the difference is stated rather than hidden:
//   * five AUTHORED neighbourhoods keep their story and their Wada combination;
//   * seven DISTRICTS were chosen by cafe density, so they have no story. They take a real
//     catalogue combination, and their mood is the catalogue's own count inside 800 m.
// Every circle is an 800 m narrative frame around a real anchor. Never a district boundary,
// never amenity evidence, never a street.
(() => {
 const root=typeof window!=='undefined'?window:globalThis;
 const catalogue={source:'Palette · Sanzo Wada digital catalogue',path:'palette/data/colors.json',sha256:'555f11c32eb8133078fd470dd7d5320533aaa8b636f12fa06a8dd3d0ee2703b4',meaning:'Credited digital conversions, not exact historical ink.'};
 // Authored story areas: the combination and its colours are a considered choice.
 const authored={
  ari:{chord:273,colors:[["Hermosa Pink","#f9c1ce"],["Sudan Brown","#a36752"],["Pansy Purple","#7d133a"]]},
  thonglo:{chord:320,colors:[["Sulpher Yellow","#f5ecc2"],["Coral Red","#f58e84"],["Oil Green","#819238"],["Light Glaucous Blue","#a5c8d1"]]},
  charoenkrung:{chord:273,colors:[['Hermosa Pink','#f9c1ce'],['Pansy Purple','#7d133a'],['Sudan Brown','#a36752'],['Neutral Gray','#b6bfc1']]},
  samyan:{chord:320,colors:[['Sulpher Yellow','#f5ecc2'],['Light Glaucous Blue','#a5c8d1'],['Oil Green','#819238'],['Coral Red','#f58e84']]},
  ramkhamhaeng:{chord:241,colors:[['Pale Lemon Yellow','#ffefae'],['Isabella Color','#c5a56e'],['Dark Medici Blue','#547076']]},
 };
 // Density-chosen districts: a real catalogue combination, no invented mood.
 const derived={
  pathumwan:{chord:302,colors:[['Cream Yellow','#fdbf68'],['Ecru','#c2ae93'],['Nile Blue','#bce4e5'],['Antwarp Blue','#007190']]},
  phranakhon:{chord:235,colors:[['Ivory Buff','#ebd3a2'],['Yellow Orange','#f99d1b'],['Grayish Lavender - B','#c0a9b3']]},
  samphanthawong:{chord:317,colors:[['Light Pinkish Cinnamon','#fcc79b'],['Ecru','#c2ae93'],['Lemon Yellow','#f8ed43'],['Turquoise Green','#b5decc']]},
  chatuchak:{chord:303,colors:[['Naples Yellow','#fbe6a0'],['Peach Red','#f15a30'],['Deep Slate Olive','#253122'],['Neutral Gray','#b6bfc1']]},
  dindaeng:{chord:188,colors:[["Rainette Green","#8fa071"],["Cobalt Green","#96d1aa"],["Salvia Blue","#97acc8"]]},
  bangkapi:{chord:178,colors:[['Ivory Buff','#ebd3a2'],['Light Glaucous Blue','#a5c8d1'],['Green Blue','#099197']]},
  prawet:{chord:326,colors:[['Sulpher Yellow','#f5ecc2'],['Peach Red','#f15a30'],['Yellow Green','#afd472'],['Night Green','#87c540']]},
 };
 const chords={...authored,...derived};
 const source='neighborhood-palette',layer='manga-neighborhood-ground',empty=()=>({type:'FeatureCollection',features:[]});
 let map=null,areas=[],pending=null;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // The catalogue's own count inside 800 m. A fact about the record, not an authored mood.
 const mixMood=area=>{
  const mix=area.mix||{},parts=Object.entries(mix).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${n} ${k==='coworking'?'co-work':k==='library'?'libraries':k==='restaurant'?'food':'cafés'}`);
  return parts.length?`${parts.join(' · ')} in 800 m`:'No catalogue places inside 800 m';
 };
 function loadAreas(){
  if(pending)return pending;
  pending=fetch('data/street-areas.json').then(r=>r.json()).then(d=>{
   areas=(d.areas||[]).filter(a=>chords[a.id]).map(a=>({
    id:a.id,name:a.name,mood:a.mood||mixMood(a),
    story:!!authored[a.id],chord:chords[a.id].chord,colors:chords[a.id].colors,
    anchorID:a.anchor.sourceID,x:a.anchor.x,y:a.anchor.y,radiusM:a.radiusM,
    basis:a.basis||'',cafes:a.cafesWithin800m||0}));
   return areas;
  }).catch(()=>{areas=[];return areas});
  return pending;
 }
 // A geodesic editorial frame. These generated coordinates are never source boundaries.
 function circle(area){
  const rad=Math.PI/180,lat=area.y*rad,lon=area.x*rad,d=area.radiusM/6371008.8,ring=[];
  for(let i=0;i<=96;i++){const bearing=i/96*2*Math.PI,phi=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(bearing)),lambda=lon+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(phi));ring.push([lambda/rad,phi/rad])}
  ring[ring.length-1]=ring[0].slice();
  return {type:'Feature',id:area.id,properties:{id:area.id,name:area.name,chord:area.chord,toneId:area.id,anchorSource:'data/street-areas.json',anchorID:area.anchorID,anchorX:area.x,anchorY:area.y,radiusM:area.radiusM,role:'editorial-story-frame',meaning:'800m narrative circle, not a district boundary or amenity evidence'},geometry:{type:'Polygon',coordinates:[ring]}};
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
  if(!map?.getLayer('manga-ground')||!areas.length)return;
  for(const area of areas){const id='neighborhood-tone-'+area.id;if(!map.hasImage(id))map.addImage(id,pattern(area))}
  if(!map.getSource(source))map.addSource(source,{type:'geojson',tolerance:0,data:{...empty(),features:areas.map(circle)}});
  if(!map.getLayer(layer)){
   const layers=map.getStyle().layers,index=layers.findIndex(l=>l.id==='manga-ground'),before=layers[index+1]?.id;
   map.addLayer({id:layer,type:'fill',source,layout:{visibility:'none'},paint:{'fill-pattern':['concat','neighborhood-tone-',['to-string',['get','toneId']]],'fill-opacity':.16,'fill-opacity-transition':{duration:0,delay:0}}},before);
  }
  const wanted=window.MangaLens?.active?'visible':'none';if(map.getLayoutProperty(layer,'visibility')!==wanted)map.setLayoutProperty(layer,'visibility',wanted);
 }
 function attach(m){if(map===m)return;map=m;map.on('style.load',sync);map.on('idle',sync);loadAreas().then(()=>sync())}
 function legend(){const stories=areas.filter(a=>a.story).length;return `<details class="neighborhood-palette-key"><summary>Neighbourhood moods · Wada</summary><p>${areas.length} 800m circles around the street-sketch anchors. ${stories} carry an authored story; the rest were chosen by cafe density and show the catalogue's own count inside 800 m. Their quiet ground colours are atmosphere, not district boundaries, building use or amenity evidence. The same café, co-work, library and food colors stay on actual matched footprints.</p><ul>${areas.map(a=>`<li>${esc(a.name)} · ${esc(a.mood)} · ${a.chord} <span aria-label="${a.colors.map(c=>c[0]).join(', ')}">${a.colors.map(c=>`<span style="display:inline-block;width:12px;height:12px;background:${c[1]}" aria-hidden="true"></span>`).join('')}</span></li>`).join('')}</ul><p class="src">Sanzo Wada combinations from the credited digital catalogue, arranged after the Grand Budapest Hotel palette. Circles retain the PL;UB street-sketch anchors and 800m radius; the rest of Bangkok is unassigned. Map ground colours: Sanzo Wada catalogue; parks, water and roads follow OpenStreetMap classes.</p></details>`}
 root.NeighborhoodPalette={attach,sync,legend,catalogue,chords,get areas(){return areas},get features(){return areas.map(circle)}};
 if(typeof module!=='undefined')module.exports=root.NeighborhoodPalette;
})();
