// Catalogue re-signed 2026-11-04 after scripts/clean-catalogue.py (76 dropped, 87 twins merged; every decision in public/data/cleanup.json, old ids in aliases.json).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {validateEvidence} from '../scripts/build-atlas-evidence.mjs';
const require=createRequire(import.meta.url),M=require('../public/atlas-model.js');
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const hashes={work:'6d28b6af5371c376e5fbbb0c1d73ec13258781b8efbe35454a73b91377eaccf4',food:'a5680476951d1af6b37a25f1a660180ba76e5d7c2f2aedc948fa3c1dc58b06d8'};
const rows=[];
for(const [name,hash]of Object.entries(hashes)){
 const bytes=await readFile(new URL(`../public/data/places-${name}.json`,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,`Original ${name} catalogue changed`);rows.push(...JSON.parse(bytes).rows);
}
assert.equal(rows.length,57376);const catalogue=new Map(rows.map(r=>[r[0],r]));assert.equal(catalogue.size,57376);assert.equal(rows.filter(r=>r[2]===0).length,20158);
const [geo,joined,streets,evidence,curated]=await Promise.all(['public/data/atlas-geo.json','public/data/atlas-places.json','public/data/atlas-streets.json','public/data/atlas-evidence.json','data/atlas-evidence.json'].map(read));
const uniqueFeatures=fc=>{assert.equal(fc.type,'FeatureCollection');const m=new Map(fc.features.map(f=>[f.id,f]));assert.equal(m.size,fc.features.length);return m};
const districts=uniqueFeatures(geo.districts),parks=uniqueFeatures(geo.parks),ways=uniqueFeatures(streets);
assert.equal([...districts.values()].filter(f=>f.properties.bangkok).length,50);
const worldPoint=p=>{assert.equal(p.length,2);assert(p.every(Number.isFinite));assert(Math.abs(p[0])<=180&&Math.abs(p[1])<=90)};
for(const f of [...districts.values(),...parks.values()]){
 assert(['Polygon','MultiPolygon'].includes(f.geometry.type));assert.equal(f.properties.sourceID,f.id);
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 assert(polygons.length);for(const polygon of polygons){assert(polygon.length);for(const ring of polygon){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));ring.forEach(worldPoint)}}
}
for(const f of districts.values()){assert(f.properties.name&&f.properties.province&&f.properties.provinceCode);assert.equal(f.properties.codeSystem,'OpenStreetMap relation ID');assert(f.properties.catalogueAreaKm2>0&&f.properties.areaKm2>=f.properties.catalogueAreaKm2)}
assert.equal(geo.manifest.crs,'EPSG:4326');assert.equal(geo.manifest.distanceCRS,'EPSG:32647');assert.equal(geo.manifest.license,'ODbL-1.0');
assert.deepEqual(joined.cols,['placeID','districtID','parkID','parkDistanceM']);assert.equal(joined.rows.length,57376);
const joinedIDs=new Set(),districtTotals=new Map();let unassigned=0,nearPark=0;
for(const [id,district,park,distance]of joined.rows){
 assert(catalogue.has(id));assert(!joinedIDs.has(id));joinedIDs.add(id);
 if(district===null)unassigned++;else{assert(districts.has(district));districtTotals.set(district,(districtTotals.get(district)||0)+1)}
 assert.equal(park===null,distance===null);if(park!==null){assert(parks.has(park));assert(Number.isInteger(distance)&&distance>=0&&distance<=2000);nearPark++}
}
assert.equal(unassigned,geo.manifest.counts.unassignedDistrict);assert.equal(nearPark,geo.manifest.counts.within2kmPark);
for(const [id,f]of districts)assert.equal(f.properties.counts.total||0,districtTotals.get(id)||0);
for(const [id,e]of Object.entries(joined.attributes)){assert(catalogue.has(id));assert.equal(e.sourceID,id);assert(/^[nwr]\d+$/.test(id));assert(Object.keys(e.tags).length)}
// Display lines can differ from source by5m; allow6m for rounding/projection here.
// This independent check catches wrong/moved road geometry while source joins remain exact.
function displayLineDistance(row,lines){
 const project=([x,y])=>[(x-row[4])*111320*Math.cos(row[3]*Math.PI/180),(y-row[3])*111320];let best=Infinity;
 for(const line of lines)for(let i=1;i<line.length;i++){
  const a=project(line[i-1]),b=project(line[i]),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/den)):0;
  best=Math.min(best,Math.hypot(a[0]+t*dx,a[1]+t*dy));
 }return best;
}
let streetIDs=new Set();const streetCoverage=new Set();
for(const f of ways.values()){
 const p=f.properties;assert.equal(f.id,p.sourceID);assert(/^w\d+$/.test(f.id));assert(p.name&&p.highway);assert(['LineString','MultiLineString'].includes(f.geometry.type));
 const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;for(const l of lines){assert(l.length>=2);l.forEach(worldPoint)}
 assert.equal(p.count,p.cafeIDs.length);assert.equal(new Set(p.cafeIDs).size,p.count);
 for(const id of p.cafeIDs)assert(displayLineDistance(catalogue.get(id),lines)<=46,'Café must be near the published road geometry within display tolerance');
 assert.equal(p.independentCount,p.cafeIDs.filter(id=>{assert.equal(catalogue.get(id)?.[2],0,'Street neighbour must be an existing café');streetIDs.add(id);return !(catalogue.get(id)[5]&32)}).length);
 for(const id of p.districtIDs){assert(districts.has(id));if(districts.get(id).properties.bangkok)streetCoverage.add(id)}
 assert(!['private','no','customers'].includes(p.access));assert(!['private','no','customers'].includes(p.foot));
}
assert.equal(streetCoverage.size,50);assert.equal(streetIDs.size,streets.manifest.uniquePublishedCafes);assert.equal(ways.size,streets.manifest.publishedWays);assert(streets.manifest.positiveWays>=ways.size);assert.equal(streets.manifest.distanceM,40);assert(streets.manifest.displaySimplificationM<=5);
assert((await readFile(new URL('../public/data/atlas-streets.json',import.meta.url))).length<=500000);
assert.deepEqual(evidence,curated,'Runtime evidence must be rebuilt from the curated source');validateEvidence(evidence,catalogue);
// Regression: a new unsupported badge, guessed pin, or inflated page/thread count cannot publish.
for(const mutate of [d=>d.places[0].place_id='invented-pin',d=>d.places[0].editorial_count++,d=>d.places[0].attributes.architecture=true,d=>d.places[0].evidence[0].source_id='unknown-source',d=>d.places[0].evidence[0].identity.catalogue_name='Wrong branch']){
 const bad=structuredClone(evidence);mutate(bad);assert.throws(()=>validateEvidence(bad,catalogue));
}
const repeated=structuredClone(evidence);repeated.places[0].evidence.push(structuredClone(repeated.places[0].evidence[0]));validateEvidence(repeated,catalogue); // same source twice remains one distinct page

