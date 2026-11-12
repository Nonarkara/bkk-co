import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const bytes=await readFile(new URL('../public/data/street-world.json',import.meta.url)),d=JSON.parse(bytes);
const workBytes=await readFile(new URL('../public/data/places-work.json',import.meta.url)),work=JSON.parse(workBytes),places=new Map(work.rows.map(r=>[r[0],r]));
assert.equal(d.manifest.catalogueSHA256,createHash('sha256').update(workBytes).digest('hex'));
assert.equal(d.manifest.md5,'215e1ff30fe4d4adef2db3d664dab9da');assert.equal(d.manifest.license,'ODbL-1.0');assert.equal(d.manifest.crs,'EPSG:4326');
assert(gzipSync(bytes).length<=1_000_000,'The index carries no geometry');
assert(!('buildings' in d)&&!('streets' in d)&&!('junctions' in d),'Geometry lives in the per-area files, never in the index');
assert.equal(d.areas.length,12);
assert.deepEqual(d.areas.slice(0,5).map(a=>a.id),['ari','samyan','charoenkrung','thonglo','ramkhamhaeng'],'The five authored areas keep their place');
assert.deepEqual(d.areas.slice(5).map(a=>a.id).sort(),['bangkapi','chatuchak','dindaeng','pathumwan','phranakhon','prawet','samphanthawong'],'Seven districts chosen by cafe density');
for(const a of d.areas){assert(a.name&&a.radiusM===800);assert(a.anchor&&a.anchor.sourceID);assert(a.cafesWithin800m>0,'Every area states its catalogue cafe count')}
assert.equal(d.areas.find(a=>a.id==='ramkhamhaeng').anchor.sourceID,'o825832f94e7f');

const point=c=>{assert.equal(c.length,2);assert(c.every(Number.isFinite));assert(c[0]>100&&c[0]<101&&c[1]>13&&c[1]<14)};
const restricted=new Set(['no','private','customers','permit','military']);
let known=0,rendered=0,footprints=0,streetCount=0,junctionCount=0;
for(const area of d.areas){
 const ab=await readFile(new URL(`../public/data/street-world/${area.id}.json`,import.meta.url));
 assert(gzipSync(ab).length<=400_000,`${area.id} stays a light enough file to fetch on demand`);
 const f=JSON.parse(ab);
 assert.equal(f.id,area.id);assert.equal(f.name,area.name);assert.deepEqual(f.anchor,area.anchor);
 const bs=new Map(f.buildings.features.map(x=>[x.id,x])),ss=new Map(f.streets.features.map(x=>[x.id,x]));
 assert.equal(bs.size,f.buildings.features.length);assert.equal(ss.size,f.streets.features.length);
 footprints+=bs.size;streetCount+=ss.size;junctionCount+=Object.keys(f.junctions).length;
 for(const[id,x]of bs){assert(/^[wr]\d+$/.test(id));assert.equal(id,x.properties.sourceID);assert(['Polygon','MultiPolygon'].includes(x.geometry.type));const ps=x.geometry.type==='Polygon'?[x.geometry.coordinates]:x.geometry.coordinates;for(const p of ps)for(const ring of p){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));ring.forEach(point)}
  const p=x.properties;if(p.heightM!==null){known++;assert(p.heightM>0&&p.heightM<=1000);assert(['height','building:height'].includes(p.heightBasis));const raw=p.tags[p.heightBasis];assert(/^[\d.]+\s*(m|metres?|meters?)?$/i.test(raw.trim()),'No floor/default/range/feet can produce metre height');assert.equal(parseFloat(raw),p.heightM);assert(p.minHeightM>=0&&p.minHeightM<p.heightM)}else{assert.equal(p.heightBasis,null);assert.equal(p.minHeightM,null);assert.equal(p.render3D,false)}
  assert.equal(typeof p.render3D,'boolean');if(p.render3D){rendered++;assert(p.heightM!==null);assert.equal(p.flatReason,null)}else assert(p.flatReason);
 }
 for(const[id,x]of ss){const p=x.properties;assert(id.startsWith(p.sourceID+'-'));assert(/^w\d+$/.test(p.sourceID));assert.equal(x.geometry.type,'LineString');assert.equal(p.nodeIDs.length,x.geometry.coordinates.length);assert(p.nodeIDs.length>=2);for(const n of p.nodeIDs)assert(/^n\d+$/.test(n));x.geometry.coordinates.forEach(point);for(const k of ['access','foot'])for(const v of p[k].split(';'))assert(!restricted.has(v.trim().toLowerCase()));assert(!['motorway','trunk','construction','proposed'].includes(p.highway));assert(p.lengthM>0);for(const id of p.cafeIDs)assert.equal(places.get(id)?.[2],0,'Cafe association must resolve to current actual catalogue')}
 for(const[id,j]of Object.entries(f.junctions)){assert(/^n\d+$/.test(id));point([j.x,j.y]);assert(j.streetIDs.length>=2);assert.equal(new Set(j.streetIDs).size,j.streetIDs.length);for(const sid of j.streetIDs){const x=ss.get(sid);assert(x);const i=x.properties.nodeIDs.indexOf(id);assert(i>=0);assert.deepEqual(x.geometry.coordinates[i],[j.x,j.y])}}
 assert(f.streetIDs.length>0&&bs.size>0);
 assert.equal(new Set(f.streetIDs).size,f.streetIDs.length);
 for(const id of f.streetIDs)assert(ss.has(id));for(const id of f.placeIDs)assert(places.has(id));
 assert.equal(f.counts.footprints,bs.size);assert.equal(f.counts.streets,ss.size);assert.equal(f.counts.junctions,Object.keys(f.junctions).length);
 assert.equal(f.counts.heightVolumes,f.buildings.features.filter(x=>x.properties.render3D).length);
 assert.equal(area.heightVolumes,f.counts.heightVolumes,'Launcher coverage matches source geometry');
 assert.equal(f.counts.explicitHeights,f.buildings.features.filter(x=>x.properties.heightM!==null).length);
}
assert.equal(d.manifest.areas,12);
assert(known>0&&known<footprints,'Coverage must expose unknown height rather than fabricate full3D');
console.log(`Street world: 12 areas in per-area files, index ${gzipSync(bytes).length}B gzip, ${footprints} footprints / ${known} explicit heights / ${rendered} native extrusions, ${streetCount} original node-runs, ${junctionCount} shared-node junctions; no invented height/location.`);
