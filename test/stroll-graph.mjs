import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const M=createRequire(import.meta.url)('../public/street-model.js');
const road=(id,nodes,coordinates)=>({id,properties:{nodeIDs:nodes},geometry:{type:'LineString',coordinates}});
const world={streets:{features:[road('a',['a','b'],[[100,13],[100.001,13]]),road('b',['b','c'],[[100.001,13],[100.001,13.001]]),road('isolated',['d','e'],[[100.0004,13.00001],[100.0004,13.001]])]},junctions:{b:{streetIDs:['a','b']}}};
const data=M.index(world),area={id:'fixture',streetIDs:['a','b','isolated']},origin={streetID:'a',distance:10,direction:1};
const route=M.routes(data,area,origin,[{id:'goal',x:100.001,y:13.001},{id:'disconnected',x:100.0004,y:13.001}]);
assert.equal(route.length,1,'A nearby disconnected lane must not earn a stroll');
assert.equal(route[0].place.id,'goal');assert(route[0].segments.some(e=>e.streetID==='b'));
for(let progress=0;progress<route[0].length;progress+=8){
 const next=M.advance(route[0],progress,8);assert(next);assert(next.progress<=route[0].length);
 const r=data.roads.get(next.position.streetID);assert(next.position.distance>=0&&next.position.distance<=r.length);
}
const end=M.advance(route[0],0,1e6);assert(end.done);assert.equal(end.progress,route[0].length);assert.equal(M.advance(route[0],end.progress,-8).progress,route[0].length-8);
const actual=JSON.parse(await readFile(new URL('../public/data/street-world.json',import.meta.url))),catalogue=JSON.parse(await readFile(new URL('../public/data/places-work.json',import.meta.url))),idx=M.index(actual);
for(const area of actual.areas){
 const origin=M.nearest(idx,[area.anchor.x,area.anchor.y],area),ids=new Set(area.placeIDs),places=catalogue.rows.filter(r=>r[2]===0&&ids.has(r[0])).map(r=>({id:r[0],n:r[1],x:r[4],y:r[3]}));
 const start=M.point(idx.roads.get(origin.streetID),origin.distance).coordinates;places.sort((a,b)=>M.dist(start,[a.x,a.y])-M.dist(start,[b.x,b.y]));
 const routes=M.routes(idx,area,origin,places.slice(0,24));assert(routes.length,area.id+' must offer a connected café stroll');
 for(const route of routes){
  let previous=M.point(idx.roads.get(origin.streetID),origin.distance).coordinates,total=0;
  for(const edge of route.segments){
   assert(area.streetIDs.includes(edge.streetID));const road=idx.roads.get(edge.streetID),from=M.point(road,edge.from).coordinates,to=M.point(road,edge.to).coordinates;
   assert(M.dist(previous,from)<.001,'Every route segment joins the preceding exact source coordinate');
   assert(Math.abs(edge.length-M.dist(from,to))<.001,'A graph edge is one actual source segment');previous=to;total+=edge.length;
  }
  assert(Math.abs(total-route.length)<.001);assert(route.offset<=100);assert(M.dist(previous,[route.place.x,route.place.y])<=100);
 }
 console.log(`${area.id}: ${routes.length} connected café strolls, first ${Math.round(routes[0].length)} m source lanes / ${Math.round(routes[0].offset)} m pin offset`);
}
console.log('Disconnected-lane falsifier, 8m progression/backtracking/end clamping, exact segment continuity and café approach qualification pass.');
