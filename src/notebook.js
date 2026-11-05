// Private notebooks and explicitly shared recommendations. No passive location tracking.
export const NOTICE = '2026-11-03';
import { canon } from './aliases.js';
const enc = new TextEncoder();
const cookieName = 'plub_session';
const response = (body, status=200, headers={}) => new Response(JSON.stringify(body), {status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const fail = (message,status=400) => {throw Object.assign(new Error(message),{status});};
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const uid = id => /^[a-zA-Z0-9_-]{12,64}$/.test(id||'');
const FEELINGS = ['Calm','Focused','Cozy','Buzzing','Social','Inspiring','Slow','Meh'];
const cookie = (value,request,age=2592000) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
export async function readBody(request,max=900000) {
 if((request.headers.get('content-type')||'').split(';')[0]!=='application/json')fail('Send JSON.',415);
 const reader=request.body?.getReader();if(!reader)fail('Missing data.');const chunks=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();fail('Too large. Use fewer or smaller photos.',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail('Invalid JSON.')}
}
// Strip JPEG metadata as well as limiting format/size; SVG/URLs never enter a photo response.
export function cleanPhoto(data) {
 if(typeof data!=='string'||data.length>180000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data))fail('Use a small JPEG photo.');
 let bytes;try{bytes=Uint8Array.from(atob(data.slice(23)),c=>c.charCodeAt(0))}catch{fail('Invalid photo.')}
 if(bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)fail('Invalid JPEG.');
 const parts=[bytes.slice(0,2)];let i=2,frame=false,scan=false,ended=false;
 while(i<bytes.length){
  if(bytes[i]!==255)fail('Invalid JPEG segment.');
  const marker=bytes[i+1];
  if(marker===217){if(i+2!==bytes.length)fail('Unexpected data after photo.');parts.push(bytes.slice(i,i+2));ended=true;break}
  if(marker===216||marker===0||marker===255||(marker>=208&&marker<=215))fail('Invalid JPEG marker.');
  const n=(bytes[i+2]<<8)|bytes[i+3];if(n<2||i+n+2>bytes.length)fail('Invalid JPEG segment.');
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))frame=true;
  if(!(marker>=224&&marker<=239)&&marker!==254)parts.push(bytes.slice(i,i+n+2));
  i+=n+2;
  if(marker===218){scan=true;const start=i;
   while(i<bytes.length){if(bytes[i]!==255){i++;continue}const next=bytes[i+1];if(next===0||(next>=208&&next<=215)){i+=2;continue}if(next===255){i++;continue}break}
   parts.push(bytes.slice(start,i));
  }
 }
 if(!frame||!scan||!ended)fail('Incomplete JPEG.');
 return 'data:image/jpeg;base64,'+btoa(parts.map(p=>Array.from(p,c=>String.fromCharCode(c)).join('')).join(''));
}
export function validateEntry(body,ids) {
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid visit.');
 body.place=canon(body.place); // retired twin ids resolve to their survivor
 if(!ids.has(body.place))fail('This place is not in the current catalogue.');
 if(!Number.isInteger(body.revision)||body.revision<0)fail('Missing cloud version.');
 if(!Number.isInteger(body.stars)||body.stars<0||body.stars>5)fail('Choose zero to five stars.');
 if(typeof body.note!=='string'||body.note.length>600)fail('Notes can be at most 600 characters.');
 if(typeof body.at!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(body.at)||!Number.isFinite(Date.parse(body.at)))fail('Choose a visit date.');
 if(new Date(body.at.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==body.at.slice(0,10))fail('That date does not exist.');
 if(!Array.isArray(body.words)||body.words.length>8||body.words.some(w=>!FEELINGS.includes(w)))fail('Unknown feeling.');
 if(!Array.isArray(body.photos)||body.photos.length>4)fail('Up to four photos.');
 return {place:body.place,at:/^\d{4}-\d{2}-\d{2}$/.test(body.at)?body.at:new Date(Date.parse(body.at)+7*3600000).toISOString().slice(0,10),stars:body.stars,words:[...new Set(body.words)],note:body.note,photos:body.photos.map(cleanPhoto)};
}
// A hop log is a walking route of places. It has no visit date at all, by design.
export function validateHop(body,ids) {
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid hop.');
 if(!Array.isArray(body.stops)||!body.stops.length||body.stops.length>8)fail('A hop needs one to eight stops.');
 const stops=body.stops.map(canon); // retired twin ids resolve to their survivor
 if(new Set(stops).size!==stops.length)fail('Each stop appears once.');
 if(stops.some(s=>!ids.has(s)))fail('This place is not in the current catalogue.');
 const note=body.note??'';
 if(typeof note!=='string'||note.length>600)fail('Notes can be at most 600 characters.');
 if(!Array.isArray(body.words)||body.words.length>8||body.words.some(w=>!FEELINGS.includes(w)))fail('Unknown feeling.');
 if(!Array.isArray(body.photos)||body.photos.length>4)fail('Up to four photos.');
 const photos=body.photos.map(cleanPhoto);
 if(!note.trim()&&!photos.length)fail('Add a note or a photo first.');
 return {stops,note,words:[...new Set(body.words)],photos}; // the caller's order is the walking order
}
async function limit(env,request,scope,max) {
 if(!env.IP_SALT)fail('Cloud notebook is temporarily unavailable.',503);
 const ip=await hash(env.IP_SALT+'|'+(request.headers.get('cf-connecting-ip')||'local'));
 const bucket=Math.floor(Date.now()/3600000);
 const row=await env.DB.prepare(`INSERT INTO notebook_limits(scope,bucket,n) VALUES(?,?,1) ON CONFLICT(scope,bucket) DO UPDATE SET n=n+1 RETURNING n`).bind(scope+':'+ip,bucket).first();
 if(row.n>max)fail('Please try again in an hour.',429);
 await env.DB.prepare('DELETE FROM notebook_limits WHERE bucket<?').bind(bucket-24).run();
}
async function account(request,env,required=true) {
 const key=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!key){if(required)fail('Sign in to your notebook.',401);return null}
 const a=await env.DB.prepare(`SELECT a.* FROM notebook_accounts a JOIN notebook_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires>?`).bind(await hash(key),Date.now()).first();
 if(!a&&required)fail('Your session expired. Sign in again.',401);return a;
}
const profile=a=>({id:a.id,name:a.name,research:!!a.research,notice:NOTICE,createdAt:a.created_at,consentAt:a.consent_at||null,consentVersion:a.consent_version||null});
async function session(a,request,env,extra={}) {
 const t=token();await env.DB.prepare('DELETE FROM notebook_sessions WHERE expires<?').bind(Date.now()).run();
 // A bounded number of sessions; signing in on another device does not erase notes.
 const old=await env.DB.prepare('SELECT COUNT(*) n FROM notebook_sessions WHERE account_id=?').bind(a.id).first();
 if(old.n>=10)await env.DB.prepare('DELETE FROM notebook_sessions WHERE account_id=?').bind(a.id).run();
 await env.DB.prepare('INSERT INTO notebook_sessions VALUES(?,?,?)').bind(await hash(t),a.id,Date.now()+2592000000).run();
 return response({account:profile(a),...extra},200,{'set-cookie':cookie(t,request)});
}
async function moderator(request,env) {
 const candidate=request.headers.get('x-plub-moderator');
 return !!(candidate&&env.MODERATION_KEY&&(await hash(candidate))===(await hash(env.MODERATION_KEY)));
}
export async function notebookApi(request,env,knownIds) {
 const url=new URL(request.url),path=url.pathname,method=request.method;
 try {
  if(method!=='GET'&&method!=='HEAD'&&request.headers.get('origin')!==url.origin)fail('Open PLUB directly to make changes.',403);
  if(!env.DB)fail('Cloud notebook is unavailable.',503);
  if(path==='/api/account'&&method==='GET'){const a=await account(request,env,false);return response({account:a?profile(a):null})}
  if(path==='/api/account/create'&&method==='POST'){
   await limit(env,request,'create',20);const b=await readBody(request,1000);const name=String(b.name||'Neighbour').trim();if(!name||name.length>40)fail('Name:1–40 characters.');
   const recoveryKey=token(),a={id:crypto.randomUUID(),key_hash:await hash(recoveryKey),name,research:0,created_at:new Date().toISOString()};
   await env.DB.prepare('INSERT INTO notebook_accounts(id,key_hash,name,created_at) VALUES(?,?,?,?)').bind(a.id,a.key_hash,name,a.created_at).run();
   return session(a,request,env,{recoveryKey});
  }
  if(path==='/api/account/login'&&method==='POST'){
   await limit(env,request,'login',30);const b=await readBody(request,1000);if(typeof b.key!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(b.key))fail('That notebook key was not recognised.',401);
   const a=await env.DB.prepare('SELECT * FROM notebook_accounts WHERE key_hash=?').bind(await hash(b.key)).first();if(!a)fail('That notebook key was not recognised.',401);return session(a,request,env);
  }
  if(path==='/api/account/logout'&&method==='POST'){
   const raw=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
   if(raw)await env.DB.prepare('DELETE FROM notebook_sessions WHERE token_hash=?').bind(await hash(raw)).run();return response({ok:true},200,{'set-cookie':cookie('',request,0)});
  }
  if(path==='/api/research'&&method==='GET'){
   const {results}=await env.DB.prepare(`SELECT e.place_id,COUNT(DISTINCT e.account_id) contributors,COUNT(*) visits FROM notebook_entries e JOIN notebook_accounts a ON a.id=e.account_id WHERE a.research=1 GROUP BY e.place_id HAVING COUNT(DISTINCT e.account_id)>=5 ORDER BY contributors DESC LIMIT 100`).all();
   return response({source:'Voluntarily contributed saved visits',asOf:new Date().toISOString(),minimumContributors:5,places:results});
  }
  if(path==='/api/moderation'&&method==='GET'){
   if(!await moderator(request,env))fail('Moderator access required.',403);
   const {results}=await env.DB.prepare(`SELECT p.id,p.place_id,p.payload,p.created_at,p.hidden,COUNT(r.account_id) reports,GROUP_CONCAT(DISTINCT r.reason) reasons FROM notebook_posts p LEFT JOIN notebook_reports r ON r.post_id=p.id GROUP BY p.id ORDER BY reports DESC,p.created_at DESC LIMIT 10`).all();
   const {results:hopRows}=await env.DB.prepare(`SELECT h.id,h.payload,h.created_at,h.hidden,COUNT(r.account_id) reports,GROUP_CONCAT(DISTINCT r.reason) reasons FROM notebook_hops h LEFT JOIN notebook_hop_reports r ON r.hop_id=h.id GROUP BY h.id ORDER BY reports DESC,h.created_at DESC LIMIT 10`).all();
   return response({posts:results.map(r=>({...r,payload:JSON.parse(r.payload)})),hops:hopRows.map(r=>({...r,payload:JSON.parse(r.payload)}))});
  }
  if(path==='/api/community'&&method==='GET'){
   const known=await knownIds(),place=canon(url.searchParams.get('place'));if(!known.has(place))fail('Unknown place.');
   const a=await account(request,env,false);
   const {results}=await env.DB.prepare('SELECT id,account_id,payload,created_at FROM notebook_posts WHERE place_id=? AND hidden=0 ORDER BY created_at DESC LIMIT 5').bind(place).all();
   return response({posts:results.map(r=>({id:r.id,...JSON.parse(r.payload),created:r.created_at,mine:r.account_id===a?.id})),limit:5});
  }
  const postMatch=path.match(/^\/api\/community\/([\w-]{12,64})(\/report)?$/);
  const hopMatch=path.match(/^\/api\/hops\/([\w-]{12,64})(\/report)?$/);
  if(path==='/api/hops'&&method==='GET'){
   const a=await account(request,env,false),raw=url.searchParams.get('place');
   let results;
   if(raw===null){({results}=await env.DB.prepare('SELECT id,account_id,payload,created_at FROM notebook_hops WHERE hidden=0 ORDER BY created_at DESC LIMIT 10').all())}
   else{const known=await knownIds(),place=canon(raw);if(!known.has(place))fail('Unknown place.');
    ({results}=await env.DB.prepare("SELECT id,account_id,payload,created_at FROM notebook_hops h WHERE hidden=0 AND EXISTS(SELECT 1 FROM json_each(h.payload,'$.stops') s WHERE s.value=?) ORDER BY created_at DESC LIMIT 10").bind(place).all())}
   // created is the publication time only; the notice says no visit date is published, so the frontend must not render it.
   return response({hops:results.map(r=>({id:r.id,...JSON.parse(r.payload),created:r.created_at,mine:r.account_id===a?.id})),limit:10});
  }
  if(hopMatch&&method==='PATCH'&&!hopMatch[2]&&await moderator(request,env)){
   const b=await readBody(request,1000);if(b.visible!==true)fail('Choose restore visibility.');
   const result=await env.DB.batch([env.DB.prepare('DELETE FROM notebook_hop_reports WHERE hop_id=?').bind(hopMatch[1]),env.DB.prepare('UPDATE notebook_hops SET hidden=0 WHERE id=?').bind(hopMatch[1])]);
   if(!result[1].meta.changes)fail('Hop log not found.',404);return response({ok:true});
  }
  if(hopMatch&&method==='DELETE'&&!hopMatch[2]&&await moderator(request,env)){
   await env.DB.batch([env.DB.prepare('DELETE FROM notebook_hop_reports WHERE hop_id=?').bind(hopMatch[1]),env.DB.prepare('DELETE FROM notebook_hops WHERE id=?').bind(hopMatch[1])]);return response({ok:true});
  }
  if(postMatch&&method==='PATCH'&&!postMatch[2]&&await moderator(request,env)){
   const b=await readBody(request,1000);if(b.visible!==true)fail('Choose restore visibility.');
   const result=await env.DB.batch([env.DB.prepare('DELETE FROM notebook_reports WHERE post_id=?').bind(postMatch[1]),env.DB.prepare('UPDATE notebook_posts SET hidden=0 WHERE id=?').bind(postMatch[1])]);
   if(!result[1].meta.changes)fail('Recommendation not found.',404);return response({ok:true});
  }
  if(postMatch&&method==='DELETE'&&!postMatch[2]&&await moderator(request,env)){
   await env.DB.batch([env.DB.prepare('DELETE FROM notebook_reports WHERE post_id=?').bind(postMatch[1]),env.DB.prepare('DELETE FROM notebook_posts WHERE id=?').bind(postMatch[1])]);return response({ok:true});
  }
  const a=await account(request,env);
  if(request.headers.get('x-plub-account')!==a.id)fail('Account changed. Reopen your notebook before continuing.',409);
  const exportPost=path.match(/^\/api\/account\/contributions\/([\w-]{12,64})$/);
  if(exportPost&&method==='GET'){
   const post=await env.DB.prepare('SELECT id,place_id,payload,created_at,hidden FROM notebook_posts WHERE account_id=? AND id=?').bind(a.id,exportPost[1]).first();
   if(!post)fail('Recommendation not found.',404);return response({...post,payload:JSON.parse(post.payload)});
  }
  const exportHop=path.match(/^\/api\/account\/contributions\/hop\/([\w-]{12,64})$/);
  if(exportHop&&method==='GET'){
   const hop=await env.DB.prepare('SELECT id,payload,created_at,hidden FROM notebook_hops WHERE account_id=? AND id=?').bind(a.id,exportHop[1]).first();
   if(!hop)fail('Hop log not found.',404);return response({...hop,payload:JSON.parse(hop.payload)});
  }
  if(path==='/api/account/contributions'&&method==='GET'){
   const posts=await env.DB.prepare(`SELECT id,place_id,json_remove(payload,'$.photos') payload,created_at,hidden,json_array_length(payload,'$.photos') photoCount FROM notebook_posts WHERE account_id=? LIMIT 100`).bind(a.id).all();
   const hops=await env.DB.prepare(`SELECT id,json_remove(payload,'$.photos') payload,created_at,hidden,json_array_length(payload,'$.photos') photoCount FROM notebook_hops WHERE account_id=? LIMIT 100`).bind(a.id).all();
   const reports=await env.DB.prepare('SELECT post_id,reason,created_at FROM notebook_reports WHERE account_id=? LIMIT 200').bind(a.id).all();
   const hopReports=await env.DB.prepare('SELECT hop_id,reason,created_at FROM notebook_hop_reports WHERE account_id=? LIMIT 200').bind(a.id).all();
   return response({posts:posts.results.map(r=>({...r,payload:JSON.parse(r.payload)})),hops:hops.results.map(r=>({...r,payload:JSON.parse(r.payload)})),reports:reports.results,hopReports:hopReports.results});
  }
  if(path==='/api/account'&&method==='PATCH'){
   const b=await readBody(request,1000);if(typeof b.research!=='boolean'||(b.research&&b.notice!==NOTICE))fail('Read the current research notice first.');
   const name=typeof b.name==='string'?b.name.trim():a.name;if(!name||name.length>40)fail('Name:1–40 characters.');
   await env.DB.prepare('UPDATE notebook_accounts SET name=?,research=?,consent_version=?,consent_at=? WHERE id=?').bind(name,+b.research,NOTICE,new Date().toISOString(),a.id).run();
   return response({account:profile(await env.DB.prepare('SELECT * FROM notebook_accounts WHERE id=?').bind(a.id).first())});
  }
  if(path==='/api/account'&&method==='DELETE'){
   await env.DB.prepare('DELETE FROM notebook_reports WHERE post_id IN (SELECT id FROM notebook_posts WHERE account_id=?)').bind(a.id).run();
   await env.DB.prepare('DELETE FROM notebook_hop_reports WHERE hop_id IN (SELECT id FROM notebook_hops WHERE account_id=?)').bind(a.id).run();
   await env.DB.batch(['notebook_reports','notebook_hop_reports','notebook_posts','notebook_hops','notebook_entries','notebook_sessions','notebook_accounts'].map(t=>env.DB.prepare(`DELETE FROM ${t} WHERE ${t==='notebook_accounts'?'id':'account_id'}=?`).bind(a.id)));
   return response({ok:true,localDataRetained:true,backupNote:'Cloudflare may retain database recovery backups for up to 30 days; live account data is deleted.'},200,{'set-cookie':cookie('',request,0)});
  }
  if(path==='/api/notebook'&&method==='GET'){
   const {results}=await env.DB.prepare(`SELECT id,revision,updated_at,json_remove(payload,'$.photos') payload,json_array_length(payload,'$.photos') photoCount FROM notebook_entries WHERE account_id=? ORDER BY updated_at DESC LIMIT 100`).bind(a.id).all();
   return response({entries:results.map(r=>({...r,payload:JSON.parse(r.payload)})),limit:100});
  }
  const m=path.match(/^\/api\/notebook\/([\w-]{12,64})(\/publish)?$/);
  if(m&&uid(m[1])){
   const id=m[1];
   if(method==='PUT'&&!m[2]){
    await limit(env,request,'save',120);const b=await readBody(request);const entry=validateEntry(b,await knownIds());const payload=JSON.stringify(entry);
    const r=await env.DB.prepare(`INSERT INTO notebook_entries(id,account_id,place_id,payload,revision,updated_at) SELECT ?,?,?,?,1,? WHERE ((?=0 AND (SELECT COUNT(*) FROM notebook_entries WHERE account_id=?)<100) OR EXISTS(SELECT 1 FROM notebook_entries WHERE account_id=? AND id=?)) ON CONFLICT(account_id,id) DO UPDATE SET payload=?,place_id=?,revision=notebook_entries.revision+1,updated_at=? WHERE notebook_entries.revision=? RETURNING revision`).bind(id,a.id,entry.place,payload,new Date().toISOString(),b.revision,a.id,a.id,id,payload,entry.place,new Date().toISOString(),b.revision).first();
    if(!r){const existing=await env.DB.prepare('SELECT revision FROM notebook_entries WHERE account_id=? AND id=?').bind(a.id,id).first();fail(existing?'Cloud copy changed. Restore it before replacing it.':'Your cloud notebook is full (100 visits), or you deleted this copy.',409)}
    return response(r);
   }
   const row=await env.DB.prepare('SELECT * FROM notebook_entries WHERE account_id=? AND id=?').bind(a.id,id).first();if(!row)fail('Visit not found.',404);
   if(method==='GET'&&!m[2])return response({id,revision:row.revision,payload:JSON.parse(row.payload)});
   if(method==='DELETE'&&!m[2]){
    const b=await readBody(request,1000);if(!Number.isInteger(b.revision)||b.revision!==row.revision)fail('Cloud copy changed. Refresh before deleting.',409);
    const guard='EXISTS(SELECT 1 FROM notebook_entries WHERE account_id=? AND id=? AND revision=?)';
    const result=await env.DB.batch([env.DB.prepare(`DELETE FROM notebook_reports WHERE post_id IN (SELECT id FROM notebook_posts WHERE account_id=? AND entry_id=?) AND ${guard}`).bind(a.id,id,a.id,id,b.revision),env.DB.prepare(`DELETE FROM notebook_posts WHERE account_id=? AND entry_id=? AND ${guard}`).bind(a.id,id,a.id,id,b.revision),env.DB.prepare('DELETE FROM notebook_entries WHERE account_id=? AND id=? AND revision=?').bind(a.id,id,b.revision)]);
    if(!result[2].meta.changes)fail('Cloud copy changed. Refresh before deleting.',409);return response({ok:true});
   }
   if(method==='POST'&&m[2]){
    await limit(env,request,'publish',20);const b=await readBody(request,1000);if(b.confirm!==true||typeof b.photos!=='boolean')fail('Choose what to publish.');
    if(!Number.isInteger(b.revision)||b.revision!==row.revision)fail('Cloud copy changed. Preview it again before sharing.',409);
    const v=JSON.parse(row.payload),shared={name:a.name,stars:v.stars,note:v.note,words:v.words,photos:b.photos?v.photos:[]};
    if(!shared.note&&!shared.photos.length&&!shared.stars)fail('Add a note, stars or a photo first.');
    const found=await env.DB.prepare('SELECT id,hidden FROM notebook_posts WHERE account_id=? AND entry_id=?').bind(a.id,id).first();
    if(found?.hidden)fail('This recommendation is under review.',409);
    const postId=found?.id||crypto.randomUUID();
    const result=await env.DB.prepare('INSERT INTO notebook_posts(id,account_id,entry_id,place_id,payload,created_at) SELECT ?,?,?,?,?,? FROM notebook_entries WHERE account_id=? AND id=? AND revision=? ON CONFLICT(account_id,entry_id) DO UPDATE SET payload=excluded.payload,place_id=excluded.place_id WHERE notebook_posts.hidden=0').bind(postId,a.id,id,v.place,JSON.stringify(shared),new Date().toISOString(),a.id,id,b.revision).run();if(!result.meta.changes)fail('Cloud copy changed or this post is under review.',409);return response({id:postId});
   }
  }
  if(postMatch){const id=postMatch[1];
   if(method==='POST'&&postMatch[2]){await limit(env,request,'report',20);const b=await readBody(request,1000);if(!['rude','privacy','spam','other'].includes(b.reason))fail('Choose a report reason.');
    const post=await env.DB.prepare('SELECT id FROM notebook_posts WHERE id=?').bind(id).first();if(!post)fail('Recommendation not found.',404);
    const savedReport=await env.DB.prepare('INSERT OR REPLACE INTO notebook_reports SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM notebook_reports WHERE account_id=?)<200 OR EXISTS(SELECT 1 FROM notebook_reports WHERE post_id=? AND account_id=?)').bind(id,a.id,b.reason,new Date().toISOString(),a.id,id,a.id).run();if(!savedReport.meta.changes)fail('Report limit reached. Contact the operator for further reports.',429);
    await env.DB.prepare('UPDATE notebook_posts SET hidden=1 WHERE id=? AND (SELECT COUNT(*) FROM notebook_reports WHERE post_id=?)>=3').bind(id,id).run();return response({ok:true});}
   if(method==='DELETE'&&!postMatch[2]){const r=await env.DB.prepare('DELETE FROM notebook_posts WHERE id=? AND account_id=?').bind(id,a.id).run();if(!r.meta.changes)fail('Recommendation not found.',404);await env.DB.prepare('DELETE FROM notebook_reports WHERE post_id=?').bind(id).run();return response({ok:true});}
  }
  if(hopMatch){const id=hopMatch[1];
   if(method==='PUT'&&!hopMatch[2]){
    await limit(env,request,'hop',60);const b=await readBody(request);const hop=validateHop(b,await knownIds());
    const payload=JSON.stringify({name:a.name,...hop});
    const r=await env.DB.prepare('INSERT INTO notebook_hops(id,account_id,payload,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM notebook_hops WHERE account_id=?)<100 OR EXISTS(SELECT 1 FROM notebook_hops WHERE id=? AND account_id=?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE notebook_hops.account_id=? AND notebook_hops.hidden=0 RETURNING id').bind(id,a.id,payload,new Date().toISOString(),a.id,id,a.id,a.id).first();
    if(!r){const existing=await env.DB.prepare('SELECT account_id,hidden FROM notebook_hops WHERE id=?').bind(id).first();fail(existing?(existing.hidden?'This hop log is under review.':'That hop log belongs to someone else.'):'Your cloud notebook is full (100 hop logs). Remove a hop log before publishing another.',409)}
    return response({id});
   }
   if(method==='POST'&&hopMatch[2]){await limit(env,request,'report',20);const b=await readBody(request,1000);if(!['rude','privacy','spam','other'].includes(b.reason))fail('Choose a report reason.');
    const hop=await env.DB.prepare('SELECT id FROM notebook_hops WHERE id=?').bind(id).first();if(!hop)fail('Hop log not found.',404);
    const savedReport=await env.DB.prepare('INSERT OR REPLACE INTO notebook_hop_reports SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM notebook_hop_reports WHERE account_id=?)<200 OR EXISTS(SELECT 1 FROM notebook_hop_reports WHERE hop_id=? AND account_id=?)').bind(id,a.id,b.reason,new Date().toISOString(),a.id,id,a.id).run();if(!savedReport.meta.changes)fail('Report limit reached. Contact the operator for further reports.',429);
    await env.DB.prepare('UPDATE notebook_hops SET hidden=1 WHERE id=? AND (SELECT COUNT(*) FROM notebook_hop_reports WHERE hop_id=?)>=3').bind(id,id).run();return response({ok:true});}
   if(method==='DELETE'&&!hopMatch[2]){const r=await env.DB.prepare('DELETE FROM notebook_hops WHERE id=? AND account_id=?').bind(id,a.id).run();if(!r.meta.changes)fail('Hop log not found.',404);await env.DB.prepare('DELETE FROM notebook_hop_reports WHERE hop_id=?').bind(id).run();return response({ok:true});}
  }
  return response({error:'Not found.'},404);
 }catch(e){if(e.status)return response({error:e.message},e.status,e.catalogue?{'retry-after':'5'}:{});console.error('Notebook request failed',e.name);return response({error:'Cloud notebook is unavailable. Your device copy is unchanged.'},503)}
}
