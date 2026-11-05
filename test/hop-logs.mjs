// Café hop logs publish as a community feed. Posts, notebooks and account boundaries still hold.
import {DatabaseSync} from 'node:sqlite';import{readFile}from'node:fs/promises';import assert from'node:assert/strict';
import {notebookApi,validateHop}from'../src/notebook.js';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(await readFile(new URL('../db/notebook.sql',import.meta.url),'utf8'));
const binding={prepare(sql){let values=[];const s={bind(...v){values=v;return s},async first(){return db.prepare(sql).get(...values)||null},async all(){return{results:db.prepare(sql).all(...values)}},async run(){const r=db.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}}}};return s},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
const env={DB:binding,IP_SALT:'local-unit-test-salt',MODERATION_KEY:'local-test-moderation-key'},base='https://local.test';
const ids=new Set(['h0001','h0002','h0003']);
const request=(path,method='GET',body,headers={})=>notebookApi(new Request(base+'/api/'+path,{method,headers:{origin:base,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),env,async()=>ids);
const call=async(path,method='GET',body,headers={})=>{const r=await request(path,method,body,headers);return{status:r.status,body:await r.json()}};
const signup=async name=>{const r=await request('account/create','POST',{name}),d=await r.json();return{id:d.account.id,cookie:r.headers.get('set-cookie').split(';')[0]}};
const auth=who=>({cookie:who.cookie,'x-plub-account':who.id});
const moderator={'x-plub-moderator':env.MODERATION_KEY};
const photo='data:image/jpeg;base64,'+(await readFile(new URL('fixtures/photo.jpg',import.meta.url))).toString('base64');
const hop1='hop000000000001',hop2='hop000000000002';
const author=await signup('Hop author'),neighbour=await signup('Neighbour'),r1=await signup('Reporter one'),r2=await signup('Reporter two'),r3=await signup('Reporter three');
// Publish a hop log: it lands in the feed, with the caller's walking order intact.
const published=await call('hops/'+hop1,'PUT',{stops:['h0001','h0002'],note:'Two stops, one long afternoon.',words:['Calm','Calm'],photos:[photo]},auth(author));
assert.equal(published.status,200);assert.deepEqual(published.body,{id:hop1});
let feed=(await call('hops','GET',undefined,auth(author))).body;
assert.equal(feed.hops.length,1);assert.equal(feed.limit,10);
assert.deepEqual(Object.keys(feed.hops[0]).sort(),['created','id','mine','name','note','photos','stops','words']);
assert.equal(feed.hops[0].id,hop1);assert.equal(feed.hops[0].name,'Hop author');
assert.deepEqual(feed.hops[0].stops,['h0001','h0002'],'the walking order is kept');
assert.deepEqual(feed.hops[0].words,['Calm'],'feelings are unique');
assert.equal(feed.hops[0].photos.length,1);assert.equal(feed.hops[0].mine,true,'the author sees mine');
assert.ok(feed.hops[0].created,'the publication time is present');
assert.equal(feed.hops[0].at,undefined,'a hop log carries no visit date');
assert.equal(feed.hops[0].created_at,undefined);
assert.equal((await call('hops','GET',undefined,auth(neighbour))).body.hops[0].mine,false,'another account sees mine false');
// Republishing the same id replaces the hop; it never duplicates.
assert.equal((await call('hops/'+hop1,'PUT',{stops:['h0002','h0001'],note:'Second pass, same walk.',words:['Slow'],photos:[photo]},auth(author))).status,200);
feed=(await call('hops')).body;
assert.equal(feed.hops.length,1,'republishing one id keeps one row');
assert.equal(feed.hops[0].note,'Second pass, same walk.');assert.deepEqual(feed.hops[0].stops,['h0002','h0001']);
assert.equal((await call('hops/'+hop2,'PUT',{stops:['h0002','h0003'],note:'An afternoon elsewhere.',words:[],photos:[]},auth(neighbour))).status,200);
// The feed filters by place; an unknown place is refused.
feed=(await call('hops')).body;assert.equal(feed.hops.length,2);
assert.deepEqual((await call('hops?place=h0003')).body.hops.map(h=>h.id),[hop2],'only hops through that place');
assert.deepEqual((await call('hops?place=h0001')).body.hops.map(h=>h.id),[hop1]);
assert.deepEqual((await call('hops?place=h0002')).body.hops.map(h=>h.id).sort(),[hop1,hop2]);
const unknownPlace=await call('hops?place=zz9999');
assert.equal(unknownPlace.status,400);assert.equal(unknownPlace.body.error,'Unknown place.');
// Account isolation: another account cannot delete or touch this hop.
assert.equal((await call('hops/'+hop1,'DELETE','DELETE',auth(neighbour))).status,404,'another account cannot delete this hop');
assert.equal((await call('hops')).body.hops.length,2,'the hop survived');
assert.equal((await call('hops/'+hop1,'PUT',{stops:['h0001'],note:'x',words:[],photos:[]},{cookie:neighbour.cookie,'x-plub-account':author.id})).status,409,'a stale account header is refused');
// Validation: stops, note, feelings, photos.
assert.equal((await call('hops/hop000000000009','PUT',{stops:new Array(9).fill('h0001'),note:'Too many',words:[],photos:[]},auth(author))).status,400,'at most eight stops');
assert.equal((await call('hops/hop000000000010','PUT',{stops:['h0001','h0001'],note:'Twice',words:[],photos:[]},auth(author))).status,400,'a stop may not repeat');
assert.equal((await call('hops/hop000000000011','PUT',{stops:['h0001'],note:'x'.repeat(601),words:[],photos:[]},auth(author))).status,400,'notes are at most 600 characters');
assert.equal((await call('hops/hop000000000012','PUT',{stops:['h0001'],note:'ok',words:['Excited'],photos:[]},auth(author))).status,400,'unknown feeling');
assert.equal((await call('hops/hop000000000013','PUT',{stops:['h0001'],note:'ok',words:[],photos:['data:image/svg+xml;base64,AAA=']},auth(author))).status,400,'SVG is not a photo');
const bare=await call('hops/hop000000000014','PUT',{stops:['h0001'],note:'   ',words:[],photos:[]},auth(author));
assert.equal(bare.status,400);assert.equal(bare.body.error,'Add a note or a photo first.');
const ghost=await call('hops/hop000000000015','PUT',{stops:['zz9999'],note:'ok',words:[],photos:[]},auth(author));
assert.equal(ghost.status,400);assert.equal(ghost.body.error,'This place is not in the current catalogue.');
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_hops').get().n,2,'a refused hop is never stored');
// Three distinct reports hide the hop; a moderator restores it.
assert.equal((await call('hops/'+hop2+'/report','POST',{reason:'spam'},auth(author))).status,200,'a hop can be reported');
for(const who of [r1,r2,r3])assert.equal((await call('hops/'+hop1+'/report','POST',{reason:'privacy'},auth(who))).status,200);
assert.equal((await call('hops')).body.hops.find(h=>h.id===hop1),undefined,'three distinct reports hide the hop');
assert.equal((await call('hops/'+hop1+'/report','POST',{reason:'rude'},auth(r1))).status,200,'a repeat reporter may report again');
const queue=(await call('moderation','GET',undefined,moderator)).body;
assert.ok(Array.isArray(queue.posts),'the moderation queue still lists posts');
const queued=queue.hops.find(h=>h.id===hop1);
assert.equal(queued.reports,3);assert.equal(queued.hidden,1);assert.ok(String(queued.reasons).includes('privacy'));
assert.deepEqual(queued.payload.stops,['h0002','h0001'],'the authenticated moderator can inspect the public itinerary');
assert.equal((await call('hops/'+hop1,'PATCH',{visible:true},moderator)).status,200);
assert.ok((await call('hops')).body.hops.find(h=>h.id===hop1),'a restored hop is visible again');
assert.equal((await call('moderation','GET',undefined,moderator)).body.hops.find(h=>h.id===hop1).reports,0,'restoring clears the reports');
assert.equal((await call('hops/'+hop1,'PATCH',{visible:true},auth(author))).status,404,'only a moderator restores');
// The author exports their own hop log; nobody else can.
const mine=(await call('account/contributions','GET',undefined,auth(author))).body;
assert.equal(mine.hops.length,1);assert.equal(mine.hops[0].id,hop1);
assert.equal(mine.hops[0].payload.photos,undefined,'the export list omits photo payload');
assert.equal(mine.hops[0].photoCount,1,'the export list keeps the photo count');
assert.equal(mine.hops[0].payload.stops.length,2);
const snapshot=(await call('account/contributions/hop/'+hop1,'GET',undefined,auth(author))).body;
assert.equal(snapshot.payload.photos.length,1,'the owned snapshot is complete');assert.equal(snapshot.hidden,0);
assert.equal((await call('account/contributions/hop/'+hop1,'GET',undefined,auth(neighbour))).status,404,'export isolation');
// Reporting data belongs in the reporter's export, with account boundaries intact.
const authorReports=(await call('account/contributions','GET',undefined,auth(author))).body;
assert.deepEqual(authorReports.hopReports.map(r=>[r.hop_id,r.reason]),[[hop2,'spam']]);
assert.ok(authorReports.hopReports[0].created_at);
assert.deepEqual((await call('account/contributions','GET',undefined,auth(neighbour))).body.hopReports,[]);
// The storage bound matches the complete export bound, including concurrent attempts
// for the last slot. Existing owned visible logs can still be updated when full.
const quotaAuthor=await signup('Quota author'),quotaIds=[];
const quotaBody={stops:['h0001'],note:'A bounded hop.',words:[],photos:[]};
const quotaAuth=i=>({...auth(quotaAuthor),'cf-connecting-ip':'192.0.2.'+(i+1)});
for(let i=0;i<99;i++){
 const id='quota'+String(i).padStart(12,'0');quotaIds.push(id);
 assert.equal((await call('hops/'+id,'PUT',quotaBody,quotaAuth(i))).status,200);
}
const lastIds=['quotalast000001','quotalast000002'];
const last=await Promise.all(lastIds.map((id,i)=>call('hops/'+id,'PUT',quotaBody,quotaAuth(100+i))));
assert.deepEqual(last.map(r=>r.status).sort(),[200,409],'one concurrent contender gets the last slot');
assert.match(last.find(r=>r.status===409).body.error,/100 hop logs/);
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_hops WHERE account_id=?').get(quotaAuthor.id).n,100);
assert.equal((await call('account/contributions','GET',undefined,auth(quotaAuthor))).body.hops.length,100,'every owned hop remains exportable');
assert.equal((await call('hops/'+quotaIds[0],'PUT',{...quotaBody,note:'Edited at full capacity.'},quotaAuth(103))).status,200,'full accounts can update');
assert.equal((await call('hops/'+quotaIds[0],'PUT',quotaBody,auth(neighbour))).status,409,'another account cannot replace a quota hop');
db.prepare('UPDATE notebook_hops SET hidden=1 WHERE id=?').run(quotaIds[0]);
assert.equal((await call('hops/'+quotaIds[0],'PUT',quotaBody,quotaAuth(104))).status,409,'hidden hops cannot be updated even when full');
assert.equal((await call('hops/'+quotaIds[1],'DELETE',undefined,auth(quotaAuthor))).status,200);
assert.equal((await call('hops/quotareplace0001','PUT',quotaBody,quotaAuth(105))).status,200,'deleting frees one storage slot');
assert.equal((await call('account','DELETE',undefined,auth(quotaAuthor))).status,200);
// The pre-existing notebook and community flows still work.
const entry='entry000000001';
const saved=await call('notebook/'+entry,'PUT',{place:'h0001',at:'2026-11-03',stars:4,note:'A private visit.',words:[],photos:[],revision:0},auth(author));
assert.equal(saved.status,200);assert.equal(saved.body.revision,1);
assert.equal((await call('notebook','GET',undefined,auth(author))).body.entries.length,1);
const post=await call('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:1},auth(author));
assert.equal(post.status,200);
const community=(await call('community?place=h0001','GET',undefined,auth(author))).body;
assert.equal(community.posts.length,1,'the community feed still publishes recommendations');
assert.equal(community.posts[0].mine,true);assert.equal(community.posts[0].place,undefined,'a published post carries no private place');
assert.equal((await call('account/contributions','GET',undefined,auth(author))).body.posts[0].photoCount,0);
// Deleting the account takes its hop logs and hop reports with it.
assert.equal((await call('account','DELETE',undefined,auth(author))).status,200);
feed=(await call('hops')).body;
assert.equal(feed.hops.find(h=>h.id===hop1),undefined,'the deleted account left no hop log');
assert.ok(feed.hops.find(h=>h.id===hop2),'another account hop survives');
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_hop_reports WHERE account_id=?').get(author.id).n,0,'the deleted account left no hop report');
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_hop_reports WHERE hop_id=?').get(hop1).n,0,'reports on a deleted hop go with it');
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_hops WHERE account_id=?').get(author.id).n,0);
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_entries WHERE account_id=?').get(author.id).n,0);
assert.equal((await call('community?place=h0001')).body.posts.length,0,'the published post goes with the account');
assert.equal((await call('account/contributions','GET',undefined,auth(author))).status,401,'the session is gone');
// The validator itself: canonical order, limits, and no date field.
assert.deepEqual(validateHop({stops:['h0002','h0001'],note:'ok',words:[],photos:[]},ids).stops,['h0002','h0001']);
assert.deepEqual(Object.keys(validateHop({stops:['h0001'],note:'ok',words:[],photos:[]},ids)),['stops','note','words','photos'],'a hop log has no date field');
assert.throws(()=>validateHop({stops:['h0001','h0001'],note:'ok',words:[],photos:[]},ids),/appears once/);
assert.throws(()=>validateHop({stops:new Array(9).fill('h0001'),note:'ok',words:[],photos:[]},ids),/one to eight/);
assert.throws(()=>validateHop({stops:['zz9999'],note:'ok',words:[],photos:[]},ids),/not in the current catalogue/);
assert.throws(()=>validateHop({stops:['h0001'],note:'x'.repeat(601),words:[],photos:[]},ids),/600 characters/);
assert.throws(()=>validateHop({stops:['h0001'],note:'ok',words:['Excited'],photos:[]},ids),/Unknown feeling/);
assert.throws(()=>validateHop({stops:['h0001'],note:'',words:[],photos:[]},ids),/note or a photo/);
assert.throws(()=>validateHop({stops:['h0001'],note:'ok',words:[],photos:['data:image/svg+xml;base64,AAA=']},ids),/JPEG/);
console.log('Hop publish, feed, mine flags, place filter, account isolation, stale-account 409, stop/note/feeling/photo limits, three-report hiding, moderator restore, owned export including hop reports, atomic 100-hop storage bound, account deletion, and the unchanged notebook and community flows all pass.');db.close();
