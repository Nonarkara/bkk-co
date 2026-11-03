import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('../public/journey-model.js'),{isOpen}=require('../public/hours.js');
const load=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
let checks=0;const check=(name,fn)=>{fn();checks++};
const hashes={work:'67fe00fb832aeb49663083b10acc21350c5f93278402c090a530e39554f71395',food:'df43c22e5ea54a151e25c7abdda8bc6ae876114df5a5da9755625749428df29a'};let work;
for(const[name,hash]of Object.entries(hashes)){
 const bytes=await readFile(new URL(`../public/data/places-${name}.json`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);if(name==='work')work=JSON.parse(bytes);
}
const places=work.rows.map(([id,n,k,y,x,flags,g,idx,hours])=>({id,n,k:work.kinds[k],y,x,flags,g,idx,hours}));assert.equal(places.length,20720);
const[geo,join,evidence]=await Promise.all(['public/data/journey-geo.json','public/data/journey-places.json','public/data/journey-evidence.json'].map(load)),actual=M.makeData(geo,join,evidence);
check('real source references',()=>{
 assert.equal(actual.joinById.size,20720);assert.equal(actual.stationById.size,geo.stations.length);assert.equal(actual.parkingById.size,Object.keys(join.parking).length);
 assert.strictEqual(actual.raw.geo,geo);assert.strictEqual(actual.raw.join,join);assert.strictEqual(actual.raw.evidence,evidence);
 for(const p of places){const j=actual.joinById.get(p.id);assert(j);assert(actual.stationById.has(j.railID));assert(M.stationEligible(actual.stationById.get(j.railID)),'Builder must join only eligible rail stations');assert(M.stationEligible(actual.stationById.get(j.btsID)),'Builder must join only eligible BTS stations');assert(actual.stationById.get(j.btsID).systems.includes('BTS'));
  for(const[id,d]of[['parkingID','parkingM'],['parkingNotRestrictedID','parkingNotRestrictedM'],['parkingExplicitAccessID','parkingExplicitAccessM']]){
   assert.equal(j[id]===null,j[d]===null);if(j[id]){assert(actual.parkingById.has(j[id]));assert(j[d]>=0&&j[d]<=150)}
  }
  if(j.parkingNotRestrictedID)assert(['unknown','access_tagged'].includes(actual.parkingById.get(j.parkingNotRestrictedID).accessClass));
  if(j.parkingExplicitAccessID)assert.equal(actual.parkingById.get(j.parkingExplicitAccessID).accessClass,'access_tagged');
 }
 const ids=new Set(places.map(p=>p.id));for(const[id,p]of Object.entries(evidence.places)){assert(ids.has(id));for(const f of Object.values(p.facts))for(const source of f.source_ids||[])assert(evidence.sources[source]);}
 for(const o of geo.origins){assert.equal(o.kind,'hairdresser');assert(o.sourceID.startsWith('n'));assert(Number.isFinite(o.x)&&Number.isFinite(o.y))}
});
const origin={x:100.534,y:13.745,label:'Siam station'},now=new Date('2026-11-03T03:00:00Z'); // Bangkok10:00
const point=(id,x=100,y=0,extra={})=>({id,n:id,k:'cafe',x:origin.x+x/(111320*Math.cos(origin.y*Math.PI/180)),y:origin.y+y/111320,flags:0,idx:0,...extra});
const bts={...point('bts',0,0),systems:['BTS'],name:'Explicit BTS'},mrt={...point('mrt',100,0),systems:['MRT'],name:'Explicit MRT'};
const cols=['placeID','railID','railM','btsID','btsM','parkingID','parkingM','parkingNotRestrictedID','parkingNotRestrictedM','parkingExplicitAccessID','parkingExplicitAccessM'];
const first=(values,tier='first_party')=>({places:Object.fromEntries(Object.entries(values).map(([id,v])=>[id,{source_ids:['publisher'],facts:Object.fromEntries(Object.entries(v).map(([key,value])=>[key,{value,note:`Documented ${key}`,source_ids:['publisher'],checked_at:'2026-11-03'}]))}])),sources:{publisher:{tier,url:'https://example.org/branch',checked_at:'2026-11-03'}}});
const fixture=(ev={},rows=[],parking={},venueTags={})=>M.makeData({stations:[bts,mrt],manifest:{asOf:'2026-10-24'}},{workCols:cols,workRows:rows,parking,venueTags},ev);
const options={mode:'nearby',task:'laptop',origin,radius:800,duration:120};
const p=point('p');
check('publisher true and false dominate crowd and map proxies',()=>{
 const d=fixture(first({p:{wifi:false,power:true,parking:false,work_allowed:true,hours:'Mo-Su 07:00-20:00'}}));
 const f=M.facilities({...p,flags:1|256},d,{p:{n:5,wifi:2,power:1,last:'2026-11-02'}});
 assert.equal(f.wifi.value,false);assert.equal(f.power.value,true);assert.equal(f.parking.value,false);assert.equal(f.wifi.basis,'first_party');assert.deepEqual(f.power.source_ids,['publisher']);assert.equal(f.hours,'Mo-Su 07:00-20:00');
 assert.equal(M.rank([p],d,{},options,now,isOpen).length,0);
 const editorial=M.facilities(p,fixture(first({p:{power:true}},'editorial')),{});assert.equal(editorial.power.basis,'editorial');
});
check('unknown differs from no; coworking never invents outlets',()=>{
 const d=fixture(),f=M.facilities({...p,k:'coworking'},d,{});assert.equal(f.power.value,null);assert.equal(f.wifi.value,null);assert.equal(f.work_allowed.value,null);
 const r=M.rank([p],d,{},options,now,isOpen);assert.deepEqual(r[0].missing,['wifi','power']);assert.equal(r[0].stay,null);assert.equal(M.rank([p],d,{},{...options,strict:true},now,isOpen).length,0);
 assert.equal(M.facilities({...p,flags:2},d,{}).wifi.value,false);assert.equal(M.facilities({...p,flags:1},d,{}).wifi.value,true);
});
check('visitor votes retain count/date and explicit negative',()=>{
 const d=fixture();let f=M.facilities(p,d,{p:{n:3,wifi:2,power:1,laptop:2,last:'2026-11-01'}});
 assert.equal(f.wifi.value,true);assert.equal(f.power.value,false);assert.equal(f.work_allowed.value,true);assert.match(f.wifi.note,/3 visitor ratings.*2026-11-01/);
 f=M.facilities(p,d,{p:{n:0,wifi:0,power:2}});assert.equal(f.wifi.value,null);assert.equal(f.power.value,null);
 f=M.facilities(p,d,{p:{n:1,wifi:1.5,power:1.5,laptop:1.5}});assert.equal(f.wifi.value,null);assert.equal(f.power.value,null);assert.equal(f.work_allowed.value,null);
 assert.equal(M.rank([p],d,{p:{n:1,laptop:1}},{...options,task:'online'},now,isOpen).length,0);
 assert.equal(M.rank([p],d,{p:{n:1,laptop:1}},{...options,task:'read'},now,isOpen).length,1);
});
check('actual1–3 API score scale: No/None never becomes a positive',()=>{
 const d=fixture();
 for(const[field,facility]of [['wifi','wifi'],['power','power'],['laptop','work_allowed']]){
  const negative={p:{n:1,[field]:1,last:'2026-11-03'}};
  assert.equal(M.facilities(p,d,negative)[facility].value,false,`${field}=1 means No/None`);
  assert.equal(M.rank([p],d,negative,options,now,isOpen).length,0,`${field}=1 must refuse laptop work`);
  for(const value of [2,3])assert.equal(M.facilities(p,d,{p:{n:1,[field]:value}})[facility].value,true);
  for(const value of [0,4,Infinity,-Infinity,NaN,'2',null])assert.equal(M.facilities(p,d,{p:{n:1,[field]:value}})[facility].value,null,`Invalid ${field}=${value} stays unknown`);
 }
});
check('exact tags are scoped to venue, and electricity is not a socket',()=>{
 let d=fixture({},[],{},{p:{sourceID:'p',tags:{internet_access:'no',parking:'yes','socket:schuko':'2'}}});let f=M.facilities({...p,flags:1},d,{});
 assert.equal(f.wifi.value,false);assert.equal(f.parking.value,true);assert.equal(f.power.value,true);
 d=fixture({},[],{},{p:{tags:{electricity:'grid','socket:schuko':'0'}}});assert.equal(M.facilities(p,d,{}).power.value,null);
 for(const tags of [{power_supply:'solar'},{socket:'garbage'},{'socket:type2':'2'},{'socket:chademo':'yes'},{'socket:ccs':'1'}]){
  d=fixture({},[],{},{p:{tags}});assert.equal(M.facilities(p,d,{}).power.value,null,'Unknown generation/EV tags cannot assert laptop outlets');
 }
 for(const tags of [{socket:'yes'},{power_supply:'yes'},{'socket:schuko':'yes'},{'socket:schuko':'2'}]){
  d=fixture({},[],{},{p:{tags}});assert.equal(M.facilities(p,d,{}).power.value,true,'Explicit socket/mains evidence remains usable');
 }

});
check('drive: nearby private/customer/unknown parks do not assert usable parking',()=>{
 const wifiPower=first({p:{wifi:true,power:true}});
 for(const [access,accessClass]of[['private','private_or_no'],['customers','customers'],[undefined,'unknown']]){
  const d=fixture(wifiPower,[['p','mrt',100,'bts',100,'park',150,'park',150,null,null]],{park:{sourceID:'w1',accessClass,tags:access?{access}:{}}});
  const f=M.facilities({...p,flags:256},d,{});assert.equal(f.parking.value,null);assert.match(f.parking.note,/150 m straight-line/);
  assert.equal(M.rank([p],d,{},{...options,mode:'drive',strict:true},now,isOpen).length,0);
 }
 const d=fixture(wifiPower,[['p','mrt',100,'bts',100,'private',20,'unknown',40,'public',100]],{
  private:{sourceID:'w1',accessClass:'private_or_no',tags:{access:'private'}},unknown:{sourceID:'w2',accessClass:'unknown',tags:{}},public:{sourceID:'w3',accessClass:'access_tagged',tags:{access:'permissive'}}});
 const f=M.facilities(p,d,{});assert.equal(f.parking.value,true);assert.equal(f.parking.basis,'nearby_explicit_access');assert.deepEqual(f.parking.source_ids,['w3']);assert.match(f.parking.note,/Not venue\/on-site/);
 assert.equal(M.rank([p],d,{},{...options,mode:'drive',strict:true},now,isOpen).length,1);
});
check('stay: every15minutes plus exact endpoint, with unknown hours retained',()=>{
 const d=fixture(first({p:{hours:'Mo-Su 07:00-12:00'}}));assert.equal(M.rank([p],d,{},{...options,task:'read'},now,isOpen).length,0,'Closing exactly at the endpoint is excluded');
 assert.equal(M.rank([p],d,{},{...options,task:'read',duration:105},now,isOpen)[0].stay,true);
 const sampled=[];M.rank([p],fixture(first({p:{hours:'24/7'}})),{},{...options,task:'read',duration:32},now,(h,t)=>{sampled.push((t-now)/60000);return true});assert.deepEqual(sampled,[0,15,30,32]);
 assert.equal(M.rank([p],fixture(),{},{...options,task:'read'},now,isOpen)[0].stay,null);
 assert.equal(M.rank([p],fixture(first({p:{hours:'Mo-Su 09:00-09:30'}})),{},{...options,task:'read'},now,isOpen).length,0);
});
check('visitor pass clock overrides full-member24/7 without inventing weekdays',()=>{
 const ev=first({p:{hours:'24/7',day_pass:{access_hours:'09:00-18:00'}}}),d=fixture(ev);
 assert.equal(M.rank([p],d,{},{...options,task:'read',strict:true},new Date('2026-11-03T10:00:00Z'),isOpen).length,0,'17:00plus2h exceeds18:00 visitor access');
 assert.equal(M.rank([p],d,{},{...options,task:'read'},new Date('2026-11-03T09:00:00Z'),isOpen).length,0,'Exact18:00 endpoint is outside the visitor window');
 assert.equal(M.rank([p],d,{},{...options,task:'read'},now,isOpen)[0].stay,null,'Clock alone does not establish weekdays');
});
check('station access and lifecycle restrictions never become public rail recommendations',()=>{
 for(const tags of [{access:'no'},{access:'private'},{access:'permit'},{access:'military'},{access:'private;permit'},{disused:'yes'},{proposed:'station'},{construction:'yes'},{'construction:railway':'station'},{railway:'disused'},{station:'construction'}]){
  const closed={...bts,tags};assert.equal(M.stationEligible(closed),false);
  const d=fixture({},[['p','bts',100,'bts',100,null,null,null,null,null,null]]);d.stationById.set('bts',closed);
  for(const extra of [{},{stationID:'bts'}])assert.equal(M.rank([p],d,{},{mode:'rail',task:'read',system:'all',...extra},now,isOpen).length,0,'Restricted station rejected even if stale join or explicitly selected');
 }
 assert.equal(M.stationEligible({...bts,tags:{internet_access:'no'}}),true,'Internet availability is not station entry permission');
 assert.equal(M.stationEligible({...bts,tags:{disused:'no',construction:'false'}}),true);
 const chitlada=actual.stationById.get('n259723396');assert(chitlada);assert.equal(chitlada.tags.access,'no');assert.equal(chitlada.eligible,false);assert.equal(M.stationEligible(chitlada),false);
 assert([...actual.joinById.values()].every(j=>j.railID!==chitlada.id&&j.btsID!==chitlada.id));
 for(const id of ['n451697335','n5391610985']){const station=actual.stationById.get(id);assert.equal(station.tags.internet_access,'no');assert.equal(M.stationEligible(station),true,'Sala Daeng/Phra Khanong stay eligible despite no internet');}
 assert.equal(geo.manifest.counts.eligibleStations,geo.stations.filter(M.stationEligible).length);
});
check('rail: MRT cannot masquerade as BTS, and direct station selection is geometric',()=>{
 const d=fixture({},[['p','mrt',100,'bts',1200,null,null,null,null,null,null]]),opts={mode:'rail',task:'read',system:'BTS',lastMile:'walk',duration:120};
 assert.equal(M.rank([p],d,{},opts,now,isOpen).length,0);
 let r=M.rank([p],d,{},{...opts,system:'all'},now,isOpen);assert.equal(r[0].station.id,'mrt');assert.equal(r[0].stationDistance,100);assert.equal(r[0].d,100);
 assert.equal(M.rank([p],d,{},{...opts,lastMile:'ride'},now,isOpen).length,1);
 assert.equal(M.rank([p],d,{},{...opts,stationID:'mrt'},now,isOpen).length,0);
 r=M.rank([p],d,{},{...opts,stationID:'bts'},now,isOpen);assert.equal(r.length,1);assert(Math.abs(r[0].stationDistance-M.dist(p,bts))<.001);
});
check('nearby barber origin: radius and river scope are honest and fail closed when guarded',()=>{
 const d=fixture(),opts={...options,task:'read',origin:{...origin,id:'barber',label:'Actual barber origin'}};
 assert.equal(M.rank([p,point('far',1000)],d,{},opts,now,isOpen).length,1);assert.equal(M.rank([p],d,{},opts,now,isOpen,()=>true).length,0);
 assert.throws(()=>M.requireRiver(null),/unavailable/);assert.throws(()=>M.requireRiver(false),/unavailable/);assert.strictEqual(M.requireRiver(isOpen),isOpen);
 assert.equal(M.rank([p],d,{},{...opts,origin:null},now,isOpen).length,0);
});
check('sorting prioritizes missing facts, known permission, proximity, then index',()=>{
 const a=point('a',200,0,{idx:100}),b=point('b',100,0,{idx:0}),c=point('c',10,0,{idx:100});
 const d=fixture(first({a:{wifi:true,power:true,work_allowed:true},b:{wifi:true,power:true},c:{wifi:true}}));
 assert.deepEqual(M.rank([c,b,a],d,{},options,now,isOpen).map(r=>r.p.id),['a','b','c']);
 const tied=point('tied',100,0,{idx:100}),d2=fixture(first({b:{wifi:true,power:true},tied:{wifi:true,power:true}}));assert.deepEqual(M.rank([b,tied],d2,{},options,now,isOpen).map(r=>r.p.id),['tied','b']);
});
check('Google handoff includes exact origin and destination, never executable labels',()=>{
 const url=new URL(M.directions(p,{...origin,label:'$(secret); &destination=elsewhere'},'drive'));
 assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('api'),'1');assert.equal(url.searchParams.get('origin'),`${origin.y},${origin.x}`);assert.equal(url.searchParams.get('destination'),`${p.y},${p.x}`);assert.equal(url.searchParams.get('travelmode'),'driving');assert(!url.href.includes('secret'));
 assert.equal(new URL(M.directions(p,bts,'rail')).searchParams.get('travelmode'),'walking');assert.equal(new URL(M.directions(p,bts,'two-wheeler')).searchParams.get('travelmode'),'two-wheeler');assert.equal(new URL(M.directions(p,null)).searchParams.has('origin'),false);assert.equal(M.directions({x:NaN,y:0},origin),null);
});
check('real Ramkhamhaeng driving journey keeps branch-specific facility evidence',()=>{
 const ram=geo.stations.find(s=>s.id==='n6711009224');assert.equal(ram.name,'Ramkhamhaeng');
 const ranked=M.rank(places,actual,{},{mode:'drive',task:'laptop',origin:ram,radius:5000,duration:120,strict:true},now,isOpen);
 const vich=ranked.find(r=>r.p.id==='oe0a5a241cfc8');assert(vich,'VichSpace has documented facilities inside the5km straight-line search');
 assert.equal(vich.facilities.parking.basis,'first_party');assert.equal(vich.facilities.power.value,true);assert.equal(vich.stay,true);assert(vich.d<5000);
});
console.log(`PASS journeys: ${checks} data/model cases, conserved catalogue hashes, ${places.length} workplace references, three journey modes, facility provenance, full-stay hours, river guard and Google handoffs.`);
