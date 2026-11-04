import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const bytes=await readFile(new URL('../public/data/street-world.json',import.meta.url)),d=JSON.parse(bytes);
const workBytes=await readFile(new URL('../public/data/places-work.json',import.meta.url)),work=JSON.parse(workBytes),places=new Map(work.rows.map(r=>[r[0],r]));
assert.equal(d.manifest.catalogueSHA256,createHash('sha256').update(workBytes).digest('hex'));
assert.equal(d.manifest.md5,'215e1ff30fe4d4adef2db3d664dab9da');assert.equal(d.manifest.license,'ODbL-1.0');assert.equal(d.manifest.crs,'EPSG:4326');assert(gzipSync(bytes).length<=1_000_000);
assert.equal(d.areas.length,5);assert.deepEqual(d.areas.map(a=>a.id),['ari','samyan','charoenkrung','thonglo','ramkhamhaeng']);
const bs=new Map(d.buildings.features.map(f=>[f.id,f])),ss=new Map(d.streets.features.map(f=>[f.id,f]));assert.equal(bs.size,d.buildings.features.length);assert.equal(ss.size,d.streets.features.length);
let known=0,rendered=0;const point=c=>{assert.equal(c.length,2);assert(c.every(Number.isFinite));assert(c[0]>100&&c[0]<101&&c[1]>13&&c[1]<14)};
for(const[id,f]of bs){assert(/^[wr]\d+$/.test(id));assert.equal(id,f.properties.sourceID);assert(['Polygon','MultiPolygon'].includes(f.geometry.type));const ps=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const p of ps)for(const ring of p){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));ring.forEach(point)}
 const p=f.properties;if(p.heightM!==null){known++;assert(p.heightM>0&&p.heightM<=1000);assert(['height','building:height'].includes(p.heightBasis));const raw=p.tags[p.heightBasis];assert(/^[\d.]+\s*(m|metres?|meters?)?$/i.test(raw.trim()),'No floor/default/range/feet can produce metre height');assert.equal(parseFloat(raw),p.heightM);assert(p.minHeightM>=0&&p.minHeightM<p.heightM)}else{assert.equal(p.heightBasis,null);assert.equal(p.minHeightM,null);assert.equal(p.render3D,false)}
 assert.equal(typeof p.render3D,'boolean');if(p.render3D){rendered++;assert(p.heightM!==null);assert.equal(p.flatReason,null)}else assert(p.flatReason);
}
assert.equal(known,d.manifest.explicitHeightCount);assert.equal(rendered,d.manifest.renderedHeightCount);assert.equal(bs.size,d.manifest.buildingCount);assert.equal(bs.size-known,d.manifest.unknownHeightCount);assert(known>0&&known<bs.size,'Coverage must expose unknown height rather than fabricate full3D');
const restricted=new Set(['no','private','customers','permit','military']);
for(const[id,f]of ss){const p=f.properties;assert(id.startsWith(p.sourceID+'-'));assert(/^w\d+$/.test(p.sourceID));assert.equal(f.geometry.type,'LineString');assert.equal(p.nodeIDs.length,f.geometry.coordinates.length);assert(p.nodeIDs.length>=2);for(const n of p.nodeIDs)assert(/^n\d+$/.test(n));f.geometry.coordinates.forEach(point);for(const k of ['access','foot'])for(const v of p[k].split(';'))assert(!restricted.has(v.trim().toLowerCase()));assert(!['motorway','trunk','construction','proposed'].includes(p.highway));assert(p.lengthM>0);for(const id of p.cafeIDs)assert.equal(places.get(id)?.[2],0,'Cafe association must resolve to current actual catalogue');}
for(const[id,j]of Object.entries(d.junctions)){assert(/^n\d+$/.test(id));point([j.x,j.y]);assert(j.streetIDs.length>=2);assert.equal(new Set(j.streetIDs).size,j.streetIDs.length);for(const sid of j.streetIDs){const f=ss.get(sid);assert(f);let i=f.properties.nodeIDs.indexOf(id);assert(i>=0);assert.deepEqual(f.geometry.coordinates[i],[j.x,j.y])}}
for(const a of d.areas){assert(a.name&&a.radiusM===800);point([a.anchor.x,a.anchor.y]);assert(a.streetIDs.length>0&&a.buildingIDs.length>0);assert.equal(new Set(a.streetIDs).size,a.streetIDs.length);for(const id of a.streetIDs)assert(ss.has(id));for(const id of a.buildingIDs)assert(bs.has(id));for(const id of a.placeIDs)assert(places.has(id));}
assert.equal(d.areas.find(a=>a.id==='ramkhamhaeng').anchor.sourceID,'o825832f94e7f');
console.log(`Street world:5source areas,${bs.size}footprints/${known}explicitheights/${rendered}nativeextrusions,${ss.size}originalnode-runs,${Object.keys(d.junctions).length}shared-nodejunctions; no invented height/location and<1MBgzip.`);
