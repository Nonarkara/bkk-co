// A source feature may group unrelated buildings: classify each Polygon separately.
(function(root){
 const masks={cafe:1,coworking:2,library:4,restaurant:8},cell=.002;
 const key=(x,y)=>`${x},${y}`;
 function index(places){
  const bins=new Map();
  for(const p of places){
   const mask=Object.hasOwn(masks,p.k)?masks[p.k]:0;
   if(!mask||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.id==null)continue;
   const x=Math.floor(p.x/cell),y=Math.floor(p.y/cell),k=key(x,y);
   if(!bins.has(k))bins.set(k,{x,y,places:[]});
   bins.get(k).places.push({x:p.x,y:p.y,id:p.id,mask});
  }
  return {bins};
 }
 // 0 = outside, 1 = inside, -1 = boundary (unknown, never assigned).
 function inRing(p,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[j],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],px=p.x-a[0],py=p.y-a[1];
   const cross=dx*py-dy*px,tolerance=8*Number.EPSILON*(Math.abs(dx*py)+Math.abs(dy*px));
   if(Math.abs(cross)<=tolerance&&p.x>=Math.min(a[0],b[0])&&p.x<=Math.max(a[0],b[0])&&p.y>=Math.min(a[1],b[1])&&p.y<=Math.max(a[1],b[1]))return -1;
   if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside?1:0;
 }
 function contains(p,rings){
  if(inRing(p,rings[0])!==1)return false;
  for(let i=1;i<rings.length;i++)if(inRing(p,rings[i])!==0)return false;
  return true;
 }
 function classify(features,data){
  const found=new Map();
  for(const f of features){
   const g=f.geometry,polygons=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
   for(const rings of polygons){
    if(!rings[0]?.length)continue;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of rings[0]){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1])}
    if(![minX,minY,maxX,maxY].every(Number.isFinite))continue;
    const x0=Math.floor(minX/cell),y0=Math.floor(minY/cell),x1=Math.floor(maxX/cell),y1=Math.floor(maxY/cell),bins=[];
    if((x1-x0+1)*(y1-y0+1)>data.bins.size){
     for(const bin of data.bins.values())if(bin.x>=x0&&bin.x<=x1&&bin.y>=y0&&bin.y<=y1)bins.push(bin);
    }else{
     for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const bin=data.bins.get(key(x,y));if(bin)bins.push(bin)}
    }
    let mask=0;const ids=new Set();
    for(const bin of bins)for(const p of bin.places){
     if(p.x>minX&&p.x<maxX&&p.y>minY&&p.y<maxY&&contains(p,rings)){mask|=p.mask;ids.add(p.id)}
    }
    if(!mask)continue;
    const signature=JSON.stringify(rings),previous=found.get(signature);
    if(previous){previous.properties.mask|=mask;previous.properties.placeIDs=[...new Set([...previous.properties.placeIDs,...ids])];continue}
    found.set(signature,{type:'Feature',id:found.size,properties:{mask,placeIDs:[...ids],tileFeatureID:f.id??null},geometry:{type:'Polygon',coordinates:rings.map(r=>r.map(p=>p.slice()))}});
   }
  }
  return {type:'FeatureCollection',features:[...found.values()]};
 }
 const api={index,classify};root.FootprintModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
