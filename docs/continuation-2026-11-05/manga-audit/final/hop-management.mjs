// Own immutable runtime and disposable D1; never writes to a public deployment.
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import net from 'node:net';
const {chromium}=createRequire(import.meta.url)('/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='/Users/nonarkara/Projects/bangkok-ioc/bkk-co/',fixture=await mkdtemp(join(tmpdir(),'plub-hop-browser-')),persist=join(fixture,'state');
for(const file of ['public','src','db','wrangler.toml'])await cp(join(root,file),join(fixture,file),{recursive:true});
for(const file of ['db/schema.sql','db/notebook.sql']){const r=spawnSync('npx',['wrangler','d1','execute','bkk-co','--local','--persist-to',persist,'--file',file],{cwd:fixture,stdio:'ignore'});assert.equal(r.status,0,'Fresh D1 migration')}
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const worker=spawn('npx',['wrangler','dev','--port',String(port),'--local','--persist-to',persist,'--var','IP_SALT:local-browser-salt','--var','MODERATION_KEY:local-browser-moderator'],{cwd:fixture,stdio:'ignore',detached:true});
const base=`http://localhost:${port}`,proof='/tmp/plub-manga-audit-nov5/final/hop-management';await mkdir(proof,{recursive:true});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/account')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base);await p.waitForFunction(()=>state.byId.size>57000);
 const request=async(context,path,method='GET',body,id)=>{const r=await context.request.fetch(base+'/api/'+path,{method,headers:{origin:base,...(id?{'x-plub-account':id}:{})},...(body?{data:body}:{})});const json=await r.json();assert.ok(r.ok(),path+' '+r.status()+' '+JSON.stringify(json));return json};
 const signup=async(name)=>{const context=await browser.newContext();const result=await request(context,'account/create','POST',{name});return{context,id:result.account.id}};
 const made=await request(c,'account/create','POST',{name:'Independent owner'}),owner=made.account.id;
 const photo=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=8;return c.toDataURL('image/jpeg')});
 const hop=crypto.randomUUID(),entry=crypto.randomUUID(),otherHop=crypto.randomUUID();
 await request(c,'hops/'+hop,'PUT',{stops:['h0001'],note:'Hidden own hop, with photo',words:[],photos:[photo]},owner);
 await request(c,'notebook/'+entry,'PUT',{place:'h0001',at:'2026-11-05',stars:0,words:[],note:'Own recommendation with photo',photos:[photo],revision:0},owner);
 await request(c,'notebook/'+entry+'/publish','POST',{confirm:true,photos:true,revision:1},owner);
 const posts=await request(c,'community?place=h0001'),post=posts.posts[0].id;
 const other=await signup('Other author');await request(other.context,'hops/'+otherHop,'PUT',{stops:['h0001'],note:'Other author hop',words:[],photos:[]},other.id);await request(c,'hops/'+otherHop+'/report','POST',{reason:'spam'},owner);
 for(let i=0;i<3;i++){const reporter=await signup('Reporter '+i);await request(reporter.context,'hops/'+hop+'/report','POST',{reason:'privacy'},reporter.id);await request(reporter.context,'community/'+post+'/report','POST',{reason:'privacy'},reporter.id);await reporter.context.close()}
 await p.evaluate(()=>openPassport());await p.locator('.cloud-account').waitFor();await p.locator('.cloud-account').evaluate(e=>e.open=true);
 const exported=p.waitForEvent('download');await p.getByRole('button',{name:'Export cloud data',exact:true}).click();const download=await exported,json=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(json.hops.length,1);assert.equal(json.hops[0].hidden,1);assert.equal(json.hops[0].payload.photos.length,1);assert.equal(json.posts.length,1);assert.equal(json.posts[0].payload.photos.length,1);assert.ok(Array.isArray(json.reports));assert.equal(json.hopReports.length,1);assert.equal(json.hopReports[0].hop_id,otherHop);
 await p.locator('[data-own-hops]').click();await p.getByText('Hidden for review',{exact:true}).waitFor();await p.getByText('Moderation · owner',{exact:true}).click();
 const openQueue=async()=>{await p.getByLabel('Moderator key',{exact:true}).fill('local-browser-moderator');await p.getByRole('button',{name:'Open review queue',exact:true}).click();await p.locator('.moderation-results article').first().waitFor()};await openQueue();await p.screenshot({path:join(proof,'both-hidden-390.png')});assert.equal(await p.locator('.moderation-results [data-restore]').count(),2);
 for(const path of ['community/'+post,'hops/'+hop]){await p.locator(`[data-moderate="${path}"][data-restore]`).click();const feed=await request(c,path.startsWith('community')?'community?place=h0001':'hops');assert.ok((feed.posts||feed.hops).some(x=>x.id===path.split('/')[1]))}
 await openQueue();for(const path of ['community/'+post,'hops/'+hop]){await p.locator(`[data-moderate="${path}"]:not([data-restore])`).click()}
 assert.equal((await request(c,'community?place=h0001')).posts.length,0);assert.ok(!(await request(c,'hops')).hops.some(x=>x.id===hop));assert.deepEqual(errors,[]);
 await writeFile(join(proof,'results.json'),JSON.stringify({actualCloudDownload:true,hiddenHopAndPhotos:true,postAndPhotos:true,reportsArray:true,hopReportsArray:true,ownerHiddenManagement:true,moderatorBothKindsRestoreAndRemove:true,pageErrors:errors},null,2));console.log('PASS actualexportdownload hiddenhop/photo/post/reportarrays andbothkindmoderationrestore/remove.');await other.context.close();await c.close();
}finally{if(browser)await browser.close();try{process.kill(-worker.pid,'SIGTERM')}catch{}}