const cafe={id:'plain',k:'cafe',flags:0,d:[5,5,9,5,0,0],x:100.5,y:13.75};
assert.equal(M.icon(cafe,{},0),'cafe-indie');assert.equal(M.icon(cafe,{discussion_count:99},0),'cafe-indie','Discussion cannot create publisher or visitor stars');
assert.equal(M.icon(cafe,{editorial_count:1},0),'cafe-featured');assert.equal(M.icon(cafe,{},4),'cafe-star');
assert.equal(M.icon({...cafe,flags:32}, {},0),'cafe','A chain is not independent');assert.equal(M.icon({...cafe,d:[5,5,9,2,0,0]}, {},0),'cafe-hidden');
assert.equal(M.icon({...cafe,flags:32,d:[5,5,9,0,0,0]}, {},0),'cafe','Sparse coverage cannot make a chain an independent hidden café');
assert.equal(M.icon({...cafe,k:'library'},{editorial_count:10},5),'library');
// Metric fixture coordinates in metres near Bangkok; actual model distance calculation is exercised.
const point=(id,x,y,extra={})=>({...cafe,id,x:cafe.x+x/(111320*Math.cos(cafe.y*Math.PI/180)),y:cafe.y+y/111320,...extra});
const a=point('A',0,0),b=point('B',300,0),c=point('C',150,260),fixture=[a,b,c],clear=()=>false;
const triangle=M.triangles(fixture,a,clear);assert.equal(triangle.length,1);assert.equal(triangle[0].id,'A|B|C');assert(Math.abs(triangle[0].perimeter-900)<5);assert(Math.abs(triangle[0].area-39000)<100);
assert.deepEqual(M.triangles([...fixture,point('chain',250,200,{flags:32}),point('food',200,250,{k:'restaurant'}),point('far',5000,0)],a,clear),triangle);
assert.deepEqual(M.triangles([a,b,point('flat',600,0)],a,clear),[],'Collinear stops are not a triangle');
assert.deepEqual(M.triangles([a,b,point('close',30,20)],a,clear),[],'Too-short legs are refused');
assert.deepEqual(M.triangles([a,b,point('distant',150,900)],a,clear),[],'Too-long legs are refused');
// River fixtures: a vertical river crossing the two banks, plus a closure-edge-only refusal.
const riverX=point('river',120,0).x;const crosses=(p,q)=>(p.x-riverX)*(q.x-riverX)<0;
assert.deepEqual(M.triangles(fixture,a,crosses),[],'No suggested triangle may cross the mapped river');
assert.deepEqual(M.triangles(fixture,a,(p,q)=>[p.id,q.id].sort().join('|')==='B|C'),[],'The closing edge must also respect the river');
const grid=Array.from({length:9},(_,i)=>point(String(i),i%3*200,Math.floor(i/3)*200));
const bounded=M.triangles(grid,a,clear);assert.equal(bounded.length,8);assert.equal(new Set(bounded.map(t=>t.id)).size,8);assert.deepEqual(M.triangles([...grid].reverse(),a,clear),bounded,'Suggestion order is deterministic');
console.log(`PASS atlas: ${catalogue.size} conserved places, ${districts.size} districts, ${parks.size} parks, ${ways.size} streets, ${evidence.places.length} evidence records; model honesty and triangle/river fixtures.`);

for(const rating of [1,2,3,6,NaN,4.5])assert.notEqual(M.icon(cafe,{},rating),'cafe-star');
