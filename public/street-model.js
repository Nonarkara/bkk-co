// Travel in this sketch stays on original source polylines and shared OSM nodes.
(function(root){
 const rad=Math.PI/180;
 const dist=(a,b)=>Math.hypot((a[1]-b[1])*111320,(a[0]-b[0])*111320*Math.cos((a[1]+b[1])*rad/2));
 const bearing=(a,b)=>Math.atan2((b[0]-a[0])*Math.cos((a[1]+b[1])*rad/2),b[1]-a[1])/rad;
 function index(world){
  const roads=new Map();
  for(const f of world.streets.features){
   const points=f.geometry.coordinates,steps=[0];
   for(let i=1;i<points.length;i++)steps.push(steps[i-1]+dist(points[i-1],points[i]));
   if(points.length>1&&steps.at(-1)>0)roads.set(f.id,{...f,points,steps,length:steps.at(-1)});
  }
  return {world,roads};
 }
 function point(road,distance){
  const d=Math.max(0,Math.min(road.length,distance));
  let i=1;while(i<road.steps.length-1&&road.steps[i]<d)i++;
  const a=road.points[i-1],b=road.points[i],span=road.steps[i]-road.steps[i-1],t=span?(d-road.steps[i-1])/span:0;
  return {coordinates:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],bearing:bearing(a,b),distance:d};
 }
 function branches(data,pos,allowed){
  const r=data.roads.get(pos.streetID);if(!r)return [];
  const i=r.steps.findIndex(d=>Math.abs(d-pos.distance)<.05);if(i<0)return [];
  const node=r.properties.nodeIDs[i],junction=data.world.junctions[node];if(!junction)return [];
  const choices=[];
  for(const id of junction.streetIDs){
   if(allowed&&!allowed.has(id))continue;
   const road=data.roads.get(id);if(!road)continue;
   for(let n=0;n<road.properties.nodeIDs.length;n++)if(road.properties.nodeIDs[n]===node){
    for(const direction of[-1,1])if(road.points[n+direction])choices.push({streetID:id,distance:road.steps[n],direction,bearing:bearing(road.points[n],road.points[n+direction]),nodeID:node});
   }
  }
  return choices;
 }
 function move(data,pos,metres,allowed){
  const r=data.roads.get(pos.streetID);if(!r)return {position:pos,choices:[],stopped:true};
  const sign=Math.sign(metres)*(pos.direction||1),target=Math.max(0,Math.min(r.length,pos.distance+Math.abs(metres)*sign));
  const candidates=r.steps.filter((d,i)=>sign*(d-pos.distance)>.05&&sign*(target-d)>=0&&(data.world.junctions[r.properties.nodeIDs[i]]?.streetIDs.length>1));
  const next=candidates.length?candidates.sort((a,b)=>Math.abs(a-pos.distance)-Math.abs(b-pos.distance))[0]:target;
  const position={...pos,distance:next};
  const choices=branches(data,position,allowed),stopped=choices.length>0||next===0||next===r.length;
  return {position,choices,stopped};
 }
 function nearest(data,point,area){
  let best=null;
  for(const id of area.streetIDs){const r=data.roads.get(id);if(!r)continue;
   for(let i=0;i<r.points.length;i++){const d=dist(point,r.points[i]);if(!best||d<best.metres)best={streetID:id,distance:r.steps[i],direction:r.steps[i]>r.length/2?-1:1,metres:d}}
  }
  return best;
 }
 const api={index,point,branches,move,nearest,dist,bearing};root.StreetModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
