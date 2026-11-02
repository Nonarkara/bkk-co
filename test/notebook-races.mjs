// SQLite/D1-compatible SQL plus held-auth requests exercise deletion races deterministically.
import {DatabaseSync} from 'node:sqlite';import{readFile}from'node:fs/promises';import assert from'node:assert/strict';
import worker from '../src/worker.js';
import {notebookApi,validateEntry,cleanPhoto}from'../src/notebook.js';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(await readFile(new URL('../db/notebook.sql',import.meta.url),'utf8'));
let hold=false,resume,reached;const pause=new Promise(r=>reached=r);
const binding={prepare(sql){let values=[];const s={bind(...v){values=v;return s},async first(){const row=db.prepare(sql).get(...values)||null;if(hold&&sql.includes('JOIN notebook_sessions')){hold=false;reached();await new Promise(r=>resume=r)}return row},async all(){return{results:db.prepare(sql).all(...values)}},async run(){const r=db.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}}}};return s},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
const env={DB:binding,IP_SALT:'local-unit-test-salt'},base='https://local.test';
const request=(path,method='GET',body,headers={})=>notebookApi(new Request(base+'/api/'+path,{method,headers:{origin:base,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),env,async()=>new Set(['h0001']));
const created=await request('account/create','POST',{name:'Race test'}),cookie=created.headers.get('set-cookie').split(';')[0],account=await created.json();const headers={cookie,'x-plub-account':account.account.id};
const entry={place:'h0001',at:'2026-11-03',stars:4,note:'Private',words:[],photos:[],revision:0};
hold=true;const pending=request('notebook/123456789012','PUT',entry,headers);await pause;
assert.equal((await request('account','DELETE',undefined,headers)).status,200);resume();assert.equal((await pending).status,503,'held write fails closed after account deletion');
assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_entries').get().n,0,'no orphan private entry');assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_posts').get().n,0,'no orphan public post');
assert.throws(()=>validateEntry({...entry,at:'2026-02-31'},new Set(['h0001'])),/does not exist/);
assert.equal(validateEntry({...entry,at:'2026-11-02T20:30:00Z'},new Set(['h0001'])).at,'2026-11-03');
assert.equal(validateEntry(entry,new Set(['h0001'])).at,'2026-11-03');
const jpeg=await readFile(new URL('fixtures/photo.jpg',import.meta.url));const metadata=Buffer.from('Exif\0\0GPSSECRET');const segment=Buffer.concat([Buffer.from([255,225,0,metadata.length+2]),metadata]);const before=Buffer.concat([jpeg.subarray(0,2),segment,jpeg.subarray(2)]),after=Buffer.concat([jpeg.subarray(0,-2),segment,jpeg.subarray(-2)]);
for(const image of[before,after]){const cleaned=cleanPhoto('data:image/jpeg;base64,'+image.toString('base64'));assert.equal(Buffer.from(cleaned.slice(23),'base64').includes(Buffer.from('GPSSECRET')),false,'metadata removed before and after scans')}
assert.throws(()=>cleanPhoto('data:image/svg+xml;base64,AA=='));
assert.throws(()=>cleanPhoto('data:image/jpeg;base64,'+Buffer.concat([jpeg,metadata]).toString('base64')));
const cleanupAccount=await(await request('account/create','POST',{name:'Cleanup test'})).json();db.prepare('INSERT INTO notebook_sessions VALUES(?,?,?)').run('expired-test-hash',cleanupAccount.account.id,0);db.prepare('INSERT INTO notebook_limits VALUES(?,?,?)').run('old-test-scope',0,1);await worker.scheduled({},env);assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_sessions WHERE expires=0').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM notebook_limits WHERE bucket=0').get().n,0);
for(let i=0;i<18;i++)assert.equal((await request('account/create','POST',{name:'Shared Wi-Fi neighbour'})).status,200);assert.equal((await request('account/create','POST',{name:'Over the hourly cap'})).status,429);
console.log('Shared Wi-Fi account allowance/rate cap, daily privacy cleanup, held-auth account deletion, foreign-key containment, impossible dates, Bangkok legacy date, JPEG metadata before/after scans, format/trailing-data rejection pass.');db.close();
