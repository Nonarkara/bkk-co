// Real Worker + local D1. Never run writes on the public host.
// The suite is stateful: rate-limit buckets persist in local D1 (caps per IP per hour:
// create 20, publish 20, save 120). A rerun inside the hour fails on 429s — that is the
// limiter working, not a regression. Reset first: stop wrangler dev, `rm -rf .wrangler/state`,
// start `npx wrangler dev --port 4186 --local`, and confirm `curl -s localhost:4186/api/account`
// answers JSON (a cold server can return an empty body on the first hit).
import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';import{readFile}from'node:fs/promises';
const base=process.argv[2]||'http://localhost:4186';if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Local write tests only.');
const data=JSON.parse(await readFile(new URL('../public/data/places-work.json',import.meta.url))),place=data.rows[0][0];let checks=0;const owners=new Map();
const ok=(a,b,msg='API assertion')=>{assert.equal(a,b,msg);checks++};
async function req(path,method='GET',body,cookie='',headers={}){const r=await fetch(base+'/api/'+path,{method,headers:{origin:base,'content-type':'application/json',...(cookie?{cookie,'x-plub-account':owners.get(cookie)||''}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});const d=await r.json(),session=r.headers.get('set-cookie')?.split(';')[0];if(session&&d.account)owners.set(session,d.account.id);return{r,d,cookie:session}}
const photo='data:image/jpeg;base64,'+(await readFile(new URL('fixtures/photo.jpg',import.meta.url))).toString('base64');
const users=[];
try{
 for(let i=0;i<5;i++){const a=await req('account/create','POST',{name:'Test neighbour '+i});ok(a.r.status,200,'create');assert.equal(a.d.recoveryKey.length,43);assert.ok(a.r.headers.get('set-cookie').includes('HttpOnly'));users.push(a)}
 const [a,b,c,d,e]=users,entry=randomUUID(),value={place,at:'2026-11-03',stars:5,note:'A thoughtful visit. Not a verified recommendation.',words:['Focused'],photos:[photo],revision:0};
 ok((await req('notebook')).r.status,401,'auth required');
 ok((await req('notebook/'+entry,'PUT',value,a.cookie,{origin:'https://evil.test'})).r.status,403,'origin boundary');
 ok((await req('notebook/'+entry,'PUT',{...value,photos:['https://evil.test/track']},a.cookie)).r.status,400,'photo URL rejected');
 ok((await req('notebook/'+entry,'PUT',{...value,photos:['data:image/svg+xml;base64,AAA=']},a.cookie)).r.status,400,'SVG rejected');
 ok((await req('notebook/'+entry,'PUT',{...value,note:'x'.repeat(900001)},a.cookie)).r.status,413,'stream limit');
 const saved=await req('notebook/'+entry,'PUT',value,a.cookie);ok(saved.r.status,200);ok(saved.d.revision,1);
 ok((await req('notebook/'+entry,'GET',undefined,b.cookie)).r.status,404,'account isolation');
 ok((await req('notebook','GET',undefined,b.cookie)).d.entries.length,0,'list isolation');
 ok((await req('notebook/'+entry,'PUT',value,b.cookie,{'x-plub-account':a.d.account.id})).r.status,409,'cross-tab account switch rejected');
 const race=await Promise.all([req('notebook/'+entry,'PUT',{...value,revision:1,note:'First concurrent edit'},a.cookie),req('notebook/'+entry,'PUT',{...value,revision:1,note:'Second concurrent edit'},a.cookie)]);
 assert.deepEqual(race.map(r=>r.r.status).sort(),[200,409]);checks++;
 ok((await req('notebook/'+entry,'GET',undefined,a.cookie)).d.revision,2,'one edit won');
 ok((await req('notebook/'+entry,'DELETE',{revision:1},a.cookie)).r.status,409,'stale delete rejected');
 ok((await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:1},a.cookie)).r.status,409,'stale publish rejected');
 ok((await req('community?place='+place)).d.posts.length,0,'private never published');
 const publish=await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:2},a.cookie);ok(publish.r.status,200);
 let posts=(await req('community?place='+place)).d.posts;ok(posts.length,1);ok(posts[0].photos.length,0,'photos omitted without opt-in');
 ok((await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:true,revision:2},a.cookie)).r.status,200);ok((await req('community?place='+place)).d.posts[0].photos.length,1,'explicit photo sharing');
 ok((await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:2},a.cookie)).r.status,200);
 assert.equal(posts[0].at,undefined,'private visit date not published');assert.equal(posts[0].place,undefined);checks++;
 const contributions=(await req('account/contributions','GET',undefined,a.cookie)).d;ok(contributions.posts[0].photoCount,0,'export list has only metadata');ok(contributions.posts[0].payload.photos,undefined,'export list omits photo payload');ok((await req('account/contributions/'+publish.d.id,'GET',undefined,b.cookie)).r.status,404,'export post isolation');ok((await req('account/contributions/'+publish.d.id,'GET',undefined,a.cookie)).r.status,200,'owned export snapshot');
 ok((await req('community/'+publish.d.id,'DELETE',undefined,b.cookie)).r.status,404,'cannot delete others');
 const otherPlace=data.rows[1][0];
 ok((await req('notebook/'+entry,'PUT',{...value,place:otherPlace,revision:2},a.cookie)).r.status,200);
 ok((await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:3},a.cookie)).r.status,200);
 ok((await req('community?place='+place)).d.posts.length,0,'old venue loses corrected post');ok((await req('community?place='+otherPlace)).d.posts.length,1,'corrected venue gains post');
 ok((await req('notebook/'+entry,'PUT',{...value,revision:3},a.cookie)).r.status,200);
 ok((await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:4},a.cookie)).r.status,200);
 for(const user of [b,c,d])ok((await req('community/'+publish.d.id+'/report','POST',{reason:'privacy'},user.cookie)).r.status,200);
 ok((await req('community?place='+place)).d.posts.length,0,'3 distinct reports hide post');
 ok((await req('notebook/'+entry+'/publish','POST',{confirm:true,photos:false,revision:4},a.cookie)).r.status,409,'cannot republish hidden entry');
 ok((await req('moderation')).r.status,403,'moderator key required');
 const moderator={'x-plub-moderator':'local-test-moderation-not-production'};
 const queue=await req('moderation','GET',undefined,'',moderator);ok(queue.r.status,200);assert.ok(queue.d.posts.some(p=>p.id===publish.d.id&&p.reports===3));checks++;
 ok((await req('community/'+publish.d.id,'DELETE',undefined,'',moderator)).r.status,200,'moderator removal');
 ok((await req('account','PATCH',{research:true,notice:'wrong'},a.cookie)).r.status,400);
 for(let i=0;i<users.length;i++){const user=users[i];if(i){ok((await req('notebook/'+randomUUID(),'PUT',value,user.cookie)).r.status,200)}ok((await req('account','PATCH',{research:true,notice:'2026-11-03'},user.cookie)).r.status,200)}
 let research=(await req('research')).d;ok(research.places.find(p=>p.place_id===place).contributors,5,'consenting distinct accounts');
 ok((await req('account','PATCH',{research:false},e.cookie)).r.status,200);ok((await req('research')).d.places.length,0,'withdrawal suppresses small cohort');
 const login=await req('account/login','POST',{key:a.d.recoveryKey});ok(login.r.status,200);ok(login.d.account.id,a.d.account.id,'cross-device login');
 ok((await req('account/logout','POST',{},login.cookie)).r.status,200);ok((await req('notebook','GET',undefined,login.cookie)).r.status,401,'revoked session');
 ok((await req('account/login','POST',{key:'x'.repeat(43)})).r.status,401,'wrong key');
 ok((await req('account','DELETE',undefined,a.cookie)).r.status,200);ok((await req('account/login','POST',{key:a.d.recoveryKey})).r.status,401,'deleted account key invalid');
 console.log(JSON.stringify({checks,accountIsolation:true,revisionRace:true,privateByDefault:true,moderation:true,consentWithdrawal:true,deletion:true}));
}finally{for(const u of users)await req('account','DELETE',undefined,u.cookie)}
