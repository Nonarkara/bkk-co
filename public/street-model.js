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
 // Only exact shared source node IDs connect edges; a pin approach is never an entrance.
 const graphs=new WeakMap();
 function graph(data,area){
  let cache=graphs.get(data);if(!cache){cache=new Map();graphs.set(data,cache)}
  if(cache.has(area.id))return cache.get(area.id);
  const nodes=new Map(),add=(id,e)=>{if(!nodes.has(id))nodes.set(id,[]);nodes.get(id).push(e)};
  for(const id of area.streetIDs){const r=data.roads.get(id);if(!r)continue;for(let i=1;i<r.points.length;i++){
   const a=r.properties.nodeIDs[i-1],b=r.properties.nodeIDs[i],length=r.steps[i]-r.steps[i-1];
   add(a,{node:b,streetID:id,from:r.steps[i-1],to:r.steps[i],length});add(b,{node:a,streetID:id,from:r.steps[i],to:r.steps[i-1],length});
  }}
  cache.set(area.id,nodes);return nodes;
 }
 function routes(data,area,pos,places){
  const nodes=graph(data,area),r=data.roads.get(pos.streetID);if(!r)return [];
  let i=1;while(i<r.steps.length-1&&r.steps[i]<pos.distance)i++;
  const best=new Map(),previous=new Map(),queue=[];
  for(const n of [i-1,i]){const node=r.properties.nodeIDs[n],cost=Math.abs(r.steps[n]-pos.distance),edge={streetID:r.id,from:pos.distance,to:r.steps[n],length:cost};if(!best.has(node)||cost<best.get(node)){best.set(node,cost);previous.set(node,{edge});queue.push([cost,node])}}
  // The small bounded area graph needs no geographic shortcuts or external router.
  while(queue.length){queue.sort((a,b)=>b[0]-a[0]);const[cost,node]=queue.pop();if(cost!==best.get(node))continue;
   for(const edge of nodes.get(node)||[]){const next=cost+edge.length;if(next<(best.get(edge.node)??Infinity)){best.set(edge.node,next);previous.set(edge.node,{node,edge});queue.push([next,edge.node])}}
  }
  const out=[];
  for(const place of places){const goal=nearest(data,[place.x,place.y],area);if(!goal||goal.metres>100)continue;
   const road=data.roads.get(goal.streetID),n=road.steps.indexOf(goal.distance),node=road.properties.nodeIDs[n];if(!best.has(node))continue;
   const segments=[];let cursor=node;while(previous.has(cursor)){const v=previous.get(cursor);if(v.edge.length>.01)segments.unshift(v.edge);if(v.node===undefined)break;cursor=v.node}
   const length=best.get(node);if(length<15||length>1600)continue;
   out.push({place,segments,length,offset:goal.metres,goal});
  }
  return out.sort((a,b)=>Number(b.length>=120)-Number(a.length>=120)||a.length-b.length).slice(0,5);
 }
 function advance(route,progress,metres){
  const distance=Math.max(0,Math.min(route.length,progress+metres));let left=distance;
  for(let i=0;i<route.segments.length;i++){const edge=route.segments[i];if(left<edge.length-.001||i===route.segments.length-1){const direction=Math.sign(edge.to-edge.from);return {progress:distance,done:distance>=route.length-.01,position:{streetID:edge.streetID,distance:edge.from+Math.min(left,edge.length)*direction,direction}}}left-=edge.length}
  return null;
 }
 const api={index,point,branches,move,nearest,dist,bearing,routes,advance};root.StreetModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
