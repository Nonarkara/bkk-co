// Each run owns a fresh disposable local D1. Never deletes another agent's state.
import{mkdtemp,cp}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{spawn,spawnSync}from'node:child_process';import net from'node:net';
const root=new URL('../',import.meta.url).pathname,persist=await mkdtemp(join(tmpdir(),'plub-api-'));
// Snapshot runtime inputs too: another agent or a browser fixture must not restart this Worker mid-POST.
const fixture=await mkdtemp(join(tmpdir(),'plub-api-source-'));
for(const path of ['public','src','db','wrangler.toml'])await cp(join(root,path),join(fixture,path),{recursive:true});
const args=['--local','--persist-to',persist];
for(const file of['db/schema.sql','db/notebook.sql']){
 const r=spawnSync('npx',['wrangler','d1','execute','bkk-co',...args,'--file',file],{cwd:fixture,stdio:'inherit'});if(r.status)process.exit(r.status||1);
}
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const worker=spawn('npx',['wrangler','dev','--port',String(port),...args,'--var','MODERATION_KEY:local-test-moderation-not-production','--var','IP_SALT:disposable-local-test-salt'],{cwd:fixture,stdio:'ignore',detached:true});
try{
 const base=`http://localhost:${port}`;let ready=false;
 for(let i=0;i<100;i++){
  try{const r=await fetch(base+'/api/account',{signal:AbortSignal.timeout(1000)});await r.json();if(r.ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 if(!ready)throw new Error('Isolated Worker did not start.');
 const code=await new Promise(r=>{const test=spawn(process.execPath,['test/notebook-api.mjs',base],{cwd:root,stdio:'inherit'});test.on('exit',r)});if(code)process.exitCode=code||1;
 console.log('Disposable test state retained at '+persist+'; immutable source at '+fixture);
}finally{try{process.kill(-worker.pid,'SIGTERM')}catch{}}
