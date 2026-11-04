// Exercise real Worker routes with independent cold module graphs and held asset responses.
import assert from'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{mkdtemp,cp,readFile,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{pathToFileURL}from'node:url';
const root=new URL('../',import.meta.url),base='https://alias.test',score={place:'n1',wifi:3,power:2,quiet:2,laptop:3},payload={name:'Fixture neighbour',note:'A survivor recommendation',stars:4,words:[],photos:[]};
const work={kinds:['cafe','restaurant'],rows:[['n100','Survivor café',0,13.7,100.5,0,'000000',1]]},food={kinds:['cafe','restaurant'],rows:[['n200','Food venue',1,13.71,100.51,0,'000000',1]]};
const gate=()=>{let release,reached;return{released:new Promise(r=>release=r),entered:new Promise(r=>reached=r),release:()=>release(),reached:()=>reached()}};
async function fixture(options={}){
 const dir=await mkdtemp(join(tmpdir(),'plub-alias-test-'));await cp(new URL('src/',root),join(dir,'src'),{recursive:true});const worker=(await import(pathToFileURL(join(dir,'src/worker.js')).href)).default;
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(await readFile(new URL('db/schema.sql',root),'utf8'));db.exec(await readFile(new URL('db/notebook.sql',root),'utf8'));
 db.prepare('INSERT INTO notebook_accounts(id,key_hash,name,created_at) VALUES(?,?,?,?)').run('fixture-account','fixture-key-hash','Fixture neighbour','2026-11-04');
 db.prepare('INSERT INTO notebook_entries VALUES(?,?,?,?,?,?)').run('fixture-entry','fixture-account','n100',JSON.stringify(payload),1,'2026-11-04');
 db.prepare('INSERT INTO notebook_posts(id,account_id,entry_id,place_id,payload,created_at) VALUES(?,?,?,?,?,?)').run('fixture-post','fixture-account','fixture-entry','n100',JSON.stringify(payload),'2026-11-04');
 const calls=new Map(),queries=[];
 const DB={prepare(sql){let values=[];const s={bind(...v){values=v;return s},async first(){queries.push(sql);return db.prepare(sql).get(...values)||null},async all(){queries.push(sql);return{results:db.prepare(sql).all(...values)}},async run(){queries.push(sql);const r=db.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}}}};return s},async batch(statements){const out=[];for(const s of statements)out.push(await s.run());return out}};
 const env={DB,IP_SALT:'isolated-alias-test-not-production',ASSETS:{async fetch(url){const path=new URL(url).pathname,n=(calls.get(path)||0)+1;calls.set(path,n);if(options.hold?.[path]){options.hold[path].reached();await options.hold[path].released}const forced=options.response?.(path,n);if(forced)return forced;const data=path==='/data/places-work.json'?work:path==='/data/places-food.json'?food:path==='/data/aliases.json'?{'n1':'n100'}:null;return new Response(JSON.stringify(data),{status:data?200:404,headers:{'content-type':'application/json'}})}}};
 return{db,calls,queries,request:(path,method='GET',body,headers={})=>worker.fetch(new Request(base+path,{method,headers:{origin:base,'content-type':'application/json','cf-connecting-ip':'127.0.0.1',...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env),async close(){db.close();await rm(dir,{recursive:true,force:true})}};
}
let checks=0;
// Work ids already exist locally while food is held: concurrent requests still cannot observe them.
{
 const foodGate=gate(),aliasesGate=gate(),f=await fixture({hold:{'/data/places-food.json':foodGate,'/data/aliases.json':aliasesGate}});
 try{
  let firstDone=false,secondDone=false,communityDone=false;
  const first=f.request('/api/scores','POST',score).then(r=>(firstDone=true,r));await foodGate.entered;
  const second=f.request('/api/scores','POST',{...score,place:'n200'}).then(r=>(secondDone=true,r));
  const community=f.request('/api/community?place=n1').then(r=>(communityDone=true,r));await new Promise(r=>setTimeout(r,20));assert.deepEqual([firstDone,secondDone,communityDone],[false,false,false]);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ratings').get().n,0);
  foodGate.release();await aliasesGate.entered;await new Promise(r=>setTimeout(r,20));assert.deepEqual([firstDone,secondDone,communityDone],[false,false,false],'No route passes the alias loading barrier');
  assert.equal((await f.request('/api/scores')).status,200,'Existing rating reads do not depend on catalogue startup');
  aliasesGate.release();const responses=await Promise.all([first,second,community]);assert.deepEqual(responses.map(r=>r.status),[201,201,200]);assert.equal((await responses[2].json()).posts[0].note,payload.note);
  assert.deepEqual(f.db.prepare('SELECT place_id FROM ratings ORDER BY place_id').all().map(r=>r.place_id),['n100','n200']);for(const path of ['/data/places-work.json','/data/places-food.json','/data/aliases.json'])assert.equal(f.calls.get(path),1,'Concurrent requests share one initialization');checks++;
 }finally{await f.close()}
}
for(const route of ['score','community']){
 const f=await fixture();try{
  const r=route==='score'?await f.request('/api/scores','POST',score):await f.request('/api/community?place=n1');
  assert.equal(r.status,route==='score'?201:200,'The very first request resolves a retired id');
  if(route==='score')assert.equal(f.db.prepare('SELECT place_id FROM ratings').get().place_id,'n100');else assert.equal((await r.json()).posts[0].note,payload.note);checks++;
 }finally{await f.close()}
}
for(const route of ['score','community']){
 const f=await fixture({response:(path,n)=>path==='/data/aliases.json'&&n===1?new Response('Unavailable',{status:503}):null});
 try{
  const call=()=>route==='score'?f.request('/api/scores','POST',score):f.request('/api/community?place=n1');
  const failed=await call();assert.equal(failed.status,503);assert.equal(failed.headers.get('retry-after'),'5');assert.match((await failed.json()).error,/catalogue.*unavailable/i);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ratings').get().n,0);
  const retried=await call();assert.equal(retried.status,route==='score'?201:200);assert.equal(f.calls.get('/data/aliases.json'),2,'Alias outage is retried rather than cached as empty');if(route==='community')assert.equal((await retried.json()).posts[0].note,payload.note);checks++;
 }finally{await f.close()}
}
{
 const f=await fixture({response:(path,n)=>path==='/data/places-food.json'&&n===1?new Response('Missing',{status:404}):null});
 try{assert.equal((await f.request('/api/scores','POST',{...score,place:'n100'})).status,503);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ratings').get().n,0);assert.equal((await f.request('/api/scores','POST',score)).status,201);assert.equal(f.calls.get('/data/places-work.json'),2,'Partially loaded work ids are not published after food failure');checks++;}finally{await f.close()}
}
for(const invalid of [[],{'n1':'n2','n2':'n1'},{'n1':'n999'}]){
 const f=await fixture({response:(path,n)=>path==='/data/aliases.json'&&n===1?new Response(JSON.stringify(invalid),{headers:{'content-type':'application/json'}}):null});
 try{assert.equal((await f.request('/api/community?place=n1')).status,503);const retried=await f.request('/api/community?place=n1');assert.equal(retried.status,200);assert.equal((await retried.json()).posts.length,1);checks++;}finally{await f.close()}
}
{
 const f=await fixture({response:path=>path==='/data/aliases.json'?new Response(JSON.stringify({'n1':'n2','n2':'n100'}),{headers:{'content-type':'application/json'}}):null});
 try{assert.equal((await f.request('/api/scores','POST',score)).status,201);assert.equal(f.db.prepare('SELECT place_id FROM ratings').get().place_id,'n100');assert.equal((await f.request('/api/community?place=n2')).status,200);checks++;}finally{await f.close()}
}
console.log(`PASS aliases: ${checks} cold Worker cases; shared atomic init, first retired-id score/community, source failures/invalid aliases recover, no partial writes, alias chains canonicalize.`);
